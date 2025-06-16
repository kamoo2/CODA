import React, { useCallback, useEffect, useRef, useState } from 'react';
import { debounce } from 'lodash';
import { ColumnDef } from '@tanstack/react-table';
import styles from './index.module.scss';
import TableComponent from '@/components/common/Table';
import { EvalProjectDto, ProjectFileDto } from '@/types/analysis';
import evaluationService from '@/apis/services/evaluationService';
import { UploadFileDto } from '@/types/storage';
import storageService from '@/apis/services/storageService';
import useModal from '@/hooks/useModal';
import ModalFrame from '@/components/common/Modal/ModalFrame';
import CommonCheckboxList from '@/components/shared/CommonCheckboxList';

interface Props {
  selectedProject: EvalProjectDto;
  onUpdateDescription: (description: string) => void;
}

export const EvalProjectSettingsComponent = (props: Props) => {
  const [evalDate, setEvalDate] = useState<Date>(new Date());
  const [files, setFiles] = useState<ProjectFileDto[]>([]);
  // 전체 업로드 파일
  const [uploadFiles, setUploadFiles] = useState<UploadFileDto[]>([]);
  // 선택된 업로드 파일
  const [selectedUploadFiles, setSelectedUploadFiles] = useState<UploadFileDto[]>([]);
  // 파일 선택 모달 관련 훅
  const [isOpen, handleClickModalOpen, handleClickModalClose] = useModal();

  useEffect(() => {
    setEvalDate(new Date(props.selectedProject.analysisDate));
    fetchProjectFiles(); // db에 저장된 분석 대상 데이터 load
  }, [props.selectedProject]); // ✅ props.project 변경 시에만 실행

  const fetchProjectFiles = async () => {
    const response = await evaluationService.getEvalProjectFiles(props.selectedProject.id);
    if (response.success) {
      setFiles(response.result);
    } else {
      // setError(response.errorCode);
    }
    // setLoading(false);
  };

  // description 500ms 동안 수정 없을 때에만 저장하기 위한 ref
  const debouncedUpdate = useRef(
    debounce(async (projectId: string, newDescription: string) => {
      await updateDescription(projectId, newDescription);
    }, 500),
  ).current;

  const handleProjectDescriptorChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newDescription = event.target.value;
      props.onUpdateDescription(newDescription); // 부모에서도 상태를 업데이트하도록 요청
      // debounce 적용된 함수 실행
      debouncedUpdate(props.selectedProject.id, newDescription);
    },
    [props.selectedProject.id, debouncedUpdate],
  );

  const updateDescription = async (projectId: string, description: string) => {
    await evaluationService.updateEvalProjectDescription(projectId, description);
  };

  // description text area unfocus 시, 데이터 저장 함수
  const handleBlur = async (event: React.FocusEvent<HTMLTextAreaElement>) => {
    const description = event.target.value;
    await evaluationService.updateEvalProjectDescription(props.selectedProject.id, description);
  };

  const handleClickClose = () => {
    // 모달을 Cancel했을 때 해야할 로직이 있다면 추가
    // 후에 반드시 모달을 닫는 메서드 호출
    handleClickModalClose();
  };

  const handleClickConfirm = async () => {
    // 모달에서 선택된 파일들 중 기존의 files에 존재하지 않는 아이템이면 추가
    selectedUploadFiles.map((uploadFile) => {
      const isContains = files.some((file) => file.uploadFileId === uploadFile.id);
      if (!isContains) {
        const newDto: ProjectFileDto = {
          id: '',
          projectId: props.selectedProject.id,
          uploadFileId: uploadFile.id,
          uploadFileName: uploadFile.name,
          uploadFilePath: uploadFile.s3Url,
        };
        saveEvalProjectFile(newDto);
        setFiles((pre) => [...pre, newDto]);
      }
    });

    // files 중 모달에서 선택된 파일들에 포함되지 않는 아이템이면 삭제
    files.map((file) => {
      const isContains = selectedUploadFiles.some((uploadFile) => file.uploadFileId === uploadFile.id);
      if (!isContains) {
        handleRemoveFile(file.uploadFileId);
      }
    });

    // 후에 반드시 모달을 닫는 메서드 호출
    handleClickModalClose();
  };

  const handleAddFiles = async () => {
    // 업로드 데이터 가져오기
    const fetchedUploadFiles = await fetchUploadFiles();
    setUploadFiles(fetchedUploadFiles);
    // 업로드 데이터 중 files에 추가되어있는 아이템들 설정하기
    const selectedFiles: UploadFileDto[] = [];
    fetchedUploadFiles.map((uploadFile) => {
      const isContains = files.some((file) => file.uploadFileId === uploadFile.id);
      if (isContains) {
        selectedFiles.push(uploadFile);
      }
    });
    setSelectedUploadFiles(selectedFiles);

    // 파일 선택 모달 출력
    handleClickModalOpen();
  };

  const saveEvalProjectFile = async (newFile: ProjectFileDto) => {
    await evaluationService.saveEvalProjectFile(newFile);
  };

  const fetchUploadFiles = async () => {
    const response = await storageService.getUploadFiles();
    if (response.success) {
      return response.result;
    } else {
      return [];
    }
  };

  const handleRemoveFile = (uploadFileId: string) => {
    setFiles((prev) => prev.filter((data) => data.uploadFileId !== uploadFileId));
    // selectedUploadFiles에서도 제거
    setSelectedUploadFiles((prev) => prev.filter((data) => data.id !== uploadFileId));

    deleteEvalProjectFile(uploadFileId);
  };

  const deleteEvalProjectFile = async (fileId: string) => {
    await evaluationService.deleteEvalProjectFile(props.selectedProject.id, fileId);
  };

  // table columns 설정
  const fileTableColumns = React.useMemo<ColumnDef<ProjectFileDto>[]>(
    () => [
      {
        header: 'No',
        id: 'no',
        accessorFn: (row, index) => index + 1, // No 열을 1부터 1씩 증가하는 값으로 설정
        enableColumnFilter: false,
      },
      {
        header: '파일 이름',
        id: 'fileName',
        accessorFn: (row) => row.uploadFileName,
        cell: (info) => {
          const value = info.getValue() as string;
          return <p>{value}</p>;
        },
      },
      {
        header: '파일 경로',
        id: 'filePath',
        accessorFn: (row) => row.uploadFilePath,
        cell: (info) => <p>{info.getValue() as string}</p>,
      },
      {
        header: '제거',
        id: 'delete',
        accessorFn: (row) => row.uploadFileId,
        cell: (info) => {
          const fileId = info.getValue() as string;
          return (
            <button
              className={styles.button}
              onClick={() => {
                handleRemoveFile(fileId);
              }}
            >
              제거
            </button>
          );
        },
        enableColumnFilter: false,
        enableSorting: false,
      },
    ],
    [files],
  );

  return (
    <>
      {props.selectedProject !== null && (
        <div className={styles.projectContent}>
          {isOpen && (
            <ModalFrame
              title="분석 대상 파일 선택"
              description="업로드된 파일들 중, 분석할 데이터를 선택합니다."
              type="confirm"
              onClose={handleClickClose}
              onConfirm={handleClickConfirm}
            >
              <CommonCheckboxList
                items={uploadFiles}
                selectedIds={selectedUploadFiles.map((f) => f.id)}
                onSelectionChange={(selectedFiles) => {
                  setSelectedUploadFiles(selectedFiles);
                }}
                getId={(file) => file.id}
                getLabel={(file) => file.name}
                getBadge={(file) => {
                  const ext = file.name.split('.').pop()?.toLowerCase();
                  const color =
                    ext === 'csv' ? '#4FC3F7' : ext === 'json' ? '#FFB74D' : ext === 'txt' ? '#90A4AE' : '#81C784';
                  return { text: ext?.toUpperCase() || '', color };
                }}
              />
            </ModalFrame>
          )}
          <p style={{ marginBottom: 10 }}>프로젝트 생성 날짜 : {props.selectedProject.createdAt.replace('T', ' ')}</p>
          <p style={{ marginBottom: 10 }}>
            분석 수행 날짜 : {evalDate.getFullYear()}-{String(evalDate.getMonth() + 1).padStart(2, '0')}-
            {String(evalDate.getDate()).padStart(2, '0')}
            {' ' + String(evalDate.getHours()).padStart(2, '0')}:{String(evalDate.getMinutes()).padStart(2, '0')}:
            {String(evalDate.getSeconds()).padStart(2, '0')}
          </p>
          <p style={{ marginBottom: 10 }}>담당자 : {props.selectedProject.owner}</p>
          <p style={{ marginBottom: 10 }}>설명 :</p>
          <textarea
            style={{ marginBottom: 10 }}
            className={styles.analysisSubjectDescriptor}
            value={props.selectedProject.description}
            onChange={handleProjectDescriptorChange}
            onBlur={handleBlur} // 포커스가 빠질 때 최종 업데이트
            placeholder="분석 프로젝트에 대한 설명을 입력하세요."
          ></textarea>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
            <p>분석 대상 데이터:</p>
            <button style={{ marginLeft: 10 }} data-pdf-exclude="true" onClick={handleAddFiles}>
              선택
            </button>
          </div>
          <TableComponent columns={fileTableColumns} data={files} />
        </div>
      )}
    </>
  );
};
