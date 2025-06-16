import React, { useState, useEffect } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { toast } from 'react-toastify';
import { MdDelete } from 'react-icons/md';
import styles from './index.module.scss';
import TableComponent from '@/components/common/Table';
import { dbcService } from '@/apis/services/dbcFileService';
import { storageService } from '@/apis/services/storageService';
import { SelectedFileWithParserAndDbc } from '@/types/storage';
import authService from '@/apis/services/authService';
const UploadDBCFiles = () => {
  const [dbcList, setDbcList] = useState<{ id: string; name: string }[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [localSelectedFiles, setLocalSelectedFiles] = useState<SelectedFileWithParserAndDbc[]>([]);

  useEffect(() => {
    fetchDbcFiles();
  }, []);

  const fetchDbcFiles = async () => {
    try {
      const list = await dbcService.loadDbcFilesInDatabase();
      const converted = list.map((item) => ({
        ...item,
        name: item.name,
        createdAt: item.createdAt,
      }));
      setDbcList(converted);
    } catch (err) {
      console.error('DBC 파일 목록 조회 실패:', err);
    }
  };
  const handleBulkDelete = async () => {
    const fileIdsToDelete = Array.from(selectedIds); // Set → Array
    if (fileIdsToDelete.length === 0) {
      alert('선택된 파일이 없습니다.');
      return;
    }

    const confirm = window.confirm(`${fileIdsToDelete.length}개 DBC 파일을 삭제하시겠습니까?`);
    if (!confirm) return;

    try {
      const res = await authService.getUserDetails();
      await dbcService.deleteDbcFiles(fileIdsToDelete, res.result.name);
      // 삭제 후 로컬 상태에서 제거
      setDbcList((prev) => prev.filter((f) => !selectedIds.has(f.id)));
      setSelectedIds(new Set());
      toast.success('선택한 DBC 파일을 삭제했습니다.');
      fetchDbcFiles();
    } catch (err: any) {
      toast.error(err.message ?? '삭제에 실패했습니다.');
    }
  };

  const handleSingleDBCDelete = async (fileId: string, fileName: string) => {
    const confirm = window.confirm(`'${fileName}' DBC 파일을 삭제하시겠습니까?`);
    if (!confirm) return;

    try {
      const res = await authService.getUserDetails();
      await dbcService.deleteDbcFiles([fileId], res.result.name);

      setLocalSelectedFiles((prev) => prev.filter((f) => f.fileId !== fileId));
      setSelectedIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(fileId);
        return newSet;
      });

      fetchDbcFiles();
      toast.success(`'${fileName}' DBC 파일이 삭제되었습니다.`);
    } catch (err: any) {
      console.error('삭제 실패:', err);
      toast.error(err.message ?? '삭제에 실패했습니다.');
    }
  };

  const dbc_columns: ColumnDef<any>[] = [
    {
      id: 'select',
      header: () => (
        <input
          type="checkbox"
          checked={selectedIds.size > 0 && selectedIds.size === dbcList.length}
          onChange={(e) => {
            const newSet = new Set<string>();
            if (e.target.checked) {
              dbcList.forEach((file) => newSet.add(file.id));
            }
            setSelectedIds(newSet);
          }}
        />
      ),
      cell: ({ row }) => {
        const fileId = row.original.id;
        const checked = selectedIds.has(fileId);

        return (
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => {
              const newSet = new Set(selectedIds);
              if (e.target.checked) {
                newSet.add(fileId);
              } else {
                newSet.delete(fileId);
              }
              setSelectedIds(newSet);
            }}
          />
        );
      },
    },
    {
      header: 'Name',
      accessorKey: 'name',
      cell: ({ row }) => {
        const fileId = row.original.id;
        const checked = selectedIds.has(fileId);
        return (
          <div
            onClick={() => {
              setSelectedIds((prev) => {
                const newSet = new Set(prev);
                if (newSet.has(fileId)) {
                  newSet.delete(fileId);
                } else {
                  newSet.add(fileId);
                }
                return newSet;
              });
            }}
            style={{ cursor: 'pointer' }}
          >
            {row.original.name}
          </div>
        );
      },
    },
    {
      header: 'Created At',
      accessorKey: 'createdAt',
      cell: ({ row }) => {
        const fileId = row.original.id;
        return (
          <div
            onClick={() => {
              setSelectedIds((prev) => {
                const newSet = new Set(prev);
                if (newSet.has(fileId)) {
                  newSet.delete(fileId);
                } else {
                  newSet.add(fileId);
                }
                return newSet;
              });
            }}
            style={{ cursor: 'pointer' }}
          >
            {row.original.createdAt}
          </div>
        );
      },
    },
    {
      id: 'menu',
      header: '',
      cell: ({ row }) => (
        <div className={styles.menuContainer}>
          <MdDelete
            className={styles.deleteIcon}
            onClick={() => handleSingleDBCDelete(row.original.id, row.original.name)}
          />
        </div>
      ),
    },
  ];

  const extractDbcFileName = (path: string): string => {
    const segments = path.split('/');
    return segments[segments.length - 1];
  };

  return (
    <div className={styles.dbcContainer}>
      <div className={styles.header}>
        <button onClick={handleBulkDelete}>삭제</button>
      </div>

      <TableComponent columns={dbc_columns} data={dbcList} />
    </div>
  );
};

export default UploadDBCFiles;
