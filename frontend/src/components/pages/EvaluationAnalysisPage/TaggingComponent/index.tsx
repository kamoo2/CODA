import React, { useEffect, useMemo, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { SketchPicker, ColorResult } from 'react-color';
import { createPortal } from 'react-dom';
import {
  CRITERIA_TYPE,
  EvalProjectCriteriaDto,
  EvalProjectDto,
  TaggingResultDto,
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

interface TagStatistic {
  name: string;
  value: number;
  color: string;
}

interface PieChartLabel {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percent: number;
  index: number;
}

const RADIAN = Math.PI / 180;

const renderCustomizedLabel = (labelData: PieChartLabel) => {
  const radius = labelData.innerRadius + (labelData.outerRadius - labelData.innerRadius) * 0.5;
  const x = labelData.cx + radius * Math.cos(-labelData.midAngle * RADIAN);
  const y = labelData.cy + radius * Math.sin(-labelData.midAngle * RADIAN);

  return (
    <text x={x} y={y} fill="#f0f0f0" textAnchor={x > labelData.cx ? 'start' : 'end'} dominantBaseline="central">
      {`${(labelData.percent * 100).toFixed(0)}%`}
    </text>
  );
};

export default function TaggingComponent(props: Props) {
  // 판정 여부 (체크박스 상태 저장)
  const [evalEnabled, setEvalEnabled] = useState<boolean>(false);
  // 태깅 기준
  const [taggingCrts, setTaggingCrts] = React.useState<EvalProjectCriteriaDto[]>([]);
  // 태깅 기준 수행 결과
  const [taggingResults, setTaggingResults] = useState<TaggingResultDto[]>([]);
  // 선택된 row에 color picker를 띄우기 위해 저장
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  // 태깅 결과 통계 데이터
  const [tagStatisticDatas, setTagStatisticDatas] = useState<TagStatistic[]>([]);
  const [positions, setPositions] = useState<Map<string, { top: number; left: number }>>(new Map());
  // 기준 설정 모달 관련 훅
  const [isOpen, handleClickModalOpen, handleClickModalClose] = useModal();

  // props가 변경될때마다 관리 데이터 재설정
  useEffect(() => {
    setEvalEnabled(props.selectedProject.taggingEnabled);
    fetchTaggingCriteriaAndResults();
  }, [props.selectedProject]);

  useEffect(() => {
    handleWebSocketMessage();
  }, [props.webSocketMessage]);

  // tagging 결과 업데이트 시, 태깅 결과 통계 계산
  useEffect(() => {
    if (taggingResults.length === 0) return;

    const tagCountMap = new Map<string, number>();
    const tagColorMap = new Map<string, string>();
    taggingResults.forEach((result) => {
      const name = result.criteriaName;
      const color = result.color;
      if (!tagCountMap.has(name)) {
        tagCountMap.set(name, 1);
        tagColorMap.set(name, color);
      } else {
        const preCount = tagCountMap.get(name) as number;
        tagCountMap.set(name, preCount + 1);
      }
    });

    const statistics: TagStatistic[] = [];
    tagCountMap.forEach((count, name) => {
      const color = tagColorMap.get(name) as string;
      statistics.push({ name, value: count, color });
    });

    setTagStatisticDatas(statistics);
  }, [taggingResults]);

  // 외부 클릭 감지해서 컬러 피커 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!(event.target as HTMLElement).closest('.color-picker-container')) {
        setSelectedRowId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleWebSocketMessage = async () => {
    const data = props.webSocketMessage?.payload;
    console.log('Tagging COMP 서버 메세지 도착 : ' + data.message);

    if (data.message === 'NEW_TAGGING_RESULT') {
      // 분석 결과 발생 시, db result fetch
      await fetchTaggingCriteriaAndResults();
    } else if (data.message === 'TAGGING_COMPLETED') {
      await evaluationService.updateProjectCriteriaState(data.projectCriteriaId, CRITERIA_STATE.COMPLETE);
      setTaggingCrts((prevData) => {
        const updatedData = prevData.map((prjCrt) =>
          prjCrt.id === data.projectCriteriaId
            ? { ...prjCrt, state: CRITERIA_STATE.COMPLETE } // 새로운 객체 생성
            : prjCrt,
        );

        return [...updatedData]; // 배열 자체를 새로운 참조로 변경
      });
      await fetchTaggingCriteriaAndResults();
    }
  };

  const sendCommand = (prjCrtId: string, command: string) => {
    if (props.socket) {
      props.socket.send(JSON.stringify({ command, projectCriteriaId: prjCrtId }));
    }
  };

  const fetchTaggingCriteriaAndResults = async () => {
    try {
      const [getCrtResponse, getResultsResponse] = await Promise.all([
        evaluationService.getTaggingCriteriasByProjectID(props.selectedProject.id),
        evaluationService.getTaggingResultsByProjectId(props.selectedProject.id),
      ]);

      if (getCrtResponse.success && getResultsResponse.success) {
        // 하나의 함수 안에서 상태를 동기적으로 모두 업데이트
        setTaggingCrts(getCrtResponse.result);
        setTaggingResults(getResultsResponse.result);
      }
    } catch (error) {
      console.error('데이터 가져오기 오류:', error);
    }
  };

  const handleExecuteCriterias = async () => {
    // 분석 조건 수행 여부를 가져와서 재수행인지, 초기수행인지 알아온다.
    taggingCrts.map((taggingCrt) => {
      if (parseCriteriaState(taggingCrt.state) === CRITERIA_STATE.NONE) {
        // 분석 수행
        sendCommand(taggingCrt.id, 'START');
        setTaggingCrts((prevData) =>
          prevData.map((prjCrt) =>
            prjCrt.id === taggingCrt.id ? { ...prjCrt, state: CRITERIA_STATE.RUNNING } : prjCrt,
          ),
        );
        evaluationService.updateProjectCriteriaState(taggingCrt.id, CRITERIA_STATE.RUNNING);
      }
      // 재수행 이라면
      else if (parseCriteriaState(taggingCrt.state) === CRITERIA_STATE.PAUSED) {
        sendCommand(taggingCrt.id, 'RESUME');
        setTaggingCrts((prevData) =>
          prevData.map((prjCrt) =>
            prjCrt.id === taggingCrt.id ? { ...prjCrt, state: CRITERIA_STATE.RUNNING } : prjCrt,
          ),
        );
        evaluationService.updateProjectCriteriaState(taggingCrt.id, CRITERIA_STATE.RUNNING);
      }
      // 재수행 이라면
      else if (parseCriteriaState(taggingCrt.state) === CRITERIA_STATE.ERROR) {
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
    props.selectedProject.taggingEnabled = checked;
    setEvalEnabled(checked);
    // db save
    updateTaggingEnabled(props.selectedProject.id, checked);
  };

  const updateTaggingEnabled = async (projectId: string, enabled: boolean) => {
    await evaluationService.updateTaggingEnabled(projectId, enabled);
  };

  // 조건 별 분석 버튼 클릭 핸들
  const handleAnalysisButton = (prjCrtId: string) => {
    // 분석 조건 수행 여부를 가져와서 재수행인지, 초기수행인지 알아온다.
    taggingCrts.map((taggingCrt) => {
      if (taggingCrt.id === prjCrtId) {
        // 분석 수행이 이미 되었다면,
        if (taggingCrt.state === CRITERIA_STATE.COMPLETE) {
          // 기존 분석 결과 제거
          deleteTaggingResultsByPrjCrtId(taggingCrt);
          setTaggingCrts((prevData) =>
            prevData.map((prjCrt) => (prjCrt.id === prjCrtId ? { ...prjCrt, state: CRITERIA_STATE.NONE } : prjCrt)),
          );
          evaluationService.updateProjectCriteriaState(prjCrtId, CRITERIA_STATE.NONE);
        }
        // 분석 수행 버튼 클릭 시,
        else if (taggingCrt.state === CRITERIA_STATE.NONE) {
          // 분석 수행
          sendCommand(taggingCrt.id, 'START');
          setTaggingCrts((prevData) =>
            prevData.map((prjCrt) => (prjCrt.id === prjCrtId ? { ...prjCrt, state: CRITERIA_STATE.RUNNING } : prjCrt)),
          );
          evaluationService.updateProjectCriteriaState(prjCrtId, CRITERIA_STATE.RUNNING);
        }
        // 일시 정지 버튼 클릭 시,
        else if (parseCriteriaState(taggingCrt.state) === CRITERIA_STATE.RUNNING) {
          sendCommand(taggingCrt.id, 'PAUSE');
          setTaggingCrts((prevData) =>
            prevData.map((prjCrt) => (prjCrt.id === prjCrtId ? { ...prjCrt, state: CRITERIA_STATE.PAUSED } : prjCrt)),
          );
          evaluationService.updateProjectCriteriaState(prjCrtId, CRITERIA_STATE.PAUSED);
        }
        // 재수행 이라면
        else if (parseCriteriaState(taggingCrt.state) === CRITERIA_STATE.PAUSED) {
          sendCommand(taggingCrt.id, 'RESUME');
          setTaggingCrts((prevData) =>
            prevData.map((prjCrt) => (prjCrt.id === prjCrtId ? { ...prjCrt, state: CRITERIA_STATE.RUNNING } : prjCrt)),
          );
          evaluationService.updateProjectCriteriaState(prjCrtId, CRITERIA_STATE.RUNNING);
        }
        // 재수행 이라면
        else if (parseCriteriaState(taggingCrt.state) === CRITERIA_STATE.ERROR) {
        }
      }
    });
  };

  const deleteTaggingResultsByPrjCrtId = async (prjCrt: EvalProjectCriteriaDto) => {
    setTaggingResults((preResults) => preResults.filter((result) => result.criteriaId !== prjCrt.criteriaId));
    // db 삭제
    await evaluationService.deleteTaggingResultsByEvaluationProjectCriteriaId(prjCrt.id);
  };

  const handleRemoveCriteria = (projectCriteriaId: string) => {
    setTaggingCrts((prev) => prev.filter((data) => data.id !== projectCriteriaId));
    deleteProjectCriteria(projectCriteriaId);
  };

  const deleteProjectCriteria = async (prjCrtId: string) => {
    // 결과 데이터 삭제
    for (const prjCrt of taggingCrts) {
      if (prjCrt.id === prjCrtId) {
        setTaggingResults((prevResults) => prevResults.filter((result) => result.criteriaId !== prjCrt.criteriaId));
        // db 삭제
        await evaluationService.deleteTaggingResultsByEvaluationProjectCriteriaId(prjCrt.id);
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
    for (const prjCrt of taggingCrts) {
      if (prjCrt.id === prjCrtId && prjCrt.state === CRITERIA_STATE.RUNNING) {
        return true;
      }
    }
    return false;
  };

  // 태깅 조건 테이블 열 구정
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
        header: '태깅 색상',
        id: 'tagColor',
        accessorFn: (row) => row.tagColor,
        cell: (info) => {
          const row = info.row.original;
          const color = row.tagColor;
          return (
            <div>
              <button
                id={`color-button-${row.id}`} // 🔥 개별 버튼 ID
                className={styles.tagColorButton}
                style={{ backgroundColor: color }}
                onClick={(e) => handleColorButtonClick(row.id, e)}
              />
              {/* 컬러 피커 (해당 행에만 표시) */}
              {selectedRowId === row.id &&
                positions.has(row.id) &&
                createPortal(
                  <div
                    className="color-picker-container"
                    style={{
                      position: 'absolute',
                      top: positions.get(row.id)?.top ?? 0,
                      left: positions.get(row.id)?.left ?? 0,
                    }}
                  >
                    <SketchPicker
                      color={color}
                      onChange={(newColor: ColorResult) => {
                        handleTagColorChange(row, newColor.hex);
                      }}
                    />
                  </div>,
                  document.body,
                )}
            </div>
          );
        },
        enableColumnFilter: false,
        enableSorting: false,
      },
      {
        header: '태깅 개수',
        id: 'taggingCount',
        accessorFn: (row) => {
          taggingResults ? taggingResults.filter((result) => result.criteriaId === row.criteriaId).length : 0;
        },
        cell: (info) => {
          const row = info.row.original;
          return (
            <p>{taggingResults ? taggingResults.filter((result) => result.criteriaId === row.criteriaId).length : 0}</p>
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
            <button
              className={styles.button}
              onClick={() => handleAnalysisButton(row.id)}
              disabled={isDeleteCrtDisabled(state)}
            >
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
    [taggingCrts, selectedRowId],
  );

  // 마크 색상 변경 버튼 핸들
  const handleColorButtonClick = (rowId: string, e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setSelectedRowId((prev) => {
      const newSelected = prev === rowId ? null : rowId;
      if (newSelected) updatePickerPosition(rowId);
      return newSelected;
    });
  };

  // 버튼 위치를 기반으로 컬러 피커 위치 업데이트
  const updatePickerPosition = (rowId: string) => {
    const buttonElement = document.getElementById(`color-button-${rowId}`) as HTMLButtonElement;
    if (!buttonElement) return;

    const buttonRect = buttonElement.getBoundingClientRect();
    const pickerHeight = 200; // 기본 높이 설정 (대략 200px)

    setPositions((prev) => {
      const newPositions = new Map(prev);
      newPositions.set(rowId, {
        top: buttonRect.top + window.scrollY - pickerHeight - 8, // 버튼 위쪽
        left: buttonRect.right + window.scrollX + 8, // 버튼 정렬
      });
      return newPositions;
    });
  };

  // 컬러 피커에서 색상 선택 시 적용할 핸들
  const handleTagColorChange = (crt: EvalProjectCriteriaDto, color: string) => {
    setTaggingCrts((prev) => prev.map((preCrt) => (preCrt.id === crt.id ? { ...preCrt, tagColor: color } : preCrt)));
    setTaggingResults((prev) =>
      prev.map((preResult) => (preResult.criteriaId === crt.criteriaId ? { ...preResult, color } : preResult)),
    );
    // db save
    updateTagColor(crt.id, color);
  };

  const updateTagColor = async (crtId: string, color: string) => {
    // tag 색상 변경
    await evaluationService.updateTagColor(crtId, color);
  };

  // 태깅 결과 테이블 열 구성
  const TaggingResultTableColumns = React.useMemo<ColumnDef<TaggingResultDto>[]>(
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
        header: '태깅 시작 시간',
        id: 'startTime',
        accessorFn: (row) => row.startTime.replace('T', ' '),
        cell: (info) => {
          const row = info.row.original;
          return <p>{row.startTime.replace('T', ' ').split('.')[0].split(' ')[1]}</p>;
        },
        enableColumnFilter: true,
      },
      {
        header: '태깅 종료 시간',
        id: 'endTime',
        accessorFn: (row) => row.endTime.replace('T', ' '),
        cell: (info) => {
          const row = info.row.original;
          return <p>{row.endTime.replace('T', ' ').split('.')[0].split(' ')[1]}</p>;
        },
        enableColumnFilter: true,
      },
      {
        header: '태깅 색상',
        id: 'color',
        accessorFn: (row) => row.color,
        cell: (info) => {
          const row = info.row.original;
          const color = row.color;
          return <button className={styles.tagColorButton} style={{ backgroundColor: color }} />;
        },
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
    [taggingResults],
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
        if (!taggingCrts.some((crt) => crt.criteriaId === savedCriteriaDto.id)) {
          const newDto: EvalProjectCriteriaDto = {
            id: '',
            createdAt: new Date().toISOString(),
            projectId: props.selectedProject.id,
            criteriaId: savedCriteriaDto.id,
            criteriaName: savedCriteriaDto.name,
            state: CRITERIA_STATE.NONE,
            tagColor: '#ffffff',
            type: CRITERIA_TYPE.TAGGING,
          };
          // DB Save
          const savedProjectCriteriaDto = await saveProjectCriteria(newDto);
          setTaggingCrts((prev) => [...prev, savedProjectCriteriaDto]);
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
          title="태깅 기준 설정"
          description="태깅을 위한 기준을 설정합니다."
          onClose={handleClickClose}
          onConfirm={handleClickConfirm}
          selectedProject={props.selectedProject}
          isCuration={false}
        />
      )}
      <div className={styles.projectContent}>
        <div>
          <input type="checkbox" checked={evalEnabled} onChange={handleCheckboxChange} />
          태깅
        </div>
        {evalEnabled && (
          <>
            <div className={styles.subContentTopLayout}>
              {taggingResults.length !== 0 && (
                <div className={styles.scoreEvalResultContentLayout}>
                  <div className={styles.subContentLayout}>
                    <p className={styles.pieChartTitle}>태깅 통계</p>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={tagStatisticDatas}
                          labelLine={false}
                          cx="50%"
                          cy="50%"
                          label={renderCustomizedLabel}
                          dataKey="value"
                        >
                          {tagStatisticDatas.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#2c2c2c', // 다크모드에 어울리는 어두운 배경색
                            border: '1px solid #888',
                            borderRadius: '8px',
                            color: '#fff', // 텍스트 밝게!
                          }}
                          itemStyle={{ color: '#fff' }} // 텍스트 색상 변경
                          labelStyle={{ color: '#aaa' }} // 라벨 (보통 상단의 그룹 이름) 텍스트 색
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
              <div className={styles.projectSubContent}>
                <div className={styles.subContentLayout}>
                  <div className={styles.subContentHeader}>
                    <p className={styles.subcontentTitle}>태깅 기준 - total : {taggingCrts.length}</p>
                    <button style={{ marginLeft: 10 }} data-pdf-exclude="true" onClick={handleAddCriterias}>
                      기준 추가
                    </button>
                    <button style={{ marginLeft: 10 }} data-pdf-exclude="true" onClick={handleExecuteCriterias}>
                      전체 분석 하기
                    </button>
                  </div>
                  <TableComponent columns={criteriaTableColumns} data={taggingCrts} />
                </div>
              </div>
            </div>
            {taggingResults.length !== 0 && (
              <div className={styles.projectSubContent}>
                <div className={styles.subContentLayout}>
                  <div className={styles.subContentHeader}>
                    <p className={styles.subcontentTitle}>태깅 결과 - total : {taggingResults.length}</p>
                  </div>
                  <TableComponent columns={TaggingResultTableColumns} data={taggingResults} />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
