import React, { useEffect, useMemo, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { BarChart, Bar, Rectangle, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import {
  CRITERIA_TYPE,
  EvalProjectCriteriaDto,
  EvalProjectDto,
  ScoreEvalResultDto,
  CRITERIA_STATE,
} from '../../../../types/analysis';
import styles from './index.module.scss';
import TableComponent from '@/components/common/Table';
import evaluationService from '@/apis/services/evaluationService';
import useModal from '@/hooks/useModal';
import { CriteriaDto } from '@/types/criteria';
import CriteriaSettingsModal from '@/components/shared/CriteriaSettingsModal';

interface Props {
  selectedProject: EvalProjectDto;
  socket: WebSocket | null;
  webSocketMessage: { timestamp: number; payload: any } | null;
}

interface ScoreStatistic {
  name: string;
  min: number;
  max: number;
  avg: number;
}

export default function ScoreEvalComponent(props: Props) {
  // 판정 여부 (체크박스 상태 저장)
  const [evalEnabled, setEvalEnabled] = useState<boolean>(false);
  // 점수 산정 조건 행
  const [scoreEvalCrts, setScoreEvalCrts] = React.useState<EvalProjectCriteriaDto[]>([]);
  // 점수 산정 조건 수행 결과
  const [scoreEvalResults, setScoreEvalResults] = useState<ScoreEvalResultDto[]>([]);
  // 점수 산정 결과 통계 데이터
  const [scoreStatisticDatas, setScoreStatisticDatas] = useState<ScoreStatistic[]>([]);
  // 기준 설정 모달 관련 훅
  const [isOpen, handleClickModalOpen, handleClickModalClose] = useModal();

  // props가 변경될때마다 관리 데이터 재설정
  useEffect(() => {
    setEvalEnabled(props.selectedProject.scoreEvalEnabled);
    fetchScoreEvalCriteriaAndResults();
  }, [props.selectedProject]);

  useEffect(() => {
    handleWebSocketMessage();
  }, [props.webSocketMessage]);

  // 점수 통계 계산 Effect
  useEffect(() => {
    if (scoreEvalResults.length === 0) return;

    // 점수 통계 계산
    const scoreMap = new Map<string, number[]>();

    scoreEvalResults.forEach((result) => {
      const name = result.criteriaName;
      if (!scoreMap.has(name)) {
        scoreMap.set(name, []);
      }
      scoreMap.get(name)?.push(result.score); // 기존 값에 추가
    });

    // 통계 계산
    const statistics: ScoreStatistic[] = [];
    scoreMap.forEach((values, name) => {
      const min = Math.min(...values);
      const max = Math.max(...values);
      const avg = values.reduce((acc, curr) => acc + curr, 0) / values.length;
      statistics.push({ name, min, max, avg });
    });

    setScoreStatisticDatas(statistics);
  }, [scoreEvalResults]); // scoreEvalResults 변경될 때마다 실행

  const handleWebSocketMessage = async () => {
    const data = props.webSocketMessage?.payload;
    console.log('SCORE COMP 서버 메세지 도착 : ' + data.message);

    if (data.message === 'NEW_SCORE_EVAL_RESULT') {
      // 분석 결과 발생 시, db result fetch
      await fetchScoreEvalCriteriaAndResults();
    } else if (data.message === 'SCORE_EVAL_COMPLETED') {
      await evaluationService.updateProjectCriteriaState(data.projectCriteriaId, CRITERIA_STATE.COMPLETE);
      setScoreEvalCrts((prevData) => {
        const updatedData = prevData.map((prjCrt) =>
          prjCrt.id === data.projectCriteriaId
            ? { ...prjCrt, state: CRITERIA_STATE.COMPLETE } // 새로운 객체 생성
            : prjCrt,
        );

        return [...updatedData]; // 배열 자체를 새로운 참조로 변경
      });
      await fetchScoreEvalCriteriaAndResults();
    }
  };

  const sendCommand = (prjCrtId: string, command: string) => {
    if (props.socket) {
      props.socket.send(JSON.stringify({ command, projectCriteriaId: prjCrtId }));
    }
  };

  const fetchScoreEvalCriteriaAndResults = async () => {
    try {
      const [getCrtResponse, getResultsResponse] = await Promise.all([
        evaluationService.getScoreCriteriasByProjectID(props.selectedProject.id),
        evaluationService.getScoreEvalResultsByProjectId(props.selectedProject.id),
      ]);

      if (getCrtResponse.success && getResultsResponse.success) {
        // 하나의 함수 안에서 상태를 동기적으로 모두 업데이트
        setScoreEvalCrts(getCrtResponse.result);
        setScoreEvalResults(getResultsResponse.result);
      }
    } catch (error) {
      console.error('데이터 가져오기 오류:', error);
    }
  };

  const handleExecuteCriterias = async () => {
    // 분석 조건 수행 여부를 가져와서 재수행인지, 초기수행인지 알아온다.
    scoreEvalCrts.map((scoreEvalCrt) => {
      if (parseCriteriaState(scoreEvalCrt.state) === CRITERIA_STATE.NONE) {
        // 분석 수행
        sendCommand(scoreEvalCrt.id, 'START');
        setScoreEvalCrts((prevData) =>
          prevData.map((prjCrt) =>
            prjCrt.id === scoreEvalCrt.id ? { ...prjCrt, state: CRITERIA_STATE.RUNNING } : prjCrt,
          ),
        );
        evaluationService.updateProjectCriteriaState(scoreEvalCrt.id, CRITERIA_STATE.RUNNING);
      }
      // 재수행 이라면
      else if (parseCriteriaState(scoreEvalCrt.state) === CRITERIA_STATE.PAUSED) {
        sendCommand(scoreEvalCrt.id, 'RESUME');
        setScoreEvalCrts((prevData) =>
          prevData.map((prjCrt) =>
            prjCrt.id === scoreEvalCrt.id ? { ...prjCrt, state: CRITERIA_STATE.RUNNING } : prjCrt,
          ),
        );
        evaluationService.updateProjectCriteriaState(scoreEvalCrt.id, CRITERIA_STATE.RUNNING);
      }
      // 재수행 이라면
      else if (parseCriteriaState(scoreEvalCrt.state) === CRITERIA_STATE.ERROR) {
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
    props.selectedProject.scoreEvalEnabled = checked;
    setEvalEnabled(checked);
    // db save
    updateEvalEnabled(props.selectedProject.id, checked);
  };

  const updateEvalEnabled = async (projectId: string, enabled: boolean) => {
    await evaluationService.updateScoreEvalEnabled(projectId, enabled);
  };

  // 조건 별 분석 버튼 클릭 핸들
  const handleAnalysisButton = (prjCrtId: string) => {
    // 분석 조건 수행 여부를 가져와서 재수행인지, 초기수행인지 알아온다.
    scoreEvalCrts.map((scoreEvalCrt) => {
      if (scoreEvalCrt.id === prjCrtId) {
        // 분석 수행이 이미 되었다면,
        if (scoreEvalCrt.state === CRITERIA_STATE.COMPLETE) {
          // 기존 분석 결과 제거
          deleteScoreEvalResultsByPrjCrtId(scoreEvalCrt);
          setScoreEvalCrts((prevData) =>
            prevData.map((prjCrt) => (prjCrt.id === prjCrtId ? { ...prjCrt, state: CRITERIA_STATE.NONE } : prjCrt)),
          );
          evaluationService.updateProjectCriteriaState(prjCrtId, CRITERIA_STATE.NONE);
        }
        // 분석 수행 버튼 클릭 시,
        else if (scoreEvalCrt.state === CRITERIA_STATE.NONE) {
          // 분석 수행
          sendCommand(scoreEvalCrt.id, 'START');
          setScoreEvalCrts((prevData) =>
            prevData.map((prjCrt) => (prjCrt.id === prjCrtId ? { ...prjCrt, state: CRITERIA_STATE.RUNNING } : prjCrt)),
          );
          evaluationService.updateProjectCriteriaState(prjCrtId, CRITERIA_STATE.RUNNING);
        }
        // 일시 정지 버튼 클릭 시,
        else if (parseCriteriaState(scoreEvalCrt.state) === CRITERIA_STATE.RUNNING) {
          sendCommand(scoreEvalCrt.id, 'PAUSE');
          setScoreEvalCrts((prevData) =>
            prevData.map((prjCrt) => (prjCrt.id === prjCrtId ? { ...prjCrt, state: CRITERIA_STATE.PAUSED } : prjCrt)),
          );
          evaluationService.updateProjectCriteriaState(prjCrtId, CRITERIA_STATE.PAUSED);
        }
        // 재수행 이라면
        else if (parseCriteriaState(scoreEvalCrt.state) === CRITERIA_STATE.PAUSED) {
          sendCommand(scoreEvalCrt.id, 'RESUME');
          setScoreEvalCrts((prevData) =>
            prevData.map((prjCrt) => (prjCrt.id === prjCrtId ? { ...prjCrt, state: CRITERIA_STATE.RUNNING } : prjCrt)),
          );
          evaluationService.updateProjectCriteriaState(prjCrtId, CRITERIA_STATE.RUNNING);
        }
        // 재수행 이라면
        else if (parseCriteriaState(scoreEvalCrt.state) === CRITERIA_STATE.ERROR) {
        }
      }
    });
  };
  const deleteScoreEvalResultsByPrjCrtId = async (prjCrt: EvalProjectCriteriaDto) => {
    setScoreEvalResults((preResults) => preResults.filter((result) => result.criteriaId !== prjCrt.criteriaId));
    // db 삭제
    await evaluationService.deleteScoreEvalResultsByEvaluationProjectCriteriaId(prjCrt.id);
  };

  const handleRemoveCriteria = (projectCriteriaId: string) => {
    setScoreEvalCrts((prev) => prev.filter((data) => data.id !== projectCriteriaId));
    deleteProjectCriteria(projectCriteriaId);
  };

  const deleteProjectCriteria = async (prjCrtId: string) => {
    // 결과 데이터 삭제
    for (const prjCrt of scoreEvalCrts) {
      if (prjCrt.id === prjCrtId) {
        setScoreEvalResults((prevResults) => prevResults.filter((result) => result.criteriaId !== prjCrt.criteriaId));
        // db 삭제
        await evaluationService.deleteScoreEvalResultsByEvaluationProjectCriteriaId(prjCrt.id);
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
    for (const prjCrt of scoreEvalCrts) {
      if (prjCrt.id === prjCrtId && prjCrt.state === CRITERIA_STATE.RUNNING) {
        return true;
      }
    }
    return false;
  };

  // table columns 설정
  const criteriaTableColumns = useMemo<ColumnDef<EvalProjectCriteriaDto>[]>(
    () => [
      {
        header: 'No',
        id: 'no',
        accessorFn: (row, index) => index + 1, // No 열을 1부터 1씩 증가하는 값으로 설정
        enableColumnFilter: false,
      },
      {
        header: '기준',
        id: 'name',
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
        header: '점수산정 구간 개수',
        id: 'scoreCount',
        accessorFn: (row) => row.criteriaName,
        cell: (info) => {
          const row = info.row.original;
          return (
            <p>
              {scoreEvalResults ? scoreEvalResults.filter((result) => result.criteriaId === row.criteriaId).length : 0}
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
    [scoreEvalCrts],
  );

  const ScoreEvalResultTableColumns = useMemo<ColumnDef<ScoreEvalResultDto>[]>(
    () => [
      {
        header: 'No',
        id: 'no',
        accessorFn: (row, index) => index + 1, // No 열을 1부터 1씩 증가하는 값으로 설정
        enableColumnFilter: false,
      },
      {
        header: '기준',
        id: 'criteria',
        accessorFn: (row) => row.criteriaName,
        cell: (info) => info.getValue(),
        enableColumnFilter: true,
      },
      {
        header: '점수 산정 시작 시간',
        id: 'startTime',
        accessorFn: (row) => row.startTime.replace('T', ' '),
        cell: (info) => {
          const row = info.row.original;
          return <p>{row.startTime.replace('T', ' ').split('.')[0].split(' ')[1]}</p>;
        },
        enableColumnFilter: true,
      },
      {
        header: '점수 산정 종료 시간',
        id: 'endTime',
        accessorFn: (row) => row.endTime.replace('T', ' '),
        cell: (info) => {
          const row = info.row.original;
          return <p>{row.endTime.replace('T', ' ').split('.')[0].split(' ')[1]}</p>;
        },
        enableColumnFilter: true,
      },
      {
        header: '점수',
        id: 'score',
        accessorFn: (row) => row.score,
        cell: (info) => info.getValue(),
        enableColumnFilter: true,
      },
      {
        header: '메시지',
        id: 'message',
        accessorFn: (row) => row.message,
        cell: (info) => info.getValue(),
        enableColumnFilter: true,
      },
      {
        header: '시각화',
        id: 'runViz',
        accessorFn: (row) => row.id,
        cell: (info) => {
          const row = info.row.original;
          return <button>시각화</button>;
        },
        enableColumnFilter: false,
        enableSorting: false,
      },
    ],
    [scoreEvalResults],
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
        if (!scoreEvalCrts.some((crt) => crt.criteriaId === savedCriteriaDto.id)) {
          const newDto: EvalProjectCriteriaDto = {
            id: '',
            createdAt: new Date().toISOString(),
            projectId: props.selectedProject.id,
            criteriaId: savedCriteriaDto.id,
            criteriaName: savedCriteriaDto.name,
            state: CRITERIA_STATE.NONE,
            tagColor: '#ffffff',
            type: CRITERIA_TYPE.SCORE,
          };
          // DB Save
          const savedProjectCriteriaDto = await saveProjectCriteria(newDto);
          setScoreEvalCrts((prev) => [...prev, savedProjectCriteriaDto]);
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
          title="점수 산정 기준 설정"
          description="점수 산정을 위한 기준을 설정합니다."
          onClose={handleClickClose}
          onConfirm={handleClickConfirm}
          selectedProject={props.selectedProject}
          isCuration={false}
        />
      )}
      <div className={styles.projectContent}>
        <div>
          <input type="checkbox" checked={evalEnabled} onChange={handleCheckboxChange} />
          점수 산정
        </div>
        {evalEnabled && (
          <>
            <div className={styles.subContentTopLayout}>
              {scoreEvalResults.length !== 0 && (
                <div className={styles.scoreEvalResultContentLayout}>
                  <div className={styles.subContentLayout}>
                    <p className={styles.barChartTitle}>판정 결과</p>
                    <ResponsiveContainer className={styles.BarChartContainer}>
                      <BarChart className={styles.BarChart} data={scoreStatisticDatas}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#2c2c2c', // 다크모드에 어울리는 어두운 배경색
                            border: '1px solid #888',
                            borderRadius: '8px',
                            color: '#fff', // 텍스트 밝게!
                          }}
                        />
                        <Legend />
                        <Bar dataKey="min" fill="#4FC3F7" activeBar={<Rectangle fill="pink" stroke="blue" />} />
                        <Bar dataKey="max" fill="#EF5350" activeBar={<Rectangle fill="gold" stroke="purple" />} />
                        <Bar dataKey="avg" fill="#81C784" activeBar={<Rectangle fill="gold" stroke="purple" />} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
              <div className={styles.projectSubContent}>
                <div className={styles.subContentLayout}>
                  <div className={styles.subContentHeader}>
                    <p className={styles.subcontentTitle}>점수 산정 기준 - total : {scoreEvalCrts.length}</p>
                    <button style={{ marginLeft: 10 }} data-pdf-exclude="true" onClick={handleAddCriterias}>
                      기준 추가
                    </button>
                    <button style={{ marginLeft: 10 }} data-pdf-exclude="true" onClick={handleExecuteCriterias}>
                      전체 분석 하기
                    </button>
                  </div>
                  <TableComponent columns={criteriaTableColumns} data={scoreEvalCrts} />
                </div>
              </div>
            </div>
            {scoreEvalResults.length !== 0 && (
              <div className={styles.projectSubContent}>
                <div className={styles.subContentLayout}>
                  <div className={styles.subContentHeader}>
                    <p className={styles.subcontentTitle}>점수 산정 결과 - total : {scoreEvalResults.length}</p>
                  </div>
                  <TableComponent columns={ScoreEvalResultTableColumns} data={scoreEvalResults} />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
