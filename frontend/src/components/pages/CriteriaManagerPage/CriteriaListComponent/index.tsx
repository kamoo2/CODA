import React, { Key, useEffect, useState } from 'react';
import styles from './index.module.scss';
import { TreeNode } from '@/types/common';
import FileTree from '@/components/common/FileTree';
import { CriteriaDto } from '@/types/criteria';
import criteriaService from '@/apis/services/criteriaService';
import { generateUniqueCriteriaName } from '@/utils/utils';
import MenuButton from '@/components/common/MenuButton';

interface Props {
  selectedCriteria: CriteriaDto | null;
  setSelectedCriteria: (project: CriteriaDto | null) => void;
}

export default function CritariaListComponent(props: Props) {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [crtNodes, setCrtNodes] = useState<TreeNode<CriteriaDto>[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<Key[]>([]);
  const [expandedKeys, setExpandedKeys] = useState<Key[]>([]);

  // selected project가 변경될때마다 프로젝트를 fetch 한다.
  // 백그라운드에서 project 관련 데이터가 변동되는것을 반영하기 위함이다.
  useEffect(() => {
    fetchCriteria();
  }, [props.selectedCriteria]);

  const fetchCriteria = async () => {
    const response = await criteriaService.getMyCriteria();
    if (response.success) {
      setCrtNodes(response.result);
    } else {
      // 실패 했을 경우 Backend로 부터 Exception이 발생했을 경우
      setError(response.errorCode);
    }
    setLoading(false);
  };

  const createCriteria = async (newCriteria: CriteriaDto) => {
    const response = await criteriaService.saveCriteria(newCriteria);
    if (response.success) {
      if (response.result.type === 'script') {
        saveScript(
          response.result.id,
          `# 아래 함수들의 서명을 수정하지 않고, 함수 내에 기준을 정의하세요.
def pass_eval():
  # 성공 : True, 실패 : False
  result = True;
  return result;

def scoring():
  # (점수, 메시지)
  result = (0,"");
  return result;

def tagging():
  # (태깅 여부, 메시지)
  result = (False, "");
  return result;`,
        );
      } else if (response.result.type === 'query') {
        saveQuery(response.result.id, '');
      }
      props.setSelectedCriteria(response.result);
      setSelectedKeys([response.result.id]);
    } else {
      setError(response.errorCode);
    }
  };

  const saveScript = async (crtId: string, script: string) => {
    await criteriaService.saveScript(crtId, script);
  };

  const saveQuery = async (crtId: string, query: string) => {
    await criteriaService.saveQuery(crtId, query);
  };

  const handleCreateButtonClicked = (key: string) => {
    const crtType = key;

    const newCriteria: CriteriaDto = {
      name: generateUniqueCriteriaName('Criteria', crtNodes),
      createdAt: new Date().toISOString(),
      type: crtType,
      variables: [],
      id: ``,
    };

    createCriteria(newCriteria);

    //프로젝트 폴더 펼치기
    if (!expandedKeys.includes(crtType)) {
      setExpandedKeys((pre) => [...pre, crtType]);
    }
  };

  const handleDeleteProjectButtonClicked = () => {
    deleteCriteria(props.selectedCriteria?.id as string);
  };

  const deleteCriteria = async (crtId: string) => {
    await criteriaService.deleteCriteria(crtId);
    props.setSelectedCriteria(null);
  };

  if (loading) return <p>로딩 중...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;

  const handleExpand = (keys: Key[], info: { node: TreeNode; expanded: boolean }) => {
    setExpandedKeys(keys);
  };

  const handleSelect = (selectedKeys: Key[], info: { node: TreeNode }) => {
    if ('isLeaf' in info.node && info.node.isLeaf) {
      props.setSelectedCriteria(info.node.metadata);
      setSelectedKeys(selectedKeys);
    }
  };

  return (
    <div className={styles.sidebar}>
      <h2 className={styles.title}>조건</h2>
      <MenuButton
        buttonLabel="추가"
        menuItems={[
          { key: 'script', label: 'Script' },
          { key: 'query', label: 'Query' },
        ]}
        onSelect={(key) => {
          handleCreateButtonClicked(key);
        }}
        buttonType="primary"
      />
      <button className={styles.button} onClick={handleDeleteProjectButtonClicked}>
        삭제
      </button>
      <div className={styles.projectsContainer}>
        <FileTree
          treeData={crtNodes}
          onExpand={handleExpand}
          onSelect={handleSelect}
          selectedKeys={selectedKeys}
          expandedKeys={expandedKeys}
        />
      </div>
    </div>
  );
}
