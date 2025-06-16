import React, { useEffect, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import {
  CRITERIA_STATE,
  CurationProjectDto as DataCurationProjectDto,
  CurationProjectCriteriaDto,
  CurationResultDto,
} from '../../../../types/analysis';
import styles from './index.module.scss';
import TableComponent from '@/components/common/Table';
import criteriaService from '@/apis/services/criteriaService';
import curationService from '@/apis/services/dataConstructionService';
import useModal from '@/hooks/useModal';
import { CriteriaDto } from '@/types/criteria';
import ThumbnailCell from '@/components/shared/ThumbnailCellComponent';
import CriteriaSettingsModal from '@/components/shared/CriteriaSettingsModal';
import { UploadFileDto } from '@/types/storage';

interface Props {
  selectedProject: DataCurationProjectDto;
  socket: WebSocket | null;
  webSocketMessage: { timestamp: number; payload: any } | null;
}

export default function CurationComponent(props: Props) {
  // 큐레이션 조건 조건
  const [crts, setCrts] = useState<CurationProjectCriteriaDto[]>([]);
  // 합격 여부 조건 수행 결과
  const [curationResults, setCurationResults] = useState<CurationResultDto[]>([]);
  // 기준 설정 모달 관련 훅
  const [isOpen, handleClickModalOpen, handleClickModalClose] = useModal();
  // 쿼리 대상 업로드 파일
  const [queryTargetUploadFiles, setQueryTargetUploadFiles] = useState<UploadFileDto[]>([]);

  // props가 변경될때마다 관리 데이터 재설정
  useEffect(() => {
    fetchCriteriaAndResults();
  }, [props.selectedProject]);

  useEffect(() => {
    handleWebSocketMessage();
  }, [props.webSocketMessage]);

  const handleWebSocketMessage = async () => {
    const data = props.webSocketMessage?.payload;
    console.log('CURATION COMP 서버 메세지 도착 : ' + data.message);

    if (data.message === 'NEW_CURATION_RESULT') {
      // 분석 결과 발생 시, db result fetch
      await fetchCriteriaAndResults();
    } else if (data.message === 'CURATION_COMPLETED') {
      await curationService.updateProjectCriteriaState(data.projectCriteriaId, CRITERIA_STATE.COMPLETE);
      setCrts((prevData) => {
        const updatedData = prevData.map((prjCrt) =>
          prjCrt.id === data.projectCriteriaId
            ? { ...prjCrt, state: CRITERIA_STATE.COMPLETE } // 새로운 객체 생성
            : prjCrt,
        );

        return [...updatedData]; // 배열 자체를 새로운 참조로 변경
      });
      await fetchCriteriaAndResults();
    }
  };

  const sendCommand = (prjCrtId: string, command: string) => {
    if (props.socket) {
      props.socket.send(JSON.stringify({ command, projectCriteriaId: prjCrtId }));
    }
  };

  const fetchCriteriaAndResults = async () => {
    try {
      const [getCrtResponse, getResultsResponse] = await Promise.all([
        curationService.getCriteriasByProjectID(props.selectedProject.id),
        curationService.getCurationResultsByProjectId(props.selectedProject.id),
      ]);

      if (getCrtResponse.success && getResultsResponse.success) {
        // 하나의 함수 안에서 상태를 동기적으로 모두 업데이트
        setCrts(getCrtResponse.result);
        setCurationResults(getResultsResponse.result);
      }
    } catch (error) {
      console.error('데이터 가져오기 오류:', error);
    }
  };

  const handleAddCriterias = async () => {
    // 파일 선택 모달 출력
    handleClickModalOpen();
  };

  const handleExecuteCriterias = async () => {
    // 분석 조건 수행 여부를 가져와서 재수행인지, 초기수행인지 알아온다.
    crts.map((crt) => {
      if (parseCriteriaState(crt.state) === CRITERIA_STATE.NONE) {
        // 분석 수행
        sendCommand(crt.id, 'START');
        setCrts((prevData) =>
          prevData.map((prjCrt) => (prjCrt.id === crt.id ? { ...prjCrt, state: CRITERIA_STATE.RUNNING } : prjCrt)),
        );
        curationService.updateProjectCriteriaState(crt.id, CRITERIA_STATE.RUNNING);
      }
      // 재수행 이라면
      else if (parseCriteriaState(crt.state) === CRITERIA_STATE.PAUSED) {
        sendCommand(crt.id, 'RESUME');
        setCrts((prevData) =>
          prevData.map((prjCrt) => (prjCrt.id === crt.id ? { ...prjCrt, state: CRITERIA_STATE.RUNNING } : prjCrt)),
        );
        curationService.updateProjectCriteriaState(crt.id, CRITERIA_STATE.RUNNING);
      }
      // 재수행 이라면
      else if (parseCriteriaState(crt.state) === CRITERIA_STATE.ERROR) {
      }
    });
  };

  const saveProjectCriteria = async (newCrt: CurationProjectCriteriaDto) => {
    const response = await curationService.saveProjectCriteria(newCrt);
    return response.result;
  };

  // 문자열을 Enum 값으로 변환하는 함수
  const parseCriteriaState = (state: string): CRITERIA_STATE => {
    return CRITERIA_STATE[state as keyof typeof CRITERIA_STATE] || CRITERIA_STATE.NONE;
  };

  // 조건 별 분석 버튼 클릭 핸들
  const handleAnalysisButton = (prjCrtId: string) => {
    // 분석 조건 수행 여부를 가져와서 재수행인지, 초기수행인지 알아온다.
    crts.map((passEvalCrt) => {
      if (passEvalCrt.id === prjCrtId) {
        // 결과 삭제 버튼 클릭 시,
        if (parseCriteriaState(passEvalCrt.state) === CRITERIA_STATE.COMPLETE) {
          // 기존 분석 결과 제거
          deleteResultsByPrjCrtId(passEvalCrt);
          setCrts((prevData) =>
            prevData.map((prjCrt) => (prjCrt.id === prjCrtId ? { ...prjCrt, state: CRITERIA_STATE.NONE } : prjCrt)),
          );
          curationService.updateProjectCriteriaState(prjCrtId, CRITERIA_STATE.NONE);
        }
        // 분석 수행 버튼 클릭 시,
        else if (parseCriteriaState(passEvalCrt.state) === CRITERIA_STATE.NONE) {
          // 분석 수행
          sendCommand(passEvalCrt.id, 'START');
          setCrts((prevData) =>
            prevData.map((prjCrt) => (prjCrt.id === prjCrtId ? { ...prjCrt, state: CRITERIA_STATE.RUNNING } : prjCrt)),
          );
          curationService.updateProjectCriteriaState(prjCrtId, CRITERIA_STATE.RUNNING);
        }
        // 일시 정지 버튼 클릭 시,
        else if (parseCriteriaState(passEvalCrt.state) === CRITERIA_STATE.RUNNING) {
          sendCommand(passEvalCrt.id, 'PAUSE');
          setCrts((prevData) =>
            prevData.map((prjCrt) => (prjCrt.id === prjCrtId ? { ...prjCrt, state: CRITERIA_STATE.PAUSED } : prjCrt)),
          );
          curationService.updateProjectCriteriaState(prjCrtId, CRITERIA_STATE.PAUSED);
        }
        // 재수행 이라면
        else if (parseCriteriaState(passEvalCrt.state) === CRITERIA_STATE.PAUSED) {
          sendCommand(passEvalCrt.id, 'RESUME');
          setCrts((prevData) =>
            prevData.map((prjCrt) => (prjCrt.id === prjCrtId ? { ...prjCrt, state: CRITERIA_STATE.RUNNING } : prjCrt)),
          );
          curationService.updateProjectCriteriaState(prjCrtId, CRITERIA_STATE.RUNNING);
        }
        // 재수행 이라면
        else if (parseCriteriaState(passEvalCrt.state) === CRITERIA_STATE.ERROR) {
        }
      }
    });
  };

  const deleteResultsByPrjCrtId = async (prjCrt: CurationProjectCriteriaDto) => {
    setCurationResults((preResults) => preResults.filter((result) => result.projectCriteriaId !== prjCrt.id));
    // db 삭제
    await curationService.deleteCurationResultsByProjectCriteriaId(prjCrt.id);
  };

  const handleRemoveCriteria = async (prjCrtId: string) => {
    // 조건 삭제
    setCrts((prev) => prev.filter((data) => data.id !== prjCrtId));
    deleteProjectCriteria(prjCrtId);
  };

  const deleteProjectCriteria = async (prjCrtId: string) => {
    // 결과 데이터 삭제
    for (const prjCrt of crts) {
      if (prjCrt.id === prjCrtId) {
        setCurationResults((prevResults) => prevResults.filter((result) => result.projectCriteriaId !== prjCrt.id));
        // db 삭제
        await curationService.deleteCurationResultsByProjectCriteriaId(prjCrt.id);
        break;
      }
    }

    // projectCriteria 삭제 (결과 삭제가 끝난 후)
    await curationService.deleteProjectCriteria(prjCrtId);
  };

  const getButtonText = (state: CRITERIA_STATE) => {
    switch (state) {
      case CRITERIA_STATE.NONE:
        return '분석 수행';
      case CRITERIA_STATE.RUNNING:
        return '일시 정지';
      case CRITERIA_STATE.COMPLETE:
        return '결과 삭제';
      case CRITERIA_STATE.PAUSED:
      case CRITERIA_STATE.ERROR:
        return '분석 재수행';
      default:
        return '분석 수행';
    }
  };

  const isDeleteCrtDisabled = (prjCrtId: string) => {
    for (const prjCrt of crts) {
      if (prjCrt.id === prjCrtId && prjCrt.state === CRITERIA_STATE.RUNNING) {
        return true;
      }
    }
    return false;
  };

  // table columns 설정
  const criteriaTableColumns = React.useMemo<ColumnDef<CurationProjectCriteriaDto>[]>(
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
          const row = info.row.original;
          return (
            <div className={styles.criteriaCell}>
              <p>{row.uploadFileName}</p>
            </div>
          );
        },
      },
      {
        header: '확장자',
        id: 'extension',
        accessorFn: (row) => row.uploadFileExtension,
        cell: (info) => {
          const row = info.row.original;
          return (
            <div className={styles.criteriaCell}>
              <p>{row.uploadFileExtension}</p>
            </div>
          );
        },
      },
      {
        header: '기준',
        id: 'criteria',
        accessorFn: (row) => row.criteriaName,
        cell: (info) => {
          const value = info.getValue() as string;
          return (
            <div className={styles.criteriaCell}>
              <p>{value}</p>
              <button className={styles.button}>수정</button>
            </div>
          );
        },
      },
      {
        header: '검출 구간 개수',
        id: 'curationResultsCount',
        accessorFn: (row) => {
          curationResults ? curationResults.filter((result) => result.projectCriteriaId === row.id).length : 0;
        },
        cell: (info) => {
          const row = info.row.original;
          return (
            <p>
              {curationResults ? curationResults.filter((result) => result.projectCriteriaId === row.id).length : 0}
            </p>
          );
        },
        enableColumnFilter: false,
        enableSorting: false,
      },
      {
        header: '분석 수행',
        id: 'analysis',
        accessorFn: (row) => row.state,
        cell: (info) => {
          const row = info.row.original;
          const state = info.getValue<CRITERIA_STATE>();
          return (
            <button className={styles.button} onClick={() => handleAnalysisButton(row.id)}>
              {getButtonText(state)}
            </button>
          );
        },
        enableColumnFilter: false,
        enableSorting: false,
      },
      {
        header: '분석 상태',
        id: 'analysisState',
        accessorFn: (row) => row.state,
        cell: (info) => {
          const state = info.getValue<CRITERIA_STATE>();
          return <p>{state}</p>;
        },
        enableColumnFilter: false,
        enableSorting: false,
      },
      {
        header: '제거',
        id: 'delete',
        accessorFn: (row) => row.id,
        cell: (info) => {
          const projectCrtId = info.getValue() as string;
          return (
            <button
              className={styles.button}
              disabled={isDeleteCrtDisabled(projectCrtId)}
              onClick={() => {
                handleRemoveCriteria(projectCrtId);
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
    [crts],
  );

  const curationResultTableColumns = React.useMemo<ColumnDef<CurationResultDto>[]>(
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
        cell: (info) => info.getValue(),
        enableColumnFilter: true,
      },
      {
        header: '확장자',
        id: 'fileExtension',
        accessorFn: (row) => row.uploadFileExtension,
        cell: (info) => info.getValue(),
        enableColumnFilter: true,
      },
      {
        header: '기준',
        id: 'criteria',
        accessorFn: (row) => row.criteriaName,
        cell: (info) => info.getValue(),
        enableColumnFilter: true,
      },
      {
        header: '시작 시간',
        id: 'startTime',
        accessorFn: (row) => row.startTime.replace('T', ' '),
        cell: (info) => {
          const row = info.row.original;
          return <p>{row.startTime.replace('T', ' ')}</p>;
        },
        enableColumnFilter: true,
      },
      {
        header: '종료 시간',
        id: 'endTime',
        accessorFn: (row) => row.endTime.replace('T', ' '),
        cell: (info) => {
          const row = info.row.original;
          return <p>{row.endTime.replace('T', ' ')}</p>;
        },
        enableColumnFilter: true,
      },
      {
        header: '미리보기',
        id: 'thumbnail',
        accessorFn: (row) => row.id,
        cell: (info) => {
          const row = info.row.original;
          let thumbnailUrl = 'http://localhost:80/curations/t1.jpg';
          if (info.row.index % 2 === 0) {
            thumbnailUrl = 'http://localhost:80/curations/t2.png';
          } else {
            thumbnailUrl = 'http://localhost:80/curations/t3.png';
          }

          return <ThumbnailCell thumbnailUrl={thumbnailUrl} />;
        },
        enableColumnFilter: false,
        enableSorting: false,
      },
      {
        header: '내보내기',
        id: 'export',
        accessorFn: (row) => row.id,
        cell: (info) => {
          const row = info.row.original;
          return <button data-pdf-exclude="true">내보내기</button>;
        },
        enableColumnFilter: false,
        enableSorting: false,
      },
      {
        header: '시각화',
        id: 'runViz',
        accessorFn: (row) => row.id,
        cell: (info) => {
          const row = info.row.original;
          return <button data-pdf-exclude="true">시각화</button>;
        },
        enableColumnFilter: false,
        enableSorting: false,
      },
    ],
    [curationResults],
  );

  const handleClickClose = () => {
    // 모달을 Cancel했을 때 해야할 로직이 있다면 추가
    setQueryTargetUploadFiles([]);
    // 후에 반드시 모달을 닫는 메서드 호출
    handleClickModalClose();
  };

  const handleClickConfirm = async (savedCriteriaDtos: CriteriaDto[] | null) => {
    if (savedCriteriaDtos) {
      // project criteria 만들어서 저장하기
      for (const savedCriteriaDto of savedCriteriaDtos) {
        for (const file of queryTargetUploadFiles) {
          let projectFileId: string = '';
          const response = await curationService.getProjectFiles(props.selectedProject.id);
          if (response.success) {
            for (const projectfile of response.result) {
              if (projectfile.uploadFileId === file.id) {
                projectFileId = projectfile.id;
                break;
              }
            }
            // 동일한 조건이 이미 추가되어있는지 확인
            if (
              !crts.some(
                (crt) =>
                  crt.criteriaId === savedCriteriaDto.id &&
                  crt.uploadFileName === file.name.split('.')[0] &&
                  crt.uploadFileExtension === file.name.split('.')[1],
              )
            ) {
              const newDto: CurationProjectCriteriaDto = {
                id: '',
                createdAt: new Date().toISOString(),
                projectId: props.selectedProject.id,
                criteriaId: savedCriteriaDto.id,
                criteriaName: savedCriteriaDto.name,
                state: CRITERIA_STATE.NONE,
                projectFileId,
                uploadFileName: file.name.split('.')[0],
                uploadFileExtension: file.name.split('.')[1],
              };
              // DB Save
              const savedProjectCriteriaDto = await saveProjectCriteria(newDto);
              setCrts((prev) => [...prev, savedProjectCriteriaDto]);
            }
          } else {
            console.log('curationService.getProjectFiles 오류 발생!!');
          }
        }
      }
      setQueryTargetUploadFiles([]);
      // 모달 닫기
      handleClickModalClose();
    }
    // other type
    else {
      setQueryTargetUploadFiles([]);
      // 모달 닫기
      handleClickModalClose();
    }
  };

  return (
    <>
      {isOpen && (
        <CriteriaSettingsModal
          title="큐레이션 기준 설정"
          description="데이터 큐레이션을 위한 기준을 설정합니다."
          onClose={handleClickClose}
          onConfirm={handleClickConfirm}
          selectedProject={props.selectedProject}
          isCuration={true}
          curationTargetUploadFiles={queryTargetUploadFiles}
          setCurationTargetUploadFiles={setQueryTargetUploadFiles}
        />
      )}

      <div className={styles.projectContent}>
        <div className={styles.subContentTopLayout}>
          <div className={styles.projectSubContent}>
            <div className={styles.subContentLayout}>
              <div className={styles.subContentHeader}>
                <p className={styles.subcontentTitle}>데이터 큐레이션 기준 - total : {crts.length}</p>
                <button style={{ marginLeft: 10 }} data-pdf-exclude="true" onClick={handleAddCriterias}>
                  기준 추가
                </button>
                <button style={{ marginLeft: 10 }} data-pdf-exclude="true" onClick={handleExecuteCriterias}>
                  전체 분석 하기
                </button>
              </div>
              <TableComponent columns={criteriaTableColumns} data={crts} />
            </div>
          </div>
        </div>
        {curationResults.length !== 0 && (
          <div className={styles.projectSubContent}>
            <div className={styles.subContentLayout}>
              <div className={styles.subContentHeader}>
                <p className={styles.subcontentTitle}>데이터 큐레이션 결과 - total : {curationResults.length}</p>
              </div>
              <TableComponent columns={curationResultTableColumns} data={curationResults} />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
