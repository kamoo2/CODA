import React, { useEffect, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import PassEvalComponent from '../../components/pages/EvaluationAnalysisPage/PassEvalComponent';
import ScoreEvalComponent from '../../components/pages/EvaluationAnalysisPage/ScoreEvalComponent';
import ProjectListComponent from '../../components/pages/EvaluationAnalysisPage/ProjectListComponent';
import { EvalProjectSettingsComponent } from '../../components/pages/EvaluationAnalysisPage/EvalProjectSettingsComponent';
import TaggingComponent from '../../components/pages/EvaluationAnalysisPage/TaggingComponent';
import styles from './index.module.scss';
import { EvalProjectDto } from '@/types/analysis';
import authService from '@/apis/services/authService';
import EditableInput from '@/components/common/Input/EditableInput';
import evaluationService from '@/apis/services/evaluationService';

export const EvaluationAnalysisPage = () => {
  const [selectedProject, setSelectedProject] = useState<EvalProjectDto | null>(null);
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({ 'analysis subject': true, analysis: true }); // 폴더 접힘 상태 관리
  // 분석용 웹소켓
  const wsRef = useRef<WebSocket | null>(null);
  // 웹 소켓 메시지 수신 후, 자식에게 전달하기 위한 메시지
  const [passEvalMessage, setPassEvalMessage] = useState<{ timestamp: number; payload: any } | null>(null);
  const [scoreEvalMessage, setScoreEvalMessage] = useState<{ timestamp: number; payload: any } | null>(null);
  const [taggingMessage, setTaggingMessage] = useState<{ timestamp: number; payload: any } | null>(null);

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
      const socket = new WebSocket(`ws://localhost:8080/ws/analysis?userId=${userDetails.id}`);

      socket.onmessage = async (event) => {
        const data = JSON.parse(event.data);
        console.log('서버 메세지 도착 : ' + data.message);

        if (data.message === 'NEW_PASS_EVAL_RESULT' || data.message === 'PASS_EVAL_COMPLETED') {
          setPassEvalMessage({
            timestamp: Date.now(),
            payload: data,
          });
        } else if (data.message === 'NEW_SCORE_EVAL_RESULT' || data.message === 'SCORE_EVAL_COMPLETED') {
          setScoreEvalMessage({
            timestamp: Date.now(),
            payload: data,
          });
        } else if (data.message === 'NEW_TAGGING_RESULT' || data.message === 'TAGGING_COMPLETED') {
          setTaggingMessage({
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

  const exportMultiPagePdf = async (elementId: string) => {
    const fileName =
      selectedProject?.analysisDate.split('T')[0] + '_' + selectedProject?.name + '_report_' + Date.now();
    const originalElement = document.getElementById(elementId);
    if (!originalElement) return;

    // Step 1: cloneElement를 만들고 화면 밖에 붙임
    const clonedElement = originalElement.cloneNode(true) as HTMLElement;
    clonedElement.style.position = 'fixed';
    clonedElement.style.top = '0';
    clonedElement.style.left = '0';
    clonedElement.style.zIndex = '-1000';
    clonedElement.style.backgroundColor = '#2e2e2e'; // 다크 배경 유지
    clonedElement.style.overflow = 'visible'; // scroll 제거
    clonedElement.scrollTop = 0;

    // 기존 크기와 동일하게 강제 설정
    clonedElement.style.width = `${originalElement.scrollWidth}px`;
    clonedElement.style.height = `${originalElement.scrollHeight}px`;

    // ✅ 보고서 제목 삽입
    const titleElement = document.createElement('div');
    titleElement.innerText = `📘 ${selectedProject?.analysisDate.split('T')[0] + '_' + selectedProject?.name} - 분석 보고서`;
    titleElement.style.fontSize = '24px';
    titleElement.style.fontWeight = 'bold';
    titleElement.style.color = '#f0f0f0';
    titleElement.style.marginBottom = '20px';
    titleElement.style.textAlign = 'center';
    clonedElement.insertBefore(titleElement, clonedElement.firstChild);

    document.body.appendChild(clonedElement);

    // Step 2: 캔버스 렌더링
    const canvas = await html2canvas(clonedElement, {
      scale: 1,
      useCORS: true,
      scrollY: 0, // 반드시 0으로 설정
      backgroundColor: '#2e2e2e', // 여기서도 다크!
      ignoreElements: (element) => {
        return element.getAttribute('data-pdf-exclude') === 'true'; // 이 클래스를 가진 요소는 제외!
      },
    });

    document.body.removeChild(clonedElement); // 클론 제거

    // Step 3: PDF로 변환
    const imgData = canvas.toDataURL('image/jpeg', 0.7);
    const imgWidth = 595.28; // A4 가로 (pt)
    const pageHeight = 841.89; // A4 세로 (pt)
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    const pdf = new jsPDF('p', 'pt', 'a4');

    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
    position -= pageHeight;

    while (heightLeft > 0) {
      if (position !== 0) pdf.addPage();

      // 💡 배경 다크색으로 페이지 전체 덮기
      pdf.setFillColor(46, 46, 46); // #2e2e2e in RGB
      pdf.rect(0, 0, imgWidth, pageHeight, 'F');

      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);

      heightLeft -= pageHeight;
      position -= pageHeight;
    }

    // 저장
    const blob = pdf.output('blob');
    const blobUrl = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName;
    link.click();

    URL.revokeObjectURL(blobUrl);
  };

  const handleSaveTitle = async (value: string) => {
    if (!selectedProject) return;

    const response = await evaluationService.updateProjectByName(selectedProject.id, value);

    if (response.success) {
      // ✅ 응답으로 받은 수정된 프로젝트 정보 반영
      setSelectedProject((prev) => prev && { ...prev, name: response.result.name });
    } else {
      console.error('프로젝트 제목 업데이트 실패');
    }
  };

  return (
    <div className={styles.container}>
      <ProjectListComponent selectedProject={selectedProject} setSelectedProject={setSelectedProject} />

      <div id="analysisContents" className={styles.contentPanel}>
        {selectedProject ? (
          <div>
            <EditableInput initialValue={selectedProject.name || ''} onSave={handleSaveTitle} width="100%" />
            <h2 className={styles.contentTitle} onClick={() => toggleFolder('analysis subject')}>
              {openFolders['analysis subject'] ? '▼' : '▶'} 분석 프로젝트 설정
            </h2>
            {openFolders['analysis subject'] && (
              <EvalProjectSettingsComponent
                selectedProject={selectedProject}
                onUpdateDescription={handleUpdateDescription}
              />
            )}
            {/*분석 설정 및 수행*/}
            <h2 className={styles.contentTitle} onClick={() => toggleFolder('analysis')}>
              {openFolders['analysis'] ? '▼' : '▶'} 분석 기준 설정 및 수행
            </h2>
            {openFolders['analysis'] && (
              <div>
                <PassEvalComponent
                  selectedProject={selectedProject}
                  socket={wsRef.current}
                  webSocketMessage={passEvalMessage}
                />
                <ScoreEvalComponent
                  selectedProject={selectedProject}
                  socket={wsRef.current}
                  webSocketMessage={scoreEvalMessage}
                />
                <TaggingComponent
                  selectedProject={selectedProject}
                  socket={wsRef.current}
                  webSocketMessage={taggingMessage}
                />
                <button data-pdf-exclude="true" onClick={() => exportMultiPagePdf('analysisContents')}>
                  Export to PDF
                </button>
              </div>
            )}
          </div>
        ) : (
          <p className={styles.contentTitle}>분석 프로젝트를 선택하세요.</p>
        )}
      </div>
    </div>
  );
};
