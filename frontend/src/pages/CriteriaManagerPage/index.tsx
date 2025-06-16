import React, { useEffect, useState, useRef } from 'react';
import AceEditor from 'react-ace';
import { toast } from 'react-toastify';
import { v4 as uuidv4 } from 'uuid';
import styles from './index.module.scss';
import { CriteriaDto, QueryGroup } from '@/types/criteria';
import { VariableDto } from '@/types/criteria';
import criteriaService from '@/apis/services/criteriaService';
import CritariaListComponent from '@/components/pages/CriteriaManagerPage/CriteriaListComponent';
import QueryBuilder from '@/components/shared/QueryBuilderComponent';
import { parseQuery } from '@/utils/utils';
import PythonEditorComponent from '@/components/pages/CriteriaManagerPage/PythonEditorComponent';

export default function CriteriaManagerPage() {
  // 기준 이름
  const [criteriaName, setCriteriaName] = useState<string>('');
  // 쿼리 생성기로 생성된 쿼리
  const [generatedQuery, setGeneratedQuery] = useState<string>('');
  // .query file로부터 로드 된 쿼리
  const [loadedQuery, setLoadedQuery] = useState<string>('');
  // Query Group
  const [queryGroups, setQueryGroups] = useState<QueryGroup[]>([]);
  // script 변수
  const [variables, setVariables] = useState<VariableDto[]>([]);
  // script 코드
  const [code, setCode] = useState<string>('');

  const [selectedCriteria, setSelectedCriteria] = useState<CriteriaDto | null>(null);
  const [consoleLines, setConsoleLines] = useState<string[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string>('0');

  const aceEditorRef = useRef<AceEditor | null>(null);

  useEffect(() => {
    if (selectedCriteria) {
      setCriteriaName(selectedCriteria.name);
      setVariables(selectedCriteria.variables);
      if (selectedCriteria.type === 'query') {
        fetchQuery();
      } else if (selectedCriteria.type === 'script') {
        fetchScript();
      }
    }
  }, [selectedCriteria]);

  useEffect(() => {
    if (selectedCriteria) {
      try {
        const parsed = parseQuery(loadedQuery);
        // 이전 상태와 같으면 setState 하지 않음
        setQueryGroups((prev) => {
          const prevStr = JSON.stringify(prev);
          const parsedStr = JSON.stringify(parsed);
          if (prevStr !== parsedStr) {
            return parsed;
          }
          return prev;
        });
      } catch (err) {
        console.error('쿼리 파싱 실패:', err);
        setQueryGroups([]);
      }
    }
  }, [loadedQuery]);

  const saveScript = async (script: string) => {
    if (!selectedCriteria) return;

    await criteriaService.saveScript(selectedCriteria.id, script);
  };

  const saveQuery = async (query: string) => {
    if (!selectedCriteria) return;

    await criteriaService.saveQuery(selectedCriteria.id, query);
  };

  const fetchQuery = async () => {
    if (!selectedCriteria) return;

    const response = await criteriaService.getQuery(selectedCriteria.id);
    if (response.success) {
      setLoadedQuery(response.result);
    }
  };

  const fetchScript = async () => {
    if (!selectedCriteria) return;

    const response = await criteriaService.getScript(selectedCriteria.id);
    if (response.success) {
      setCode(response.result);
    }
  };

  // 기준 속성 수정
  const updateCriteria = async (updates: Partial<CriteriaDto>) => {
    if (!selectedCriteria) return;

    // 기존 객체 복사
    const updatedCriteria: CriteriaDto = { ...selectedCriteria };

    // 전달받은 값으로 속성만 수정
    (Object.keys(updates) as (keyof CriteriaDto)[]).forEach((key) => {
      if (key in updatedCriteria) {
        // variables update 호출 시, 기존의 variable에서 제거된 항목들은 DB에서 제거시킨다.
        if (key === 'variables') {
          const oldVariables = selectedCriteria.variables;
          const newVariables = updates.variables ?? [];

          // 기존에 있었는데 새 목록에는 없는 항목 찾기
          const removedVariables = oldVariables.filter(
            (oldVar) => !newVariables.some((newVar) => newVar.id === oldVar.id),
          );

          // 제거된 항목 DB에서 삭제
          removedVariables.forEach(async (variable) => {
            await deleteVariable(variable);
          });
        }

        updatedCriteria[key] = updates[key] as any;
      }
    });

    // DB에 저장
    await criteriaService.updateCriteria(updatedCriteria);

    // 상태 갱신
    setSelectedCriteria(updatedCriteria);
  };

  const addVariable = async (newVariable: VariableDto) => {
    if (!selectedCriteria) return;

    setVariables([...variables, newVariable]);
  };

  const deleteVariable = async (variable: VariableDto) => {
    if (!selectedCriteria) return;

    // 서버에서 삭제
    await criteriaService.deleteVariable(variable.id);
  };

  // 변수 수정
  const handleVariableChange = (variableIndex: number, key: keyof VariableDto, value: string) => {
    if (selectedCriteria !== null) {
      const updatedVariables = [...variables];
      updatedVariables[variableIndex] = { ...updatedVariables[variableIndex], [key]: value };
      setVariables(updatedVariables);
    }
  };

  // 콘솔 입력 처리
  const handleConsoleInput = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      const command = (event.target as HTMLInputElement).value;
      setConsoleLines((prev) => [...prev, `$ ${command}`, `> Command executed: ${command}`]);
      (event.target as HTMLInputElement).value = '';
    }
  };

  useEffect(() => {
    if (!aceEditorRef.current) return;
    const langTools = (window as any).ace.require('ace/ext/language_tools');

    // ✅ 사용자 정의 변수 자동완터 생성
    const variableCompleter = {
      getCompletions: (
        editor: any,
        session: any,
        pos: any,
        prefix: string,
        callback: (arg0: null, arg1: any[]) => void,
      ) => {
        const selectedVariables = selectedCriteria !== undefined ? variables || [] : [];

        const completions = selectedVariables.map((variable) => ({
          caption: variable.name,
          value: variable.name,
          meta: 'Variable',
          score: 1000, // 가중치 부여 (optional)
        }));

        callback(null, completions);
      },
    };

    // ✅ 기존 기본 completer 들과 내 변수 completer 병합
    const defaultCompleters = langTools.getCompletions ? langTools.getCompletions() : [];
    langTools.setCompleters([langTools.keyWordCompleter, langTools.snippetCompleter, variableCompleter]);
  }, [selectedCriteria, variables]);

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
  };

  const handleVariableDelete = (variable: VariableDto) => {
    if (selectedCriteria !== null) {
      const updatedVariables = variables.filter((v) => v.id !== variable.id);
      setVariables(updatedVariables);
    }
  };

  const handleAddVariable = (newVariable: VariableDto) => {
    addVariable(newVariable);
  };

  const handleSetQueryCriteriaName = (name: string) => {
    setCriteriaName(name);
  };

  const handleSaveCriteria = async () => {
    if (selectedCriteria?.type === 'script') {
      saveScript(code);
      updateCriteria({ name: criteriaName, variables });
      toast.info('저장되었습니다.');
    } else if (selectedCriteria?.type === 'query') {
      if (await isValidQueryCriteria()) {
        saveQuery(generatedQuery);
        updateCriteria({ name: criteriaName });
        toast.info('저장되었습니다.');
      }
    }
  };

  async function isValidQueryCriteria(): Promise<boolean> {
    let result: boolean = true;
    let errorMessage: string = '';

    if (!criteriaName) {
      result = false;
      errorMessage = '기준 이름을 입력하세요.';
    }

    // 이미 존재하는 기준 이름인지 검사.
    if (await checkExistCrtName()) {
      result = false;
      errorMessage = '이미 존재하는 기준 이름입니다.';
    }

    if (queryGroups.length === 0) {
      result = false;
      errorMessage = '쿼리가 정의되지 않았습니다.';
    }

    for (const group of queryGroups) {
      if (group.conditions.length === 0) {
        result = false;
        errorMessage = '그룹 내 조건이 정의되지 않은 그룹이 존재합니다.';
        break;
      }

      for (const condition of group.conditions) {
        if (!condition.field || !condition.operator || !condition.value.trim()) {
          result = false;
          errorMessage = '조건이 완벽하게 정의되지 않은 항목이 존재합니다.';
          break;
        }
      }
    }

    if (!result && errorMessage) {
      toast.error(errorMessage);
    }
    return result;
  }

  async function checkExistCrtName(): Promise<boolean> {
    const response = await criteriaService.getCreterias();
    if (response.success) {
      // 성공 했을 경우
      if (response.success !== null && selectedCriteria?.name !== criteriaName) {
        return response.result.some((item) => item.name === criteriaName);
      }
    }

    return false;
  }
  return (
    <div className={styles.container}>
      <CritariaListComponent selectedCriteria={selectedCriteria} setSelectedCriteria={setSelectedCriteria} />

      <div className={styles.mainContent}>
        {selectedCriteria ? (
          selectedCriteria.type === 'script' ? (
            <>
              <h4>Criteria Name</h4>
              <input
                type="text"
                value={criteriaName}
                onChange={(e) => setCriteriaName(e.target.value)}
                className={styles.input}
              />

              <h4>Variables</h4>
              <div className={styles.gridWrapper}>
                <div className={styles.grid}>
                  <div className={styles.gridHeader}>
                    <div className={styles.gridCell}>Name</div>
                    <div className={styles.gridCell}>Path</div>
                    <div className={styles.gridCell}></div> {/* 삭제 칸 */}
                  </div>

                  {variables &&
                    variables.map((variable, varIndex) => (
                      <div key={varIndex} className={styles.gridRow}>
                        <div className={styles.gridCell}>
                          <input
                            type="text"
                            placeholder="Variable Name"
                            value={variable?.name ?? ' '}
                            onChange={(e) => handleVariableChange(varIndex, 'name', e.target.value)}
                          />
                        </div>
                        <div className={styles.gridCell}>
                          <input
                            type="text"
                            placeholder="Variable Path"
                            value={variable.path}
                            onChange={(e) => handleVariableChange(varIndex, 'path', e.target.value)}
                          />
                        </div>
                        <div className={styles.gridCell}>
                          <button className={styles.deleteButton} onClick={() => handleVariableDelete(variable)}>
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))}
                </div>

                <div className={styles.addButtonRow}>
                  <button
                    className={styles.addButton}
                    onClick={() => {
                      const newVariable = { name: '', path: '', id: uuidv4() };
                      handleAddVariable(newVariable);
                    }}
                  >
                    +
                  </button>
                </div>
              </div>

              <h4 className={styles.subtitleSmall}>Code Editor</h4>
              <div className={styles.editorWrapper}>
                <PythonEditorComponent variables={variables} code={code} onChange={handleCodeChange} />
              </div>

              <div className={styles.cmdConsole}>
                {consoleLines.map((line, index) => (
                  <div key={index} className={styles.consoleLine}>
                    {line}
                  </div>
                ))}
                <input
                  type="text"
                  className={styles.consoleInput}
                  placeholder="명령어를 입력하세요"
                  onKeyDown={handleConsoleInput}
                />
              </div>
            </>
          ) : (
            <>
              <QueryBuilder
                isCuration={false}
                setQueryCriteriaName={handleSetQueryCriteriaName}
                queryCriteriaName={criteriaName}
                setGeneratedQuery={setGeneratedQuery}
                queryGroups={queryGroups}
                setQueryGroups={setQueryGroups}
              />
            </>
          )
        ) : (
          <p>조건을 선택해주세요.</p>
        )}
        {selectedCriteria ? <button onClick={handleSaveCriteria}>save</button> : ''}
      </div>
    </div>
  );
}
