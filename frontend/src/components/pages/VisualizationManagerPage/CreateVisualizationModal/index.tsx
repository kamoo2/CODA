import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import styles from './index.module.scss';
import ModalFrame from '@/components/common/Modal/ModalFrame';
import useModal from '@/hooks/useModal';
import visualizationService from '@/apis/services/visualizationService';
import VisualizationProjectSetup from '@/components/pages/VisualizationManagerPage/CreateVisualizationModal/VisualizationProjectSetup';
import ConfigureBlueprintSettings from '@/components/pages/VisualizationManagerPage/CreateVisualizationModal/ConfigureBlueprintSettings';
import VisualizationSettingReview from '@/components/pages/VisualizationManagerPage/CreateVisualizationModal/VisualizationSettingReview';
import SignalSelection from '@/components/pages/VisualizationManagerPage/CreateVisualizationModal/SignalSelection';
import { useVisualizationProjectStore } from '@/store/visualization/projectStore';
import { useVisualizationSettingStore } from '@/store/visualization/visualizationSettingStore';
import authService from '@/apis/services/authService';

interface CreateVisualizationModalProps {
  handleClickModalClose: () => void;
}

const CreateVisualizationModal = ({ handleClickModalClose }: CreateVisualizationModalProps) => {
  const { currentStep, setCurrentStep } = useVisualizationSettingStore();

  const {
    projectName,
    blueprintSettings,
    resetAll,
    validationMessage,
    riffSignalSettings,
    setValidationMessage,
    validateProjectName,
    validateBlueprintSettings,
  } = useVisualizationSettingStore();

  const { addProject } = useVisualizationProjectStore();

  const [isConfirmModalOpen, handleClickConfirmModalOpen, handleClickConfirmModalClose] = useModal();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const steps = useMemo(() => {
    const hasRiff = blueprintSettings.some((bp) => bp.uploadFile.parserName === 'RiffParser');
    return hasRiff
      ? ['Project Setup', 'Configure Blueprints', 'Select Selection', 'Summary']
      : ['Project Setup', 'Configure Blueprints', 'Summary'];
  }, [blueprintSettings]);

  useEffect(() => {
    // Step 변경 시 Validation 수행 및 메시지 초기화
    setValidationMessage(null); // 이전 Step의 메시지 초기화
    if (currentStep === 0) {
      validateProjectName();
    } else if (currentStep === 1) {
      validateBlueprintSettings();
    }
  }, [currentStep, validateProjectName, validateBlueprintSettings, setValidationMessage]);

  const renderStepContent = () => {
    if (steps.length === 4) {
      switch (currentStep) {
        case 0:
          return <VisualizationProjectSetup />;
        case 1:
          return <ConfigureBlueprintSettings />;
        case 2:
          return <SignalSelection />; // 새 컴포넌트로 교체
        case 3:
          return <VisualizationSettingReview />;
        default:
          return <div>Invalid Step</div>;
      }
    } else {
      switch (currentStep) {
        case 0:
          return <VisualizationProjectSetup />;
        case 1:
          return <ConfigureBlueprintSettings />;
        case 2:
          return <VisualizationSettingReview />;
        default:
          return <div>Invalid Step</div>;
      }
    }
  };

  const isNextDisabled = () => validationMessage !== null;

  // 모달 닫기 버튼 or Cancel 버튼 클릭 시
  const handleClose = () => {
    resetAll();
    handleClickModalClose(); // 모달은 반드시 닫혀야함
  };

  const handleNext = () => {
    setCurrentStep(currentStep + 1);
  };

  const handlePrev = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleClickStartNow = async () => {
    setLoading(true);

    const blueprints = blueprintSettings.map((bp) => {
      if (bp.uploadFile.parserName === 'RiffParser') {
        return {
          uploadFileId: bp.uploadFile.id,
          entityName: bp.entityName,
          viewName: bp.viewName,
          dbcFileName: bp.uploadFile.dbcFileName,
          uploadFilePath: bp.uploadFile.s3Url,
          parserName: bp.uploadFile.parserName,
          selectedSignals: riffSignalSettings[bp.uploadFile.id].selectedSignals,
        };
      } else {
        return {
          uploadFileId: bp.uploadFile.id,
          entityName: bp.entityName,
          viewName: bp.viewName,
          dbcFileName: null,
          uploadFilePath: bp.uploadFile.s3Url,
          parserName: bp.uploadFile.parserName,
          selectedSignals: [],
        };
      }
    });

    const response = await visualizationService.createProject(projectName, blueprints);

    if (!response.success) {
      handleClickConfirmModalClose();
      handleClose();
      toast.error(response.message);
      return;
    }

    const projectId = response.result.id;

    // 2. 생성된 프로젝트로 시각화 프로세스 실행
    const startResponse = await visualizationService.startVisualization(projectId, blueprints);

    // 3. 성공 후
    if (startResponse.success) {
      addProject(response.result);
      navigate(`/visualization-viewer/${projectId}`);
      toast.success('시각화 프로세스를 시작했습니다.');
    } else {
      toast.error('시각화 프로젝트 시작 중 오류가 발생했습니다.');
    }

    addProject(response.result);

    handleClickConfirmModalClose();
    handleClose();
  };

  const handleClickStartLater = async () => {
    const blueprints = blueprintSettings.map((bp) => {
      if (bp.uploadFile.parserName === 'RiffParser') {
        return {
          uploadFileId: bp.uploadFile.id,
          entityName: bp.entityName,
          viewName: bp.viewName,
          dbcFileName: bp.uploadFile.dbcFileName,
          uploadFilePath: bp.uploadFile.s3Url,
          parserName: bp.uploadFile.parserName,

          selectedSignals: riffSignalSettings[bp.uploadFile.id].selectedSignals,
        };
      } else {
        return {
          uploadFileId: bp.uploadFile.id,
          entityName: bp.entityName,
          viewName: bp.viewName,
          dbcFileName: null,
          uploadFilePath: bp.uploadFile.s3Url,
          parserName: bp.uploadFile.parserName,

          selectedSignals: [],
        };
      }
    });

    const response = await visualizationService.createProject(projectName, blueprints);

    if (response.success) {
      // 토스트 띄우기 (성공 했다고)
      addProject(response.result);
      toast.success('프로젝트 생성 완료');
    } else {
      // 토스트 띄우기 (실패 했다고)
      toast.error('프로젝트 생성 실패');
    }

    handleClickConfirmModalClose();
    handleClose();
  };

  return (
    <ModalFrame
      title="Create New Visualization Project"
      description="Set up your new project and configure associated blueprint files for visualization."
      width="90%"
      height="90%"
      onConfirm={handleClickConfirmModalOpen}
      onClose={handleClose}
      type="step"
      stepProps={{
        currentStep,
        totalStep: steps.length,
        stepLabels: steps,
        onPrev: () => handlePrev(),
        onNext: () => handleNext(),
        isNextDisabled: isNextDisabled(),
      }}
    >
      {renderStepContent()}
      {isConfirmModalOpen && (
        <ModalFrame
          title="Start Visualization File Generation Process"
          description="To visualize the data, it needs to be converted into visualization files."
          onClose={handleClickConfirmModalClose}
          width="500px"
          height="300px"
          type="free"
        >
          <div className={styles.container}>
            <div className={styles.content}>
              <p>
                If you want to start visualization processing immediately after project creation, click "Start Now."
              </p>
              <p>If you prefer to create the project first and process visualization later, click "Do It Later.</p>
            </div>
            <div className={styles.btnWrapper}>
              <div className={styles.startNowBtn} onClick={handleClickStartNow}>
                Start Now
              </div>
              <div className={styles.startLaterBtn} onClick={handleClickStartLater}>
                Do It Later
              </div>
            </div>
          </div>
        </ModalFrame>
      )}
    </ModalFrame>
  );
};

export default CreateVisualizationModal;
