import { toast } from 'react-toastify';
import styles from './index.module.scss';
import 'react-toastify/dist/ReactToastify.css';
import { QueryCondition, QueryGroup as QueryGroup } from '@/types/criteria';
import { UploadFileDto } from '@/types/storage';
import CommonCheckboxList from '@/components/shared/CommonCheckboxList';

const fields = ['speed', 'acceleration', 'TTC', 'brake_status'];
const operators = ['=', '!=', '>', '>=', '<', '<='];
const logicalOperators = ['AND', 'OR'];

interface Props {
  isCuration: boolean;
  queryCriteriaName: string;
  setQueryCriteriaName: (name: string) => void;
  uploadFiles?: UploadFileDto[];
  selectedUploadFiles?: UploadFileDto[];
  setSelectedUploadFiles?: (files: UploadFileDto[]) => void;
  queryGroups: QueryGroup[];
  setQueryGroups: (queryGroups: QueryGroup[]) => void;
  setGeneratedQuery: (query: string) => void;
  maxHeight?: string;
}

export default function QueryBuilder(props: Props) {
  const addCondition = (groupIndex: number) => {
    const newGroups = [...props.queryGroups];
    newGroups[groupIndex].conditions.push({ field: '', operator: '', value: '', logicalOp: 'AND' });
    props.setQueryGroups(newGroups);
  };

  const removeCondition = (groupIndex: number, conditionIndex: number) => {
    const newGroups = [...props.queryGroups];
    newGroups[groupIndex].conditions.splice(conditionIndex, 1);
    props.setQueryGroups(newGroups);
  };

  const removeGroup = (groupIndex: number) => {
    const newGroups = [...props.queryGroups];
    newGroups.splice(groupIndex, 1);
    props.setQueryGroups(newGroups);
  };

  const updateCondition = (groupIndex: number, conditionIndex: number, key: keyof QueryCondition, value: string) => {
    const newGroups = [...props.queryGroups];
    newGroups[groupIndex].conditions[conditionIndex][key] = value;
    props.setQueryGroups(newGroups);
  };

  const addGroup = () => {
    props.setQueryGroups([...props.queryGroups, { conditions: [], groupLogicalOp: 'AND' }]);
  };

  const updateGroupLogicalOp = (groupIndex: number, value: string) => {
    const newGroups = [...props.queryGroups];
    newGroups[groupIndex].groupLogicalOp = value;
    props.setQueryGroups(newGroups);
  };

  const resetQuery = () => {
    props.setQueryGroups([]);
  };

  const buildQuery = () => {
    const query: string = props.queryGroups
      .map((group, groupIndex) => {
        const groupStr = group.conditions
          .map((cond, idx) => `${idx > 0 ? cond.logicalOp + ' ' : ''}${cond.field} ${cond.operator} ${cond.value}`)
          .join(' ');
        return `${groupIndex > 0 ? group.groupLogicalOp + ' ' : ''}(${groupStr})`;
      })
      .join(' ');
    props.setGeneratedQuery(query);
    return query;
  };

  return (
    <>
      <div className={styles.layout}>
        <div className={styles.criteriaSettings}>
          기준 이름
          <input
            type="text"
            value={props.queryCriteriaName}
            onChange={(e) => props.setQueryCriteriaName(e.target.value)}
            placeholder="기준 이름을 입력하세요."
          />
          {props.isCuration && props.uploadFiles && (
            <>
              큐레이션 대상 데이터
              <CommonCheckboxList
                maxHeight="12vh"
                items={props.uploadFiles}
                selectedIds={props.selectedUploadFiles?.map((f) => f.id)}
                onSelectionChange={(selectedFiles) => {
                  if (props.setSelectedUploadFiles) props.setSelectedUploadFiles(selectedFiles);
                  // project file dto도 selected upload files와 싱크를 맞춘다.
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
            </>
          )}
        </div>
        쿼리 생성기
        <div className={styles.queryBuilderLayout} style={{ maxHeight: props.maxHeight }}>
          <div className={styles.subContentLayout}>
            <div className={styles.header}>
              쿼리 구성하기
              <button className={styles.resetButton} onClick={resetQuery}>
                Reset
              </button>
            </div>

            {props.queryGroups.map((group, groupIndex) => (
              <div key={groupIndex} className={styles.groupWrapper}>
                {groupIndex > 0 && (
                  <div className={styles.groupLogicalOpSelector}>
                    <select
                      style={{ width: '70px' }}
                      value={group.groupLogicalOp}
                      onChange={(e) => updateGroupLogicalOp(groupIndex, e.target.value)}
                    >
                      {logicalOperators.map((op) => (
                        <option key={op} value={op}>
                          {op}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className={styles.groupBox}>
                  <div className={styles.conditionList}>
                    {group.conditions.map((cond, conditionIndex) => (
                      <div key={conditionIndex} className={styles.conditionRow}>
                        <div className={styles.logicalOperatorPadding}>
                          {conditionIndex > 0 ? (
                            <select
                              style={{ width: '70px' }}
                              value={cond.logicalOp}
                              onChange={(e) => updateCondition(groupIndex, conditionIndex, 'logicalOp', e.target.value)}
                            >
                              {logicalOperators.map((op) => (
                                <option key={op} value={op}>
                                  {op}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <div style={{ width: '80px' }}></div>
                          )}
                        </div>
                        <select
                          value={cond.field}
                          onChange={(e) => updateCondition(groupIndex, conditionIndex, 'field', e.target.value)}
                        >
                          <option value="">필드 선택</option>
                          {fields.map((f) => (
                            <option key={f} value={f}>
                              {f}
                            </option>
                          ))}
                        </select>
                        <select
                          value={cond.operator}
                          onChange={(e) => updateCondition(groupIndex, conditionIndex, 'operator', e.target.value)}
                        >
                          <option value="">연산자</option>
                          {operators.map((op) => (
                            <option key={op} value={op}>
                              {op}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={cond.value}
                          onChange={(e) => updateCondition(groupIndex, conditionIndex, 'value', e.target.value)}
                          placeholder="값"
                        />
                        <button
                          className={styles.removeButton}
                          onClick={() => removeCondition(groupIndex, conditionIndex)}
                        >
                          ❌
                        </button>
                      </div>
                    ))}
                    <button className={styles.addConditionButton} onClick={() => addCondition(groupIndex)}>
                      + 조건 추가
                    </button>
                  </div>
                  <button className={styles.removeGroupButton} onClick={() => removeGroup(groupIndex)}>
                    그룹 삭제
                  </button>
                </div>
              </div>
            ))}

            <div className={styles.addGroupWrapper}>
              <button className={styles.addGroupButton} onClick={addGroup}>
                + 그룹 추가
              </button>
            </div>
          </div>
          <div className={styles.subContentLayout}>
            <div className={styles.header}>
              생성된 쿼리
              <button
                className={styles.copyButton}
                onClick={() =>
                  navigator.clipboard.writeText(buildQuery()).then(() => {
                    toast.success('복사되었습니다!');
                  })
                }
              >
                클립보드에 복사
              </button>
            </div>
            {props.queryGroups.length > 0 && (
              <div className={styles.queryOutput}>
                <div className={styles.queryOutputHeader}></div>
                <div className={styles.queryText}>{buildQuery()}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
