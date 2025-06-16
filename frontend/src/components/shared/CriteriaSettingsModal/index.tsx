import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import styles from './index.module.scss';
import curationService from '@/apis/services/dataConstructionService';
import ModalFrame from '@/components/common/Modal/ModalFrame';
import QueryBuilder from '@/components/shared/QueryBuilderComponent';
import { CriteriaDto, QueryGroup } from '@/types/criteria';
import { UploadFileDto } from '@/types/storage';
import storageService from '@/apis/services/storageService';
import criteriaService from '@/apis/services/criteriaService';
import CommonCheckboxList from '@/components/shared/CommonCheckboxList';

interface Props {
  title: string;
  description: string;
  isCuration: boolean;
  selectedProject: any;
  curationTargetUploadFiles?: UploadFileDto[];
  setCurationTargetUploadFiles?: (files: UploadFileDto[]) => void;
  onClose: () => void;
  onConfirm: (crt: CriteriaDto[] | null) => void;
}

export default function CriteriaSettingsModal(props: Props) {
  // 쿼리 생성기로 생성된 쿼리 기준 이름
  const [queryCriteriaName, setQueryCriteriaName] = useState<string>('');
  // 프로젝트 파일로 등록된 업로드 파일
  const [projectUploadFiles, setProjectUploadFiles] = useState<UploadFileDto[]>([]);
  // 쿼리 생성기로 생성된 쿼리
  const [generatedQuery, setGeneratedQuery] = useState<string>('');
  // 기준 설정 모달 내 탭
  const [activeTab, setActiveTab] = useState<'query' | 'video_query' | 'script' | 'load'>('query');
  // Query Group
  const [queryGroups, setQueryGroups] = useState<QueryGroup[]>([]);
  // 생성된 전체 기준들
  const [criteria, setCriteria] = useState<CriteriaDto[]>([]);
  // 선택된 기준들
  const [selectedCriteria, setSelectedCriteria] = useState<CriteriaDto[]>([]);

  // props가 변경될때마다 관리 데이터 재설정
  useEffect(() => {
    // 업로드 데이터 가져오기
    fetchProjectUploadFiles();
    // 전체 기준 가져오기
    fetchCriteria();
  }, [props.selectedProject]);

  // project file로 설정된 upload file들을 가져온다.
  const fetchProjectUploadFiles = async () => {
    const response = await curationService.getProjectFiles(props.selectedProject.id);
    if (response.success) {
      const files: UploadFileDto[] = [];
      for (const projectfile of response.result) {
        const uploadFileResult = await storageService.getUploadFile(projectfile.uploadFileId);
        if (!files.some((file) => file.id === uploadFileResult.result.id)) {
          files.push(uploadFileResult.result);
        }
      }
      setProjectUploadFiles(files);
    }
  };

  const fetchCriteria = async () => {
    const response = await criteriaService.getCriteriaByUserId();
    if (response.success) {
      setCriteria(response.result);
    }
  };

  // 선택된 탭에 대한 렌더링 컴포넌트 결정
  const renderTabContent = () => {
    switch (activeTab) {
      case 'query':
        return (
          <QueryBuilder
            isCuration={props.isCuration}
            uploadFiles={projectUploadFiles}
            selectedUploadFiles={props.curationTargetUploadFiles}
            setSelectedUploadFiles={props.setCurationTargetUploadFiles}
            setQueryCriteriaName={setQueryCriteriaName}
            queryCriteriaName={queryCriteriaName}
            setGeneratedQuery={setGeneratedQuery}
            queryGroups={queryGroups}
            setQueryGroups={setQueryGroups}
          />
        );
      case 'video_query':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            영상 내용
            <input type="text" placeholder="검색할 영상 내용을 입력하세요."></input>
          </div>
        );
      case 'script':
        return <>script</>;
      case 'load':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {props.isCuration && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                큐레이션 대상 데이터
                <CommonCheckboxList
                  maxHeight="12vh"
                  items={projectUploadFiles}
                  selectedIds={props.curationTargetUploadFiles?.map((f) => f.id)}
                  onSelectionChange={(selectedFiles) => {
                    if (props.setCurationTargetUploadFiles) props.setCurationTargetUploadFiles(selectedFiles);
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
              </div>
            )}
            기준 불러오기
            <CommonCheckboxList
              items={criteria}
              selectedIds={selectedCriteria.map((f) => f.id)}
              onSelectionChange={(selectedCrt) => {
                setSelectedCriteria(selectedCrt);
              }}
              getId={(crt) => crt.id}
              getLabel={(crt) => crt.name}
              getBadge={(crt) => ({
                text: crt.type,
                color: crt.type === 'query' ? '#4FC3F7' : crt.type === 'script' ? '#FFB74D' : '#81C784',
              })}
            />
          </div>
        );
      default:
        return null;
    }
  };

  async function isValidQueryCriteria(): Promise<boolean> {
    let result: boolean = true;
    let errorMessage: string = '';

    if (!queryCriteriaName) {
      result = false;
      errorMessage = '기준 이름을 입력하세요.';
    }

    // 이미 존재하는 기준 이름인지 검사.
    if (await checkExistCrtName()) {
      result = false;
      errorMessage = '이미 존재하는 기준 이름입니다.';
    }

    if (props.curationTargetUploadFiles?.length === 0) {
      result = false;
      errorMessage = '큐레이션 대상 데이터가 설정되지 않았습니다.';
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
      if (response.success !== null) {
        //setCriteria(response.result);
        return response.result.some((item) => item.name === queryCriteriaName);
      }
    }

    return false;
  }

  const handleClickConfirm = async () => {
    if (activeTab === 'query') {
      if (await isValidQueryCriteria()) {
        // 생성된 쿼리 조건 추가
        const newCriteria: CriteriaDto = {
          id: '',
          createdAt: new Date().toISOString(),
          type: 'query',
          name: queryCriteriaName,
          variables: [],
        };
        const savedDto = await saveCriteria(newCriteria);
        saveQuery(savedDto.id, generatedQuery);
        // 모든 데이터 초기화
        setGeneratedQuery('');
        setQueryCriteriaName('');
        setProjectUploadFiles([]);
        setQueryGroups([]);

        // 부모에게 알림
        props.onConfirm([savedDto]);
      }
    } else if (activeTab === 'load') {
      // 큐레이션 기준 설정 중, 선택된 데이터가 없다면 오류 발생
      if (props.isCuration && props.curationTargetUploadFiles?.length === 0) {
        toast.error('큐레이션 대상 데이터가 설정되지 않았습니다.');
        return;
      }
      props.onConfirm(selectedCriteria);
    } else {
      props.onConfirm(null);
    }
  };

  const saveCriteria = async (newCriteria: CriteriaDto) => {
    const response = await criteriaService.saveCriteria(newCriteria);
    return response.result;
  };

  const saveQuery = async (crtId: string, query: string) => {
    if (!selectedCriteria) return;

    await criteriaService.saveQuery(crtId, query);
  };

  return (
    <>
      <ModalFrame
        title={props.title}
        description={props.description}
        width="90%"
        height="90%"
        type="confirm"
        onClose={props.onClose}
        onConfirm={handleClickConfirm}
      >
        <div className={styles.modalLayout}>
          <div className={styles.tabContainer}>
            <button
              className={`${styles.tabButton} ${activeTab === 'query' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('query')}
            >
              새로 만들기 - Query
            </button>
            <button
              className={`${styles.tabButton} ${activeTab === 'video_query' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('video_query')}
            >
              새로 만들기 - 영상 검색
            </button>
            <button
              className={`${styles.tabButton} ${activeTab === 'script' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('script')}
            >
              새로 만들기 - Script
            </button>
            <button
              className={`${styles.tabButton} ${activeTab === 'load' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('load')}
            >
              불러오기
            </button>
          </div>
          {renderTabContent()}
        </div>
      </ModalFrame>
    </>
  );
}
