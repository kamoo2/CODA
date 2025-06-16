import React, { Key, useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import styles from './index.module.scss';

import { EvalProjectDto } from '@/types/analysis';
import evaluationService from '@/apis/services/evaluationService';
import FileTree from '@/components/common/FileTree';
import { TreeNode } from '@/types/common';

interface Props {
  selectedProject: EvalProjectDto | null;
  setSelectedProject: (project: EvalProjectDto | null) => void;
}

export default function ProjectListComponent(props: Props) {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [projectNodes, setProjectNodes] = useState<TreeNode<EvalProjectDto>[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<Key[]>([]);
  const [expandedKeys, setExpandedKeys] = useState<Key[]>([]);

  // selected project가 변경될때마다 프로젝트를 fetch 한다.
  // 백그라운드에서 project 관련 데이터가 변동되는것을 반영하기 위함이다.
  useEffect(() => {
    fetchMyProjects();
  }, [props.selectedProject]);

  const fetchMyProjects = async () => {
    const response = await evaluationService.getMyEvalProjects();
    if (response.success) {
      setProjectNodes(response.result);
    } else {
      setError(response.errorCode);
    }
    setLoading(false);
  };

  const createProject = async (newProject: EvalProjectDto) => {
    const response = await evaluationService.saveProject(newProject);
    if (response.success) {
      props.setSelectedProject(response.result);
      setSelectedKeys([response.result.id]);
    } else {
      setError(response.errorCode);
    }
  };

  const handleCreateProjectButtonClicked = () => {
    const now = new Date();
    const folderName = `${String(now.getFullYear()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const milliseconds = String(now.getMilliseconds()).padStart(3, '0');
    const newProject: EvalProjectDto = {
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      analysisDate: now.toISOString(),
      name: `${hours}${minutes}${seconds}${milliseconds}`,
      owner: '',
      description: '',
      passEvalEnabled: false,
      scoreEvalEnabled: false,
      taggingEnabled: false,
    };

    createProject(newProject);

    //프로젝트 폴더 펼치기
    if (!expandedKeys.includes(folderName)) {
      setExpandedKeys((pre) => [...pre, folderName]);
    }
  };

  const handleDeleteProjectButtonClicked = () => {
    deleteProjects(props.selectedProject?.id as string);
  };

  const deleteProjects = async (projectId: string) => {
    await evaluationService.deleteProject(projectId);
    props.setSelectedProject(null);
    setSelectedKeys([]);
  };

  if (loading) return <p>로딩 중...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;

  const handleExpand = (keys: Key[], info: { node: TreeNode; expanded: boolean }) => {
    setExpandedKeys(keys);
  };

  const handleSelect = (selectedKeys: Key[], info: { node: TreeNode }) => {
    if ('isLeaf' in info.node && info.node.isLeaf) {
      props.setSelectedProject(info.node.metadata);
      setSelectedKeys(selectedKeys);
    }
  };

  return (
    <div className={styles.sidebar}>
      <h2 className={styles.title}>분석 프로젝트</h2>
      <button className={styles.button} onClick={handleCreateProjectButtonClicked}>
        추가
      </button>
      <button className={styles.button} onClick={handleDeleteProjectButtonClicked}>
        삭제
      </button>
      <div className={styles.projectsContainer}>
        <FileTree
          treeData={projectNodes}
          onExpand={handleExpand}
          onSelect={handleSelect}
          selectedKeys={selectedKeys}
          expandedKeys={expandedKeys}
        />
      </div>
    </div>
  );
}
