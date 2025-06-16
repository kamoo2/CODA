import React, { useEffect, useState } from 'react';
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import styles from './index.module.scss';

interface Props {
  columns: ColumnDef<any>[];
  data: any;
}

export default function TableComponent(props: Props) {
  // columns filter 저장
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [selectedColumn, setSelectedColumn] = useState<string | null>(null);
  const [filterValue, setFilterValue] = useState<string>('');
  const [pageSizeAll, setPageSizeAll] = useState(false); // "All" 선택 여부

  // table 설정
  const table = useReactTable({
    data: props.data,
    columns: props.columns,
    filterFns: {},
    state: {
      columnFilters,
    },
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(), //client side filtering
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    debugTable: true,
    debugHeaders: true,
    debugColumns: false,
  });

  // 전체 보기 시, 테이블의 동적 행 개수 변환에 반응형으로 대응하기 위한 effect
  useEffect(() => {
    if (pageSizeAll) {
      const totalRows = table.getCoreRowModel().rows.length;
      table.setPageSize(totalRows);
    }
    table.getHeaderGroups().flatMap((headerGroup) =>
      headerGroup.headers
        .filter((header) => header.column.getCanFilter())
        .map((header) => (
          <option key={header.id} value={header.column.id}>
            {typeof header.column.columnDef.header === 'function'
              ? header.column.columnDef.header(header.getContext()) // 올바른 `HeaderContext` 전달
              : header.column.columnDef.header}
          </option>
        )),
    );
  }, [table.getCoreRowModel().rows.length, pageSizeAll]);

  // 필터 변경 핸들러
  const handleFilterChange = (value: string) => {
    setFilterValue(value);
    if (selectedColumn) {
      table.getColumn(selectedColumn)?.setFilterValue(value);
    }
  };

  return (
    <div className={styles.tableContainer}>
      <table className={styles.table}>
        <thead className={styles.tableThead}>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr className={styles.tableRow} key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                return (
                  <th className={styles.tableHeader} key={header.id} colSpan={header.colSpan}>
                    {header.isPlaceholder ? null : (
                      <>
                        <div
                          {...{
                            onClick: header.column.getToggleSortingHandler(),
                          }}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {{
                            asc: ' 🔼',
                            desc: ' 🔽',
                          }[header.column.getIsSorted() as string] ?? null}
                        </div>
                      </>
                    )}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => {
            return (
              <tr className={styles.tableRow} key={row.id}>
                {row.getVisibleCells().map((cell) => {
                  return (
                    <td className={styles.tableData} key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  );
                })}
              </tr>
            );
          })}
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
            {['All', 1, 5, 10, 20, 30, 40, 50].map((pageSize) => (
              <option key={pageSize} value={pageSize}>
                Show {pageSize}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
