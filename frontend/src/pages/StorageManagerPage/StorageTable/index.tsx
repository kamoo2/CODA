import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  ColumnDef,
  flexRender,
  getPaginationRowModel,
  ColumnFiltersState,
  SortingState,
} from '@tanstack/react-table';

import { FaSortDown, FaSortUp } from 'react-icons/fa';
import styles from './index.module.scss';
import StorageBreadCrumb from '@/pages/StorageManagerPage/StorageBreadCrumb';
import { storageService } from '@/apis/services/storageService';
import { useStorageStore, useStorageFilterStore } from '@/store/storageStore';
import systemService from '@/apis/services/systemService';
import { FileExtensionDto, ParserDto } from '@/types/system';

interface Props {
  bucketName: string;
  prefixStr: string;
  onChangePrefix?: (newPrefix: string) => void;
}

const StorageTable = ({ bucketName, prefixStr, onChangePrefix }: Props) => {
  const [files, setFiles] = useState<any[]>([]);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [rowSelection, setRowSelection] = useState({});
  const parserIdToNameMap = useRef<Record<string, string>>({});
  const [parserOptions, setParserOptions] = useState<ParserDto[]>([]);
  const { filterMode, setFilterMode } = useStorageFilterStore();

  const [selectedColumn, setSelectedColumn] = useState<string | null>(null);
  const [filterValue, setFilterValue] = useState<string>('');
  const [pageSizeAll, setPageSizeAll] = useState(false); // "All" 선택 여부

  useEffect(() => {
    setFilterMode('all');
    const fetchParsers = async () => {
      try {
        const res = await systemService.getSupportedParsers();
        if (res.success) {
          setParserOptions(res.result);
        }
      } catch (err) {
        console.error('파서 목록 가져오기 실패', err);
      }
    };

    fetchParsers();
  }, []);

  useEffect(() => {
    if (!bucketName) return;

    const fetchFiles = async () => {
      const res = await storageService.getBucketAllFiles({ bucketName, prefix: prefixStr });
      if (!res.success) return;

      const filesData = (res.result as any).files ?? {};
      let targetData = filesData;
      if (prefixStr) {
        const key = prefixStr.endsWith('/') ? prefixStr.slice(0, -1) : prefixStr;
        const parts = key.split('/');

        for (const part of parts) {
          if (targetData[part]) {
            targetData = targetData[part];
          } else {
            targetData = {};
            break;
          }
        }
      }

      const extracted = extractFilesByDepth(targetData);
      const s3Paths = extracted.map((f) => f.filePath).filter((p) => !!p);

      const uploadedMap = await storageService.checkUploadedBatch(s3Paths);
      const uploadedListRes = await storageService.getUploadFiles();
      const uploadedList = uploadedListRes.result ?? [];

      //  1. uploadedMap 확장: filePath (s3Url) 기준으로 전체 정보 매핑
      const uploadedFileMap = new Map<string, (typeof uploadedList)[0]>();

      uploadedList.forEach((file) => {
        if (file.s3Url) {
          uploadedFileMap.set(file.s3Url, file);
          parserIdToNameMap.current[file.name] = file.parserName ?? '';
          uploadedFileMap.set(file.dbcFileId ?? '', file); // DBC 파일 ID도 매핑
        }
      });

      //  2. markUploadedStatus에서 parserName 외 필드들도 반영
      const enrichedFiles = extracted.map((file) => {
        const matched = uploadedFileMap.get(file.filePath ?? '');

        return {
          ...file,
          isUploaded: !!uploadedMap[file.filePath],
          parserName: matched?.parserName ?? '',
          parserId: matched?.parserId ?? '',
          dbcFileId: matched?.dbcFileId ?? null,
          fileId: matched?.id ?? file.filePath ?? '', // 이게 UploadModal에서 필요한 ID
        };
      });

      //  3. 상태 반영
      setFiles(enrichedFiles);
      setRowSelection({});
      setRowSelection((prevSelection) => {
        if (enrichedFiles.length !== files.length) {
          return {};
        }

        return prevSelection;
      });
    };

    setRowSelection({});
    fetchFiles();
  }, [bucketName, prefixStr]);

  useEffect(() => {
    const selected = table.getSelectedRowModel().rows.map((row) => row.original);

    // ensureTrailingSlash 함수 추가
    const ensureTrailingSlash = (str: string) => (str.endsWith('/') ? str : str + '/');

    const updateSelectedFiles = async () => {
      const allFiles: any[] = [];

      for (const item of selected) {
        if (item.Type === 'Folder') {
          // prefixStr에 ensureTrailingSlash 적용
          const prefix = ensureTrailingSlash(prefixStr) + item.title + '/';
          const cleanPrefixStr = prefix.startsWith('/') ? prefix.slice(1) : prefix;
          console.log('Fetching files under folder:', cleanPrefixStr);
          const res = await storageService.getFilesUnderFolder(bucketName, cleanPrefixStr);
          if (res.success) {
            allFiles.push(...res.result);
          }
        } else {
          console.log(item);
          allFiles.push(item);
        }
      }

      const unique = Array.from(new Map(allFiles.map((f) => [f.filePath, f])).values());

      useStorageStore.getState().setSelectedFiles(
        unique.map((f) => ({
          title: f.title,
          fileId: f.id,
          path: f.filePath,
          parserId: f.parserId ?? '',
          parserName: f.parserName ?? '',
          dbcFileId: f.dbcFileId ?? null,
          dbcFileName: f.dbcFileName ?? '',
        })),
      );
    };

    updateSelectedFiles();
  }, [rowSelection]);

  const filteredFiles = useMemo(() => {
    return files.filter((file) => {
      if (filterMode === 'uploaded') {
        return file.isUploaded === true;
      }
      return true;
    });
  }, [files, filterMode]);

  const columns: ColumnDef<any>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <input
          type="checkbox"
          checked={table.getIsAllPageRowsSelected()}
          onChange={table.getToggleAllPageRowsSelectedHandler()}
          onClick={(e) => e.stopPropagation()}
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={row.getIsSelected()}
          disabled={!row.getCanSelect()}
          onChange={row.getToggleSelectedHandler()}
          onClick={(e) => e.stopPropagation()}
        />
      ),
    },
    { header: '이름', accessorKey: 'title', cell: (info) => info.getValue() },
    { header: 'Type', accessorKey: 'Type', cell: (info) => info.getValue() },
    { header: '소유자', accessorKey: 'owner', cell: (info) => info.getValue() },
    { header: '파일 크기', accessorKey: 'fileSize', cell: (info) => info.getValue() },
    { header: '수정 날짜', accessorKey: 'lastModified', cell: (info) => info.getValue() },
    {
      header: '업로드 여부',
      accessorKey: 'isUploaded',
      cell: ({ row }) => {
        const { isUploaded, Type } = row.original;

        if (Type === 'Folder') return '-'; //

        return isUploaded ? '🟢' : '❌';
      },
    },
  ];

  const table = useReactTable({
    data: filteredFiles,
    columns,
    state: {
      sorting,
      globalFilter,
      rowSelection,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: 'includesString',
    enableRowSelection: true,
  });
  const clickLock = useRef(false);

  const onRowClick = async (record: any) => {
    if (clickLock.current) return;
    clickLock.current = true;
    try {
      const row = table.getRowModel().rows.find((r) => r.original === record);
      if (!row || !row.id) return;

      if (record.Type === 'Folder') {
        setRowSelection({});
        const ensureTrailingSlash = (str: string) => (str.endsWith('/') ? str : str + '/');
        const newPrefix = record.filePath ?? ensureTrailingSlash(prefixStr) + record.title + '/';
        const cleanPrefix = newPrefix.replace(/^\/(.*)/, '$1');
        onChangePrefix?.(cleanPrefix);
      } else {
        setRowSelection((prev: Record<string, boolean>) => {
          const updated = { ...prev };
          if (updated[row.id]) {
            delete updated[row.id];
          } else {
            updated[row.id] = true;
          }
          return updated;
        });
      }
    } finally {
      setTimeout(() => {
        clickLock.current = false;
      }, 300);
    }
  };

  const handleFilterChange = (value: string) => {
    setFilterValue(value);
    if (selectedColumn) {
      table.getColumn(selectedColumn)?.setFilterValue(value);
    }
  };
  return (
    <div className={styles.tableContainer}>
      <StorageBreadCrumb prefixStr={prefixStr} onNavigate={onChangePrefix ?? (() => {})} />
      <div className={styles.filterOptions}>
        <div>
          {' '}
          <span
            className={`${styles.filterOption} ${filterMode === 'all' ? styles.active : ''}`}
            onClick={() => setFilterMode('all')}
          >
            전체보기
          </span>
          <span className={styles.separator}>|</span>
          <span
            className={`${styles.filterOption} ${filterMode === 'uploaded' ? styles.active : ''}`}
            onClick={() => setFilterMode('uploaded')}
          >
            업로드 데이터 보기
          </span>
        </div>

        <input
          className={styles.searchInput}
          placeholder="검색어 입력"
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
        />
      </div>

      <table className={styles.customTable}>
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th key={header.id} onClick={header.column.getToggleSortingHandler()} style={{ cursor: 'pointer' }}>
                  <div
                    className={`
                      ${styles.headerText}
                      ${header.column.id === 'title' ? styles.leftAlign : ''}
                    `}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {header.column.getIsSorted() === 'asc' && <FaSortUp size={14} />}
                    {header.column.getIsSorted() === 'desc' && <FaSortDown size={14} />}
                  </div>
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.length > 0 ? (
            table.getRowModel().rows.map((row) => (
              <tr key={row.id} onClick={() => onRowClick(row.original)}>
                {row.getVisibleCells().map((cell) => {
                  const isTitle = cell.column.id === 'title';
                  const type = row.original.Type;
                  const icon = type === 'Folder' ? '📁' : '📄';

                  return (
                    <td
                      key={cell.id}
                      className={isTitle ? styles.ellipsisCell : ''}
                      title={String(cell.getValue() ?? '')}
                    >
                      {isTitle && <span className={styles.iconWrapper}>{icon}</span>}
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  );
                })}
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan={columns.length}
                className={styles.ellipsisCell}
                style={{ textAlign: 'center', padding: '20px' }}
              >
                ...
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {/*페이지 컨트롤러*/}
      <div className={styles.tableControllerContainer} data-pdf-exclude="true">
        {/* 필터 UI */}
        <div className={styles.filterContainer}>
          <select
            value={selectedColumn ?? ''}
            onChange={(e) => {
              // 필터 검색 텍스트 제거
              setFilterValue('');
              // 모든 column filter 해제
              table.getAllColumns().map((column) => {
                column.setFilterValue('');
              });
              // selected column 설정
              const columnId = e.target.value;
              setSelectedColumn(columnId);
            }}
          >
            <option value="">검색할 열 선택</option>
            {table.getHeaderGroups().flatMap((headerGroup) =>
              headerGroup.headers
                .filter((header) => header.column.getCanFilter())
                .map((header) => (
                  <option key={header.id} value={header.column.id}>
                    {typeof header.column.columnDef.header === 'function'
                      ? header.column.columnDef.header(header.getContext()) // 올바른 `HeaderContext` 전달
                      : header.column.columnDef.header}
                  </option>
                )),
            )}
          </select>

          <input
            className={styles.filterInput}
            type="text"
            placeholder="검색어 입력..."
            value={filterValue}
            onChange={(e) => handleFilterChange(e.target.value)}
            disabled={!selectedColumn}
          />
        </div>

        <div className={styles.tablePageControllercontainer}>
          <div>
            <button
              className={styles.button}
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              {'<<'}
            </button>
            <button
              className={styles.button}
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              {'<'}
            </button>
            <button className={styles.button} onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
              {'>'}
            </button>
            <button
              className={styles.button}
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              {'>>'}
            </button>
          </div>

          <div>
            Page
            <strong>
              {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
            </strong>
            {' | Go to page: '}
            <input
              type="number"
              min="1"
              max={table.getPageCount()}
              defaultValue={table.getState().pagination.pageIndex + 1}
              onChange={(e) => {
                const page = e.target.value ? Number(e.target.value) - 1 : 0;
                table.setPageIndex(page);
              }}
            />
          </div>

          <select
            value={pageSizeAll ? 'All' : table.getState().pagination.pageSize}
            onChange={(e) => {
              if (e.target.value === 'All') {
                setPageSizeAll(true); // All 모드로 전환
                const totalRows = table.getCoreRowModel().rows.length;
                table.setPageSize(totalRows);
              } else {
                setPageSizeAll(false); // 일반 모드
                table.setPageSize(Number(e.target.value));
              }
            }}
          >
            {['All', 10, 20, 30, 40, 50].map((pageSize) => (
              <option key={pageSize} value={pageSize}>
                Show {pageSize}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

const extractFilesByDepth = (project: any) => {
  if (!project) return [];

  return Object.entries(project)
    .filter(([key, value]: any) => {
      const isFileLike = value?.filePath && typeof value?.filePath === 'string';
      const isActuallyFolder =
        !value?.type && typeof value === 'object' && Object.values(value).some((v) => typeof v === 'object');
      return isFileLike || isActuallyFolder || value?.type === 'File';
    })
    .map(([key, value]: any) => ({
      title: key,
      Type: value?.type || 'Folder',
      owner: value?.owner || '-',
      lastModified: value?.lastModified || '-',
      fileSize: value?.fileSize ? `${value.fileSize} KB` : '-',
      filePath: value?.filePath || null,
    }));
};

export default StorageTable;
