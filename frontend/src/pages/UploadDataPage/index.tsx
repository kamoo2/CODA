import { userInfo } from 'os';
import { Key, useEffect, useState, useMemo, useRef } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { MdDelete } from 'react-icons/md';
import { toast } from 'react-toastify';
import styles from './index.module.scss';
import CommonApplyModal from '@/components/pages/UploadDataPage/CommonApplyModal';
import { storageService } from '@/apis/services/storageService';
import { dbcService } from '@/apis/services/dbcFileService';
import TableComponent from '@/components/common/Table';
import { SelectedFileWithParserAndDbc } from '@/types/storage';
import { useStorageStore, useStorageFilterStore, useParserStore } from '@/store/storageStore';
import UploadDBCFiles from '@/pages/UploadDataPage/UploadDBCFiles';
import authService from '@/apis/services/authService';
const UploadDataPage = () => {
  const [localSelectedFiles, setLocalSelectedFiles] = useState<SelectedFileWithParserAndDbc[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'upload' | 'dbc'>('upload'); // 탭 상태 추가
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkTargetExtension, setBulkTargetExtension] = useState<string | null>(null);
  const { parsers, fetchParsers } = useParserStore();
  const [backupFilesBeforeModal, setBackupFilesBeforeModal] = useState<SelectedFileWithParserAndDbc[]>([]);
  const [dbcList, setDbcList] = useState<{ id: string; name: string }[]>([]);
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  useEffect(() => {
    fetchParsers();
  }, []);

  useEffect(() => {
    if (parsers.length > 0) {
      fetchMyUploadFiles(); //  parsers가 실제로 채워졌을 때
    }
  }, [parsers]);

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
  }, []);

  const fetchMyUploadFiles = async () => {
    try {
      const res = await storageService.getUploadFiles();
      if (res.success) {
        const uploadFiles = res.result.map((file) => ({
          title: file.name,
          path: file.s3Url,
          parserName: file.parserName ?? '',
          parserId: parsers.find((p) => p.name === file.parserName)?.id ?? '',
          extension: file.name.split('.').pop() ?? '',
          lastEdit: '',
          etc: '',
          fileId: file.id,
          dbcFile: null,
          dbcFileId: file.dbcFileId ?? undefined,
        }));

        setLocalSelectedFiles(uploadFiles);
      } else {
        console.error('Failed to load bucket list:', res.message);
      }
    } catch (err) {
      console.error('API call error:', err);
    }
  };
  const handleDbcFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>, rowId: string, rowTitle: string) => {
    let fileObj = e.target.files?.[0];
    if (!fileObj) return;

    try {
      let fileName = fileObj.name;
      let path = `/dbc/${fileName}`;

      // 0. 중복 여부 체크
      const isDuplicate = await dbcService.checkDbcFileExists(fileName);
      if (isDuplicate) {
        const confirm = window.confirm(`이미 동일한 이름의 DBC 파일이 존재합니다: ${fileName}\n덮어쓰시겠습니까?`);
        if (!confirm) {
          let newName: string | null = fileName;

          while (true) {
            newName = window.prompt('새로운 파일 이름을 입력하세요:', newName);
            if (!newName || newName.trim() === '') return;

            const checkNew = await dbcService.checkDbcFileExists(newName);
            if (!checkNew) {
              fileObj = new File([fileObj], newName, { type: fileObj.type });
              fileName = newName;
              path = `/dbc/${fileName}`;
              break;
            } else {
              alert(`"${newName}" 이름이 이미 존재합니다. 다른 이름을 입력해주세요.`);
            }
          }
        }
      }

      // 1. 유저 정보 가져오기
      const getUserResponse = await authService.getUserDetails();
      if (!getUserResponse.success) throw new Error('유저 정보 가져오기 실패');

      const userDetails = getUserResponse.result;

      // 2. nginx에 업로드
      const formData = new FormData();
      formData.append('file', fileObj);
      formData.append('userId', userDetails.id);
      await dbcService.uploadDbcToNginx(formData); // formData 내부에 userId 포함

      // 3. DB에 등록 (또는 이미 존재하면 그걸 반환)
      const dbcMeta = await dbcService.uploadDbcToDatabase(fileName); // { id, name }

      // 4. DBC 리스트에 추가
      const exists = dbcList.some((dbc) => dbc.id === dbcMeta.id);
      if (!exists) {
        setDbcList((prev) => [...prev, { id: dbcMeta.id, name: fileName, path: dbcMeta.name }]);
      }

      // 5. 로컬 선택 파일 정보 업데이트
      setLocalSelectedFiles((prevFiles) =>
        prevFiles.map((f) =>
          f.title === rowTitle
            ? {
                ...f,
                dbcFile: fileObj,
                dbcFileName: fileName,
                dbcFilePath: dbcMeta.name,
                dbcFileId: dbcMeta.id,
              }
            : f,
        ),
      );

      // 6. UploadFile에 DBC 매핑 정보 업데이트
      const matchedFile = localSelectedFiles.find((f) => f.title === rowTitle);
      if (matchedFile?.fileId) {
        await storageService.updateUploadFile(matchedFile.fileId, undefined, dbcMeta.id);
      }

      toast.success('✅ DBC 파일이 저장되었습니다.');
    } catch (err) {
      console.error('DBC 업로드 실패:', err);
      alert('❌ DBC 파일 업로드 중 오류 발생');
    }
  };

  useEffect(() => {
    // 기존 DBC 불러오기
    const fetchDbcs = async () => {
      const list = await dbcService.loadDbcFilesInDatabase();
      const converted = list.map((item) => ({
        ...item,
        name: item.name,
      }));
      setDbcList((prev) => {
        const merged = [...prev];
        converted.forEach((newItem) => {
          if (!merged.some((d) => d.id === newItem.id)) {
            merged.push(newItem);
          }
        });
        return merged;
      });

      //  localSelectedFiles에서 누락된 DBC도 강제로 추가
      const additionalDbcs = localSelectedFiles
        .filter((f) => f.dbcFileId && f.dbcFileName && !converted.some((d) => d.id === f.dbcFileId))
        .map((f) => ({
          id: f.dbcFileId!,
          name: f.dbcFileName!,
          path: f.dbcFilePath ?? `/dbc/${f.dbcFileName}`,
        }));

      if (additionalDbcs.length > 0) {
        setDbcList((prev) => [...prev, ...additionalDbcs]);
      }
    };

    fetchDbcs();
  }, []);

  const handleSingleDelete = async (fileId: string, fileName: string) => {
    const confirm = window.confirm(`'${fileName}' 파일을 삭제하시겠습니까?`);
    if (!confirm) return;

    try {
      const result = await storageService.deleteUploadFiles([fileId]);
      const { deleted, skipped } = result;

      if (deleted.includes(fileId)) {
        setLocalSelectedFiles((prev) => prev.filter((f) => f.fileId !== fileId));
        setSelectedIds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(fileId);
          return newSet;
        });
        toast.success(`✅ '${fileName}' 파일이 삭제되었습니다.`);
      }

      if (skipped.length > 0) {
        const usedIn = skipped[0].usedIn.join(', ');
        toast.error(`❌ '${fileName}' 삭제 실패: 사용 중 (${usedIn})`);
      }

      fetchMyUploadFiles();
    } catch (err: any) {
      const message = err?.response?.data?.message ?? '❌ 알 수 없는 오류가 발생했습니다.';
      toast.error(`❌ '${fileName}' 삭제 실패: ${message}`);
    }
  };

  // 파일 이름에서 확장자 추출
  const getExtension = (filename: string): string | undefined => {
    const parts = filename.split('.');
    if (parts.length < 2) return undefined; // 확장자 없음 (폴더 or 확장자 없는 파일)
    return parts.pop()?.toLowerCase();
  };

  const selectedFilesFromStore = useStorageStore((state) => state.selectedFiles);

  useEffect(() => {
    const mapped = selectedFilesFromStore.map((file) => {
      const extension = getExtension(file.title);
      const parserName = file.parserName ?? '';
      const parser = parsers.find((p) => p.name === parserName);
      return {
        title: file.title,
        extension,
        parserName: parser?.id ?? '',
        dbcFile: null,
        dbcFileName: '',
        path: file.path,
      };
    });
  }, []);

  const filteredData = useMemo(() => localSelectedFiles, [localSelectedFiles]);

  const isParserApplicable = (extension?: string) => {
    const ext = extension?.toLowerCase();
    return ext !== 'mp4' && ext !== undefined && ext !== ''; // 확장자 없으면 폴더일 가능성 있음
  };

  const handleBulkDelete = async () => {
    const fileIdsToDelete = Array.from(selectedIds);
    if (fileIdsToDelete.length === 0) {
      toast.info('선택된 파일이 없습니다.');
      return;
    }

    const confirm = window.confirm(`${fileIdsToDelete.length}개 파일을 삭제하시겠습니까?`);
    if (!confirm) return;

    try {
      const result = await storageService.deleteUploadFiles(fileIdsToDelete); // ✅ 응답을 받음
      const { deleted, skipped } = result;

      // ✅ 상태 업데이트
      setLocalSelectedFiles((prev) => prev.filter((f) => !deleted.includes(f.fileId)));
      setSelectedIds((prev) => {
        const newSet = new Set(prev);
        deleted.forEach((id) => newSet.delete(id));
        return newSet;
      });

      // ✅ 메시지 분기 처리
      if (skipped.length === 0) {
        toast.success('✅ 모든 파일이 삭제되었습니다.');
      } else {
        const skippedNames = skipped.map((f) => `'${f.fileName}' (${f.usedIn.join(', ')})`).join('\n');
        if (deleted.length > 0) {
          toast.warn(`⚠️ 일부 파일만 삭제되었습니다.\n\n삭제되지 않은 파일:\n${skippedNames}`, { autoClose: false });
        } else {
          toast.error(`❌ 선택한 파일이 모두 사용 중이라 삭제되지 않았습니다.\n\n${skippedNames}`, {
            autoClose: false,
          });
        }
      }

      fetchMyUploadFiles(); // ✅ 목록 갱신
    } catch (err: any) {
      const message = err?.response?.data?.message ?? '❌ 알 수 없는 오류가 발생했습니다.';
      toast.error(`❌ 파일 삭제 실패: ${message}`);
    }
  };

  const isDbcApplicable = (extension?: string) => {
    return extension?.toLowerCase() === 'riff';
  };

  const columns: ColumnDef<any>[] = [
    {
      id: 'select',
      header: () => (
        <input
          type="checkbox"
          checked={selectedIds.size > 0 && selectedIds.size === filteredData.length}
          onChange={(e) => {
            const newSet = new Set<string>();
            if (e.target.checked) {
              filteredData.forEach((file) => newSet.add(file.fileId));
            }
            setSelectedIds(newSet);
          }}
        />
      ),
      cell: ({ row }) => {
        const fileId = row.original.fileId;
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
      accessorKey: 'title',
      cell: ({ row }) => {
        const fileId = row.original.fileId;
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
            {row.original.title}
          </div>
        );
      },
    },
    {
      header: 'Extension',
      accessorKey: 'extension',
      cell: ({ row }) => {
        const fileId = row.original.fileId;
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
            {row.original.extension}
          </div>
        );
      },
    },
    {
      header: 'Parser',
      accessorKey: 'Parser',
      cell: ({ row }) => {
        const file = localSelectedFiles.find((f) => f.title === row.original.title);
        const extension = file?.extension?.toLowerCase();
        const applicable = isParserApplicable(extension);

        // .mp4인 경우: VideoParser 보여주고, disabled
        if (extension === 'mp4') {
          const VideoParser = parsers.find((p) => p.name === 'VideoParser');
          return (
            <select value={VideoParser?.id ?? ''} disabled>
              <option value={VideoParser?.id}>{VideoParser?.name}</option>
            </select>
          );
        }

        // 그 외: VideoParser 제거 후 선택 가능
        const filteredParsers = parsers.filter((p) => p.name !== 'VideoParser');
        return (
          <select
            value={file?.parserId ?? ''} //  parserId 기준으로 매칭
            onChange={async (e) => {
              const newParserId = e.target.value;
              const fileId = row.original.fileId;

              const selectedParser = parsers.find((p) => p.id === newParserId);

              setLocalSelectedFiles((prev) =>
                prev.map((f) =>
                  f.title === row.original.title
                    ? {
                        ...f,
                        parserId: newParserId,
                        parserName: selectedParser?.name ?? '',
                      }
                    : f,
                ),
              );

              if (fileId) {
                try {
                  await storageService.updateUploadFile(fileId, newParserId, undefined);
                  toast.success('파서가 저장되었습니다.');
                } catch (err) {
                  console.error('파서 저장 실패:', err);
                  toast.error('파서 저장에 실패했습니다.');
                }
              }

              if (newParserId === 'common') {
                setBackupFilesBeforeModal(localSelectedFiles);
                setBulkTargetExtension(file?.extension ?? null);
                setShowBulkModal(true);
              }
            }}
            disabled={!applicable}
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
        const applicable = isDbcApplicable(file?.extension);

        return (
          <div className={styles.dbcFileRow}>
            <select
              value={file?.dbcFileId || ''}
              disabled={!applicable}
              onChange={async (e) => {
                const selectedId = e.target.value;
                const fileId = row.original.fileId;

                if (selectedId === '__add_new__') {
                  fileInputRefs.current[row.id]?.click();
                  return;
                }

                const selectedDbc = dbcList.find((dbc) => dbc.id === selectedId);

                // 로컬 상태 갱신
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

                // 서버에 저장
                if (fileId) {
                  try {
                    await storageService.updateUploadFile(fileId, undefined, selectedId); // parserId는 undefined
                    toast.success('DBC 파일이 저장되었습니다.');
                  } catch (err) {
                    console.error('DBC 저장 실패:', err);
                    toast.error('DBC 저장에 실패했습니다.');
                  }
                }
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

    {
      id: 'menu',
      header: '',
      cell: ({ row }) => (
        <div className={styles.menuContainer}>
          <MdDelete
            className={styles.deleteIcon}
            onClick={() => handleSingleDelete(row.original.fileId, row.original.title)}
          />
        </div>
      ),
    },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.tabContainer}>
        <button
          className={`${styles.tabButton} ${activeTab === 'upload' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('upload')}
        >
          Upload Datas
        </button>
        <button
          className={`${styles.tabButton} ${activeTab === 'dbc' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('dbc')}
        >
          DBC Files
        </button>
      </div>
      {activeTab === 'upload' && (
        <>
          <div className={styles.header}>
            <button onClick={handleBulkDelete}>업로드 삭제</button>
          </div>
          <TableComponent columns={columns} data={filteredData} />
          <CommonApplyModal
            visible={showBulkModal}
            extension={bulkTargetExtension ?? ''}
            onClose={() => {
              setShowBulkModal(false);
              setLocalSelectedFiles(backupFilesBeforeModal); // 복원
            }} // 취소 누르면 단순히 닫기
            onConfirm={async (parser, dontAskAgain) => {
              if (!parser || !bulkTargetExtension) return;

              const updated = localSelectedFiles.map((f) =>
                f.extension === bulkTargetExtension ? { ...f, parserName: parser } : f,
              );
              setLocalSelectedFiles(updated);
              const filesToUpdate = updated.filter((f) => f.extension === bulkTargetExtension);
              try {
                await Promise.all(
                  filesToUpdate.map((file) =>
                    file.fileId ? storageService.updateUploadFile(file.fileId, parser, undefined) : Promise.resolve(),
                  ),
                );
              } catch (err) {
                console.error('❌ 일부 파일 저장 실패', err);
                alert('일부 파일의 저장에 실패했습니다.');
              }
              setShowBulkModal(false);
            }}
            parserOptions={parsers}
          />
        </>
      )}

      {activeTab === 'dbc' && (
        <div>
          <UploadDBCFiles />
        </div>
      )}
    </div>
  );
};

export default UploadDataPage;
