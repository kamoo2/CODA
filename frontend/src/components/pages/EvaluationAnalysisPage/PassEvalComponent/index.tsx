import React, { useEffect, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import {
  CRITERIA_TYPE,
  EvalProjectCriteriaDto,
  PassEvalResultDto,
  EvalProjectDto,
  CRITERIA_STATE,
} from '../../../../types/analysis';
import styles from './index.module.scss';
import TableComponent from '@/components/common/Table';
import evaluationService from '@/apis/services/evaluationService';
import useModal from '@/hooks/useModal';
import { CriteriaDto } from '@/types/criteria';
import CriteriaSettingsModal from '@/components/shared/CriteriaSettingsModal';
import { startTask } from '@/utils/utils';
import { TaskDto } from '@/types/task';

interface Props {
  selectedProject: EvalProjectDto;
  socket: WebSocket | null;
  webSocketMessage: { timestamp: number; payload: any } | null;
}

export default function PassEvalComponent(props: Props) {
  // 합격 여부 판정 여부 (체크박스 상태 저장)
  const [evalEnabled, setEvalEnabled] = useState<boolean>(false);
  // 합격 여부 판단 조건 행
  const [passEvalCrts, setPassEvalCrts] = useState<EvalProjectCriteriaDto[]>([]);
  // 합격 여부 조건 수행 결과
  const [passEvalResults, setPassEvalResults] = useState<PassEvalResultDto[]>([]);
  // 합/불 여부
  const [hasEvaluatedCriteria, setHasEvaluatedCriteria] = useState<boolean>(false);
  // 기준 설정 모달 관련 훅
  const [isOpen, handleClickModalOpen, handleClickModalClose] = useModal();

  // props가 변경될때마다 관리 데이터 재설정
  useEffect(() => {
    setEvalEnabled(props.selectedProject.passEvalEnabled);
    fetchPassEvalCriteriaAndResults();
  }, [props.selectedProject]);

  useEffect(() => {
    handleWebSocketMessage();
  }, [props.webSocketMessage]);

  useEffect(() => {
    setHasEvaluatedCriteria(passEvalCrts.some((criteria) => criteria.state === CRITERIA_STATE.COMPLETE));
  }, [passEvalCrts]);

  const handleWebSocketMessage = async () => {
    const data = props.webSocketMessage?.payload;
    console.log('PASS COMP 서버 메세지 도착 : ' + data.message);

    if (data.message === 'NEW_PASS_EVAL_RESULT') {
      // 분석 결과 발생 시, db result fetch
      await fetchPassEvalCriteriaAndResults();
    } else if (data.message === 'PASS_EVAL_COMPLETED') {
      await evaluationService.updateProjectCriteriaState(data.projectCriteriaId, CRITERIA_STATE.COMPLETE);
      setPassEvalCrts((prevData) => {
        const updatedData = prevData.map((prjCrt) =>
          prjCrt.id === data.projectCriteriaId
            ? { ...prjCrt, state: CRITERIA_STATE.COMPLETE } // 새로운 객체 생성
            : prjCrt,
        );

        return [...updatedData]; // 배열 자체를 새로운 참조로 변경
      });
      setHasEvaluatedCriteria(true);
      await fetchPassEvalCriteriaAndResults();
    }
  };

  const sendCommand = (prjCrtId: string, command: string) => {
    if (props.socket) {
      props.socket.send(JSON.stringify({ command, projectCriteriaId: prjCrtId }));
    }
  };

  const fetchPassEvalCriteriaAndResults = async () => {
    try {
      const [getCrtResponse, getResultsResponse] = await Promise.all([
        evaluationService.getPassCriteriasByProjectID(props.selectedProject.id),
        evaluationService.getPassEvalResultsByProjectId(props.selectedProject.id),
      ]);

      if (getCrtResponse.success && getResultsResponse.success) {
        // 하나의 함수 안에서 상태를 동기적으로 모두 업데이트
        setPassEvalCrts(getCrtResponse.result);
        setPassEvalResults(getResultsResponse.result);
      }
    } catch (error) {
      console.error('데이터 가져오기 오류:', error);
    }
  };

  const handleExecuteCriterias = async () => {
    // 분석 조건 수행 여부를 가져와서 재수행인지, 초기수행인지 알아온다.
    passEvalCrts.map((passEvalCrt) => {
      if (parseCriteriaState(passEvalCrt.state) === CRITERIA_STATE.NONE) {
        // 분석 수행
        sendCommand(passEvalCrt.id, 'START');
        setPassEvalCrts((prevData) =>
          prevData.map((prjCrt) =>
            prjCrt.id === passEvalCrt.id ? { ...prjCrt, state: CRITERIA_STATE.RUNNING } : prjCrt,
          ),
        );
        evaluationService.updateProjectCriteriaState(passEvalCrt.id, CRITERIA_STATE.RUNNING);
        // task 추가
        const newTask: TaskDto = {
          id: '',
          name: props.selectedProject.name + '/합격 여부 판정/' + passEvalCrt.criteriaName,
          startDate: '',
          endDate: '',
          status: 'Running',
          userName: '',
          userTeam: '',
        };
        startTask(newTask);
      }
      // 재수행 이라면
      else if (parseCriteriaState(passEvalCrt.state) === CRITERIA_STATE.PAUSED) {
        sendCommand(passEvalCrt.id, 'RESUME');
        setPassEvalCrts((prevData) =>
          prevData.map((prjCrt) =>
            prjCrt.id === passEvalCrt.id ? { ...prjCrt, state: CRITERIA_STATE.RUNNING } : prjCrt,
          ),
        );
        evaluationService.updateProjectCriteriaState(passEvalCrt.id, CRITERIA_STATE.RUNNING);
        // task 추가
        const newTask: TaskDto = {
          id: '',
          name: props.selectedProject.name + '/합격 여부 판정/' + passEvalCrt.criteriaName,
          startDate: '',
          endDate: '',
          status: 'Running',
          userName: '',
          userTeam: '',
        };
        startTask(newTask);
      }
      // 에러 상태 라면,
      else if (parseCriteriaState(passEvalCrt.state) === CRITERIA_STATE.ERROR) {
      }
    });
  };

  const saveProjectCriteria = async (newCrt: EvalProjectCriteriaDto) => {
    const response = await evaluationService.saveProjectCriteria(newCrt);
    return response.result;
  };

  // 문자열을 Enum 값으로 변환하는 함수
  const parseCriteriaState = (state: string): CRITERIA_STATE => {
    return CRITERIA_STATE[state as keyof typeof CRITERIA_STATE] || CRITERIA_STATE.NONE;
  };

  // 체크박스 상태 변경 이벤트 핸들러
  const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { checked } = event.target;
    props.selectedProject.passEvalEnabled = checked;
    setEvalEnabled(checked);
    // db save
    updatePassEvalEnabled(props.selectedProject.id, checked);
  };

  const updatePassEvalEnabled = async (projectId: string, enabled: boolean) => {
    await evaluationService.updatePassEvalEnabled(projectId, enabled);
  };

  // 조건 별 분석 버튼 클릭 핸들
  const handleAnalysisButton = (prjCrtId: string) => {
    // 분석 조건 수행 여부를 가져와서 재수행인지, 초기수행인지 알아온다.
    passEvalCrts.map((passEvalCrt) => {
      if (passEvalCrt.id === prjCrtId) {
        // 결과 삭제 버튼 클릭 시,
        if (parseCriteriaState(passEvalCrt.state) === CRITERIA_STATE.COMPLETE) {
          // 기존 분석 결과 제거
          deletePassEvalResultsByPrjCrtId(passEvalCrt);
          setPassEvalCrts((prevData) =>
            prevData.map((prjCrt) => (prjCrt.id === prjCrtId ? { ...prjCrt, state: CRITERIA_STATE.NONE } : prjCrt)),
          );
          evaluationService.updateProjectCriteriaState(prjCrtId, CRITERIA_STATE.NONE);
        }
        // 분석 수행 버튼 클릭 시,
        else if (parseCriteriaState(passEvalCrt.state) === CRITERIA_STATE.NONE) {
          // 분석 수행
          sendCommand(passEvalCrt.id, 'START');
          setPassEvalCrts((prevData) =>
            prevData.map((prjCrt) => (prjCrt.id === prjCrtId ? { ...prjCrt, state: CRITERIA_STATE.RUNNING } : prjCrt)),
          );
          evaluationService.updateProjectCriteriaState(prjCrtId, CRITERIA_STATE.RUNNING);
        }
        // 일시 정지 버튼 클릭 시,
        else if (parseCriteriaState(passEvalCrt.state) === CRITERIA_STATE.RUNNING) {
          sendCommand(passEvalCrt.id, 'PAUSE');
          setPassEvalCrts((prevData) =>
            prevData.map((prjCrt) => (prjCrt.id === prjCrtId ? { ...prjCrt, state: CRITERIA_STATE.PAUSED } : prjCrt)),
          );
          evaluationService.updateProjectCriteriaState(prjCrtId, CRITERIA_STATE.PAUSED);
        }
        // 재수행 이라면
        else if (parseCriteriaState(passEvalCrt.state) === CRITERIA_STATE.PAUSED) {
          sendCommand(passEvalCrt.id, 'RESUME');
          setPassEvalCrts((prevData) =>
            prevData.map((prjCrt) => (prjCrt.id === prjCrtId ? { ...prjCrt, state: CRITERIA_STATE.RUNNING } : prjCrt)),
          );
          evaluationService.updateProjectCriteriaState(prjCrtId, CRITERIA_STATE.RUNNING);
        }
        // 재수행 이라면
        else if (parseCriteriaState(passEvalCrt.state) === CRITERIA_STATE.ERROR) {
        }
      }
    });
  };

  const deletePassEvalResultsByPrjCrtId = async (prjCrt: EvalProjectCriteriaDto) => {
    setPassEvalResults((preResults) => preResults.filter((result) => result.criteriaId !== prjCrt.criteriaId));
    // db 삭제
    await evaluationService.deletePassEvalResultsByEvaluationProjectCriteriaId(prjCrt.id);
  };

  const handleRemoveCriteria = async (prjCrtId: string) => {
    // 조건 삭제
    setPassEvalCrts((prev) => prev.filter((data) => data.id !== prjCrtId));
    deleteProjectCriteria(prjCrtId);
  };

  const deleteProjectCriteria = async (prjCrtId: string) => {
    // 결과 데이터 삭제
    for (const prjCrt of passEvalCrts) {
      if (prjCrt.id === prjCrtId) {
        setPassEvalResults((prevResults) => prevResults.filter((result) => result.criteriaId !== prjCrt.criteriaId));
        // db 삭제
        await evaluationService.deletePassEvalResultsByEvaluationProjectCriteriaId(prjCrt.id);
        break;
      }
    }

    // projectCriteria 삭제 (결과 삭제가 끝난 후)
    await evaluationService.deleteProjectCriteria(prjCrtId);
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
    for (const prjCrt of passEvalCrts) {
      if (prjCrt.id === prjCrtId && prjCrt.state === CRITERIA_STATE.RUNNING) {
        return true;
      }
    }
    return false;
  };

  // table columns 설정
  const criteriaTableColumns = React.useMemo<ColumnDef<EvalProjectCriteriaDto>[]>(
    () => [
      {
        header: 'No',
        id: 'no',
        accessorFn: (row, index) => index + 1, // No 열을 1부터 1씩 증가하는 값으로 설정
        enableColumnFilter: false,
      },
      {
        // header: 'Criteria',
        header: '기준',
        id: 'name',
        accessorFn: (row) => row.criteriaName,
        cell: (info) => {
          const value = info.getValue() as string;
          return (
            <div className={styles.criteriaCell}>
              <p>{value}</p>
              <button className={styles.button}>Edit</button>
            </div>
          );
        },
      },
      {
        // header: 'Number of failed sections',
        header: '불합격 구간 개수',
        id: 'failedCount',
        accessorFn: (row) => {
          passEvalResults ? passEvalResults.filter((result) => result.criteriaId === row.criteriaId).length : 0;
        },
        cell: (info) => {
          const row = info.row.original;
          return (
            <p>
              {passEvalResults ? passEvalResults.filter((result) => result.criteriaId === row.criteriaId).length : 0}
            </p>
          );
        },
        enableColumnFilter: false,
        enableSorting: false,
      },
      {
        // header: 'Run Analysis',
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
        // header: 'Analysis Status',
        header: '분석 상태',
        id: 'state',
        accessorFn: (row) => row.state,
        cell: (info) => {
          const state = info.getValue<CRITERIA_STATE>();
          return <p>{state}</p>;
        },
        enableColumnFilter: false,
        enableSorting: false,
      },
      {
        // header: 'Delete',
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
    [passEvalCrts],
  );

  const passEvalResultTableColumns = React.useMemo<ColumnDef<PassEvalResultDto>[]>(
    () => [
      {
        header: 'No',
        id: 'no',
        accessorFn: (row, index) => index + 1, // No 열을 1부터 1씩 증가하는 값으로 설정
        enableColumnFilter: false,
      },
      {
        // header: 'Criteria',
        header: '기준',
        id: 'criteria',
        accessorFn: (row) => row.criteriaName,
        cell: (info) => info.getValue(),
        enableColumnFilter: true,
      },
      {
        // header: 'Failure start time',
        header: '불합격 시작 시간',
        id: 'failStartTime',
        accessorFn: (row) => row.failStartTime.replace('T', ' '),
        cell: (info) => {
          const row = info.row.original;
          return <p>{row.failStartTime.replace('T', ' ').split('.')[0].split(' ')[1]}</p>;
        },
        enableColumnFilter: true,
      },
      {
        // header: 'Failure end time',
        header: '불합격 종료 시간',
        id: 'failEndTime',
        accessorFn: (row) => row.failEndTime.replace('T', ' '),
        cell: (info) => {
          const row = info.row.original;
          return <p>{row.failEndTime.replace('T', ' ').split('.')[0].split(' ')[1]}</p>;
        },
        enableColumnFilter: true,
      },
      {
        // header: 'Message',
        header: '메시지',
        id: 'failMessage',
        accessorFn: (row) => row.failMessage,
        cell: (info) => info.getValue(),
        enableColumnFilter: true,
      },
      {
        // header: 'Visualization',
        header: '시각화',
        id: 'runViz',
        cell: (info) => {
          const row = info.row.original;
          return <button data-pdf-exclude="true">시각화</button>;
        },
        enableColumnFilter: false,
        enableSorting: false,
      },
    ],
    [passEvalResults],
  );

  const handleAddCriterias = async () => {
    // 파일 선택 모달 출력
    handleClickModalOpen();
  };

  const handleClickClose = () => {
    // 모달을 Cancel했을 때 해야할 로직이 있다면 추가
    // 후에 반드시 모달을 닫는 메서드 호출
    handleClickModalClose();
  };

  const handleClickConfirm = async (savedCriteriaDtos: CriteriaDto[] | null) => {
    if (savedCriteriaDtos) {
      // project criteria 만들어서 저장하기
      for (const savedCriteriaDto of savedCriteriaDtos) {
        // 동일한 조건이 이미 추가되어있는지 확인
        if (!passEvalCrts.some((crt) => crt.criteriaId === savedCriteriaDto.id)) {
          const newDto: EvalProjectCriteriaDto = {
            id: '',
            createdAt: new Date().toISOString(),
            projectId: props.selectedProject.id,
            criteriaId: savedCriteriaDto.id,
            criteriaName: savedCriteriaDto.name,
            state: CRITERIA_STATE.NONE,
            tagColor: '#ffffff',
            type: CRITERIA_TYPE.PASS,
          };
          // DB Save
          const savedProjectCriteriaDto = await saveProjectCriteria(newDto);
          setPassEvalCrts((prev) => [...prev, savedProjectCriteriaDto]);
        }
      }
      // 모달 닫기
      handleClickModalClose();
    }
    // other type
    else {
      // 모달 닫기
      handleClickModalClose();
    }
  };

  return (
    <>
      {isOpen && (
        <CriteriaSettingsModal
          title="불합격 기준 설정"
          // title="Setting failure criteria"
          description="불합격 판정을 위한 기준을 설정합니다."
          // description="Sets criteria for determining failure."
          onClose={handleClickClose}
          onConfirm={handleClickConfirm}
          selectedProject={props.selectedProject}
          isCuration={false}
        />
      )}
      <div className={styles.projectContent}>
        <div>
          <input type="checkbox" checked={evalEnabled} onChange={handleCheckboxChange} />
          합격 여부 판정
        </div>
        {evalEnabled && (
          <>
            <div className={styles.subContentTopLayout}>
              {hasEvaluatedCriteria && (
                <div className={styles.passEvalResultContentLayout}>
                  <div className={styles.subContentLayout}>
                    <p className={styles.subcontentTitle}>판정 결과</p>
                    <p
                      className={`${styles.passEvalResultContent} ${passEvalResults.length === 0 ? styles.pass : styles.fail}`}
                    >
                      {passEvalResults.length === 0 ? '합격' : '불합격'}
                    </p>
                  </div>
                </div>
              )}
              <div className={styles.projectSubContent}>
                <div className={styles.subContentLayout}>
                  <div className={styles.subContentHeader}>
                    <p className={styles.subcontentTitle}>불합격 기준 - total : {passEvalCrts.length}</p>
                    <button style={{ marginLeft: 10 }} data-pdf-exclude="true" onClick={handleAddCriterias}>
                      기준 추가
                    </button>
                    <button style={{ marginLeft: 10 }} data-pdf-exclude="true" onClick={handleExecuteCriterias}>
                      전체 분석 하기
                    </button>
                  </div>
                  <TableComponent columns={criteriaTableColumns} data={passEvalCrts} />
                </div>
              </div>
            </div>
            {passEvalResults.length !== 0 && (
              <div className={styles.projectSubContent}>
                <div className={styles.subContentLayout}>
                  <div className={styles.subContentHeader}>
                    <p className={styles.subcontentTitle}>불합격 결과 - total : {passEvalResults.length}</p>
                  </div>
                  <TableComponent columns={passEvalResultTableColumns} data={passEvalResults} />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
