import React, { useEffect, useRef, useState } from 'react';
import { ToastContainer } from 'react-toastify';
import styles from './index.module.scss';
import { CurationProjectDto } from '@/types/analysis';
import authService from '@/apis/services/authService';
import CurationProjectListComponent from '@/components/pages/CurationPage/CurationProjectListComponent';
import { CurationProjectSettingsComponent } from '@/components/pages/CurationPage/CurationProjectSettingsComponent';
import CurationComponent from '@/components/pages/CurationPage/CurationComponent';

export const CurationPage = () => {
  const [selectedProject, setSelectedProject] = useState<CurationProjectDto | null>(null);
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({ 'analysis subject': true, analysis: true }); // 폴더 접힘 상태 관리
  // 분석용 웹소켓
  const wsRef = useRef<WebSocket | null>(null);
  // 웹 소켓 메시지 수신 후, 자식에게 전달하기 위한 메시지
  const [curationMessage, setCurationMessage] = useState<{ timestamp: number; payload: any } | null>(null);
  // 큐레이션 컴포넌트 리 랜더링을 위한 키
  const [curationComponentKey, setCurationComponentKey] = useState(0);

  useEffect(() => {
    // 기존 소켓 닫기
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.close();
    }

    socketInitialize();

    return () => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
    };
  }, []);

  const socketInitialize = async () => {
    const getUserResponse = await authService.getUserDetails();
    if (getUserResponse.success) {
      const userDetails = getUserResponse.result;
      // user id 별 web socket 연결
      const socket = new WebSocket(`ws://localhost:8080/ws/curation?userId=${userDetails.id}`);

      socket.onmessage = async (event) => {
        const data = JSON.parse(event.data);
        console.log('서버 메세지 도착 : ' + data.message);

        if (data.message === 'NEW_CURATION_RESULT' || data.message === 'CURATION_COMPLETED') {
          setCurationMessage({
            timestamp: Date.now(),
            payload: data,
          });
        }
      };

      wsRef.current = socket;
    }
  };

  const handleUpdateDescription = (newDescription: string) => {
    setSelectedProject((prev) => (prev ? { ...prev, description: newDescription } : prev));
  };

  const toggleFolder = (floderName: string) => {
    setOpenFolders((prev) => ({
      ...prev,
      [floderName]: !prev[floderName],
    }));
  };

  // CurationProjectSettingsComponent 에서 파일 삭제 시, 조건들과 분석 결과가 삭제되므로, 강제 재렌더링을 유도해야함.
  const handleDeleteProjectFile = () => {
    setCurationComponentKey((prev) => prev + 1); // key 변경 → 재렌더링 유도
  };

  return (
    <>
      <div className={styles.container}>
        <CurationProjectListComponent selectedProject={selectedProject} setSelectedProject={setSelectedProject} />

        <div id="analysisContents" className={styles.contentPanel}>
          {selectedProject ? (
            <div>
              <h2 className={styles.contentTitle} onClick={() => toggleFolder('analysis subject')}>
                {openFolders['analysis subject'] ? '▼' : '▶'} 분석 프로젝트 설정
              </h2>
              {openFolders['analysis subject'] && (
                <CurationProjectSettingsComponent
                  selectedProject={selectedProject}
                  onUpdateDescription={handleUpdateDescription}
                  onDeleteProjectFile={handleDeleteProjectFile}
                />
              )}
              {/*분석 설정 및 수행*/}
              <h2 className={styles.contentTitle} onClick={() => toggleFolder('analysis')}>
                {openFolders['analysis'] ? '▼' : '▶'} 분석 기준 설정 및 수행
              </h2>
              {openFolders['analysis'] && (
                <div>
                  <CurationComponent
                    key={curationComponentKey}
                    selectedProject={selectedProject}
                    socket={wsRef.current}
                    webSocketMessage={curationMessage}
                  />
                </div>
              )}
            </div>
          ) : (
            <p className={styles.contentTitle}>분석 프로젝트를 선택하세요.</p>
          )}
        </div>
      </div>
    </>
  );
};
