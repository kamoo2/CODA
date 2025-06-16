import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MdDelete } from 'react-icons/md';
import { ColumnDef } from '@tanstack/react-table';
import StorageTable from '../StorageTable';
import CommonApplyModal from '../../../components/pages/UploadDataPage/CommonApplyModal';
import styles from './index.module.scss';
import TableComponent from '@/components/common/Table';
import { Bucket } from '@/types/storage';
import { storageService } from '@/apis/services/storageService';
import { useStorageStore, useParserStore } from '@/store/storageStore';
import ModalFrame from '@/components/common/Modal/ModalFrame';
import InfoTooltip from '@/components/common/InfoTooltip';
import authService from '@/apis/services/authService';
import { dbcService } from '@/apis/services/dbcFileService';

interface UploadModalProps {
  title: string;
  onOk: (selectedBucketName: string) => void;
  onCancel: () => void;
  bucketName: string;
}

import { SelectedFileWithParserAndDbc } from '@/types/storage';

interface CommonApplyModalProps {
  visible: boolean;
  extension: string;
  onClose: () => void;
  onConfirm: (parserName: string, dontAskAgain: boolean) => void;
}

const UploadModal = ({ title, onOk, onCancel, bucketName }: UploadModalProps) => {
  const [files, setFiles] = useState<any[]>([]);
  const selectedFiles = useStorageStore((state) => state.selectedFiles);
  const [localSelectedFiles, setLocalSelectedFiles] = useState<SelectedFileWithParserAndDbc[]>([]);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkTargetExtension, setBulkTargetExtension] = useState<string | null>(null);
  const { parsers, fetchParsers } = useParserStore();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const { bucketId, fetchBucketDetails } = useStorageStore();
  const [dbcList, setDbcList] = useState<{ id: string; name: string }[]>([]);
  const [pageIndex, setPageIndex] = useState(0); // 페이지 인덱스 상태 추가

  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  useEffect(() => {
    const fetchDetails = async () => {
      if (!bucketId) return;
      try {
        const details = await fetchBucketDetails(bucketId);
      } catch (error) {
        console.error('버킷 디테일 로드 중 에러:', error);
      }
    };
    fetchDetails();
    fetchParsers();
  }, [bucketId, fetchBucketDetails]);

  useEffect(() => {
    const fetchDbcFiles = async () => {
      try {
        const list = await dbcService.loadDbcFilesInDatabase();
        const converted = list.map((item) => ({
          ...item,
          name: item.name,
        }));
        setDbcList(converted);
      } catch (err) {
        console.error('DBC 파일 목록 조회 실패:', err);
      }
    };

    fetchDbcFiles();
    fetchParsers();
  }, [bucketId, fetchBucketDetails]);

  const selectedFilesFromStore = useStorageStore((state) => state.selectedFiles);

  useEffect(() => {
    if (parsers.length === 0) return;

    const mapped = selectedFilesFromStore.map((file) => {
      const extension = getExtension(file.title);
      let parserName = file.parserName ?? '';

      if (extension === 'mp4' && !file.parserName) {
        parserName = 'VideoParser';
      }

      const parser = parsers.find((p) => p.name === parserName || p.id === parserName);

      // ✅ dbcFileId → dbcList에서 path/name 찾아 매핑
      const dbcMeta = dbcList.find((dbc) => dbc.id === file.dbcFileId);
      const dbcFileName = dbcMeta?.name ?? '';

      return {
        title: file.title,
        extension,
        parserName: parser?.id ?? '',
        parserId: parser?.id ?? '',
        fileId: file.fileId,
        path: file.path,
        dbcFile: null,
        dbcFileId: file.dbcFileId,
        dbcFileName: dbcFileName,
      };
    });

    setLocalSelectedFiles(mapped);

    //전체 선택
    const allIds = new Set(mapped.map((f) => f.path));
    setSelectedIds(allIds);

    // DBC 리스트에 없는 DBC가 있으면 추가
    const additionalDbcs = mapped
      .filter((f) => f.dbcFileId && f.dbcFileName && !dbcList.some((d) => d.name === f.dbcFileName))
      .map((f) => ({
        id: f.dbcFileId ?? '',
        name: f.dbcFileName!,
      }));

    if (additionalDbcs.length > 0) {
      setDbcList((prev) => [...prev, ...additionalDbcs]);
    }
  }, [selectedFilesFromStore, parsers]);

  const handleDbcFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>, rowId: string, rowTitle: string) => {
    let fileObj = e.target.files?.[0];
    if (!fileObj) return;

    try {
      let fileName = fileObj.name;
      let path = `/dbc/${fileName}`;

      // 0. 중복 여부 체크
      const isDuplicate = await dbcService.checkDbcFileExists(fileName);
      if (isDuplicate) {
        const confirmOverwrite = window.confirm(
          `이미 동일한 이름의 DBC 파일이 존재합니다: ${fileName}\n덮어쓰시겠습니까?`,
        );

        if (!confirmOverwrite) {
          let newName: string | null = fileName;

          while (true) {
            newName = window.prompt('새로운 파일 이름을 입력하세요:', newName);
            if (!newName || newName.trim() === '') return;

            const checkNew = await dbcService.checkDbcFileExists(newName);
            if (!checkNew) {
              // 중복 아님 → 이 이름 사용
              fileObj = new File([fileObj], newName, { type: fileObj.type });
              fileName = newName;
              path = `/dbc/${fileName}`;
              break;
            } else {
              alert(`"${newName}" 이름이 이미 존재합니다. 다른 이름을 입력해주세요.`);
            }
          }
        } else {
          // 덮어쓰기 OK → 그대로 진행
        }
      }

      // 1. nginx에 업로드
      const formData = new FormData();
      formData.append('file', fileObj);

      const getUserResponse = await authService.getUserDetails();
      if (getUserResponse.success) {
        const userDetails = getUserResponse.result;
        formData.append('userId', userDetails.id);

        await dbcService.uploadDbcToNginx(formData);

        // 2. DB에 등록 (또는 이미 있으면 반환)
        const dbcMeta = await dbcService.uploadDbcToDatabase(fileName); // { id, name }

        // 3. DBC 리스트에 추가
        const exists = dbcList.some((dbc) => dbc.id === dbcMeta.id);
        if (!exists) {
          setDbcList((prev) => [...prev, { id: dbcMeta.id, name: fileName, path: dbcMeta.name }]);
        }

        // 4. 로컬 선택 파일에 반영
        setLocalSelectedFiles((prevFiles) =>
          prevFiles.map((f) =>
            f.title === rowTitle
              ? {
                  ...f,
                  dbcFile: fileObj,
                  dbcFileName: fileName,
                  dbcFilePath: dbcMeta.name,
                  dbcFileId: dbcMeta.id,
                  parserName: f.parserName,
                  parserId: f.parserId,
                }
              : f,
          ),
        );
      }
    } catch (err) {
      console.error('DBC 업로드 실패:', err);
      alert('DBC 파일 업로드 중 오류 발생');
    }
  };

  const handleOk = async () => {
    const userRes = await authService.getUserDetails();
    const currentBucketName = userRes.result.currentUsedBucketName;

    // bucketList는 Zustand에 저장된 버킷 목록
    const { bucketList } = useStorageStore.getState();
    const matched = bucketList?.find((b) => b.name === currentBucketName);

    const resolvedBucketId = matched?.id;

    const filesToUpload = await Promise.all(
      localSelectedFiles
        .filter((file) => selectedIds.has(file.path))
        .map(async (file) => {
          let dbcFileId: string | null = null;

          //  DBC 파일이 지정된 경우
          if (file.dbcFileName) {
            const path = `/dbc/${file.dbcFileName}`;
            try {
              const res = await dbcService.uploadDbcToDatabase(file.dbcFileName);
              dbcFileId = res.id; //id
            } catch (e) {
              console.warn(`DBC 파일 저장 실패: ${file.dbcFileName}`, e);
            }
          }

          return {
            name: file.title,
            path: file.path,
            bucketId: resolvedBucketId ?? '',
            parserId: file.parserName || '',
            dbcFileId,
          };
        }),
    );

    if (filesToUpload.length === 0) {
      alert('업로드할 파일을 ✔ 해주세요.');
      return;
    }

    try {
      await storageService.uploadMultipleFiles(filesToUpload); // POST /upload-files/batch
      onOk(bucketName);
    } catch (error) {
      console.error('업로드 실패:', error);
      alert('업로드 중 오류가 발생했습니다.');
    }
  };

  const handleDelete = (bucketId: string) => {
    // 삭제 로직
    console.log(`삭제할 버킷 ID: ${bucketId}`);
  };

  // 파일 이름에서 확장자 추출
  const getExtension = (filename: string): string | undefined => {
    if (!filename) return undefined;
    const parts = filename.split('.');
    if (parts.length < 2) return undefined;
    return parts.pop()?.toLowerCase();
  };

  const isParserApplicable = (extension?: string) => {
    const ext = extension?.toLowerCase();
    return ext !== 'mp4' && ext !== undefined && ext !== '' && ext === 'riff'; // 확장자 없으면 폴더일 가능성 있음
  };

  const columns: ColumnDef<any>[] = [
    {
      id: 'select',
      header: () => (
        <input
          type="checkbox"
          checked={selectedIds.size > 0 && selectedIds.size === localSelectedFiles.length}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedIds(new Set(localSelectedFiles.map((file) => file.path)));
            } else {
              setSelectedIds(new Set());
            }
          }}
        />
      ),
      cell: ({ row }) => {
        const fileId = row.original.path;
        const checked = selectedIds.has(fileId);
        return (
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => {
              setSelectedIds((prev) => {
                const newSet = new Set(prev);
                if (e.target.checked) {
                  newSet.add(fileId);
                } else {
                  newSet.delete(fileId);
                }
                return newSet;
              });
            }}
          />
        );
      },
    },
    {
      header: 'Name',
      accessorKey: 'title',
    },
    {
      id: 'extension',
      accessorKey: 'extension',
    },

    {
      header: 'Parser',
      accessorKey: 'Parser',
      cell: ({ row }) => {
        const file = localSelectedFiles.find((f) => f.title === row.original.title);
        const extension = file?.extension?.toLowerCase(); // 확장자 소문자로 정규화
        const applicable = isParserApplicable(extension);

        // mp4인 경우 VideoParser, 아닌 경우 VideoParser 제외
        const filteredParsers =
          extension === 'mp4'
            ? parsers.filter((p) => p.name === 'VideoParser')
            : parsers.filter((p) => p.name !== 'VideoParser');

        return (
          <select
            value={file?.parserName ?? ''}
            onChange={(e) => {
              const newParser = e.target.value;
              if (newParser === 'common') {
                setBulkTargetExtension(extension ?? null);
                setShowBulkModal(true);
                return;
              }
              setLocalSelectedFiles((prev) =>
                prev.map((f) => (f.title === row.original.title ? { ...f, parserName: newParser } : f)),
              );
            }}
            disabled={extension === 'mp4'}
          >
            <option value="">선택</option>
            {filteredParsers.map((parser) => (
              <option key={parser.id} value={parser.id}>
                {parser.name}
              </option>
            ))}
            {filteredParsers.length > 0 && <option value="common">같은 확장자 일괄 적용</option>}
          </select>
        );
      },
    },

    {
      header: 'DBC File',
      cell: ({ row }) => {
        const file = localSelectedFiles.find((f) => f.title === row.original.title);
        const applicable = isParserApplicable(file?.extension);

        return (
          <div className={styles.dbcFileRow}>
            <select
              value={file?.dbcFileId?.toString() ?? ''}
              disabled={!applicable}
              onChange={(e) => {
                const selectedId = e.target.value;
                if (selectedId === '__add_new__') {
                  fileInputRefs.current[row.id]?.click();
                  return;
                }
                const selectedDbc = dbcList.find((dbc) => dbc.id === selectedId);
                setLocalSelectedFiles((prev) =>
                  prev.map((f) =>
                    f.title === row.original.title
                      ? {
                          ...f,
                          dbcFileId: selectedId,
                          dbcFileName: selectedDbc?.name || '',
                        }
                      : f,
                  ),
                );
              }}
            >
              <option value="">선택</option>
              <option value="__add_new__">새 DBC 추가</option>
              {dbcList.map((dbc) => (
                <option key={dbc.id} value={dbc.id}>
                  {dbc.name}
                </option>
              ))}
            </select>
            <input
              type="file"
              accept=".dbc"
              ref={(el) => (fileInputRefs.current[row.id] = el)}
              style={{ display: 'none' }}
              onChange={(e) => handleDbcFileInputChange(e, row.id, row.original.title)}
            />
          </div>
        );
      },
    },
  ];

  return (
    <ModalFrame onConfirm={handleOk} onClose={onCancel} title={title} type="confirm" width="1100px">
      <div className={styles.modalContent}>
        <div className={styles.contentHeader}>
          <div className={styles.contentDescription}>선택한 데이터에 파서를 적용하여 업로드합니다.</div>
          <InfoTooltip
            text={`Parser를 설정하지 않아도 업로드할 수 있습니다.\n단, 폴더나 mp4 파일에는 Parser를 지정할 수 없습니다.`}
          />
        </div>
        <hr />
        <div className={styles.content}>
          <div className={styles.contentTitle}>
            파서 매핑 <span className={styles.selectedCount}>({selectedIds.size}개의 데이터가 선택되었습니다)</span>
          </div>
          <div>
            <TableComponent columns={columns} data={localSelectedFiles} />
          </div>
        </div>
      </div>
      <CommonApplyModal
        visible={showBulkModal}
        extension={bulkTargetExtension ?? ''}
        onClose={() => setShowBulkModal(false)}
        onConfirm={(parser, dontAskAgain) => {
          if (!parser) return;

          setLocalSelectedFiles((prev) =>
            prev.map((f) => (f.extension === bulkTargetExtension ? { ...f, parserName: parser } : f)),
          );

          setShowBulkModal(false);
        }}
        parserOptions={parsers}
      />
    </ModalFrame>
  );
};

export default UploadModal;
