import { useParams } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import styles from './index.module.scss';
import { EVisualizationProcessStatus, RRDFile } from '@/types/visualization';
import visualizationService from '@/apis/services/visualizationService';
import { useMqttStore } from '@/store/mqttStore';

const VisualizationViewPage = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [rrdFiles, setRrdFiles] = useState<RRDFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [showIframe, setShowIframe] = useState(false);
  const [projectStatus, setProjectStatus] = useState<EVisualizationProcessStatus>();
  const { subscribe, unsubscribe } = useMqttStore();

  const userId = useMemo(() => localStorage.getItem('userId'), []);

  useEffect(() => {
    const topic = `visualization/frontend/progress/${userId}/${projectId}`;

    const handler = (msg: string) => {
      try {
        const clean = msg.startsWith("'") ? msg.slice(1, -1) : msg;
        const payload = JSON.parse(clean);

        switch (payload.status) {
          case 'PROGRESSING':
            if (payload.rrd_url && payload.segment_index !== undefined) {
              setRrdFiles((prev) => [
                ...prev,
                {
                  id: payload.segment_index,
                  name: payload.segment_name,
                  rrdUrl: payload.rrd_url,
                },
              ]);

              if (payload.segment_index === 0) {
                handleClickRRDFile(payload.rrd_url);
              }
            }
            break;
          case 'COMPLETE':
            setProjectStatus(EVisualizationProcessStatus.COMPLETE);
            break;
        }
      } catch (e) {
        console.error('❌ 메시지 파싱 실패', e);
      }
    };

    subscribe(topic, handler); // ✅ 구독 등록

    return () => {
      unsubscribe(topic, handler); // ✅ 페이지 벗어날 때 구독 해제
    };
  }, [projectId]);

  useEffect(() => {
    if (projectId) {
      getRrdFiles(projectId);
    }
  }, [projectId]);

  const getRrdFiles = async (projectId: string) => {
    const response = await visualizationService.getProjectById(projectId);
    if (response.success) {
      setRrdFiles(response.result.rrdFiles);
      setProjectStatus(response.result.status);
    }
  };

  const handleClickRRDFile = (rrd: string) => {
    setSelectedFile(rrd);
    setShowIframe(false);

    setTimeout(() => {
      setShowIframe(true);
    }, 1500);
  };

  return (
    <div className={styles.container}>
      {rrdFiles.length > 0 && (
        <div className={styles.filesContainer}>
          {projectStatus === 'PROCESSING' && (
            <div className={styles.statusInline}>
              <span className={styles.icon}>⏳</span>
              <span>시각화 진행 중...</span>
            </div>
          )}

          {projectStatus === 'COMPLETE' && (
            <div className={styles.statusInlineComplete}>
              <span className={styles.icon}>✅</span>
              <span>시각화 완료</span>
            </div>
          )}
          {rrdFiles.map((file) => (
            <span
              className={`${styles.fileItem} ${file.rrdUrl === selectedFile && styles.selected}`}
              key={file.id}
              onClick={() => handleClickRRDFile(file.rrdUrl)}
            >
              {file.name}
            </span>
          ))}
        </div>
      )}
      <div className={styles.viewerContainer}>
        {rrdFiles.length === 0 && <div className={styles.loading}>⏳ 첫 번째 RRD 파일 생성 중입니다...</div>}

        {rrdFiles.length > 0 && !selectedFile && <div className={styles.placeholder}>📁 RRD 파일을 선택해주세요.</div>}

        {rrdFiles.length > 0 && selectedFile && !showIframe && (
          <div className={styles.loading}>🔄 시각화 로딩 중입니다...</div>
        )}

        {rrdFiles.length > 0 && selectedFile && (
          <iframe
            className={showIframe ? styles.visibleIframe : styles.hiddenIframe}
            src={`${import.meta.env.VITE_NGINX_URL}/rerun-viewer/?url=${selectedFile}`}
            title="RRD Viewer"
          />
        )}
      </div>
    </div>
  );
};

export default VisualizationViewPage;
