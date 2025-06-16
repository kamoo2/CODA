import { ReactNode } from 'react';
import { MdClose } from 'react-icons/md';
import { FaCheck } from 'react-icons/fa';
import styles from './index.module.scss';
import ModalPortal from '@/components/common/Modal/ModalPortal';

interface BaseModalFrameProps {
  title: string;
  description?: string | null;
  width?: string;
  height?: string;
  onClose?: () => void;
  onConfirm?: () => void;
  children: ReactNode;
}

interface InfoConfirmModalProps extends BaseModalFrameProps {
  type: 'info' | 'confirm' | 'free';
}

interface StepModalProps extends BaseModalFrameProps {
  type: 'step';
  stepProps: {
    currentStep: number;
    totalStep: number;
    stepLabels: string[];
    onPrev: () => void;
    onNext: () => void;
    isNextDisabled: boolean;
  };
}

type ModalFrameProps = InfoConfirmModalProps | StepModalProps;

const ModalFrame = (props: ModalFrameProps) => {
  const { children, width = '600px', height = 'auto', title, description = null, onClose, onConfirm, type } = props;

  // stepProps 안전 분해
  const stepProps = type === 'step' ? props.stepProps : null;

  return (
    <ModalPortal>
      <div className={styles.backdrop}>
        <div className={styles.modal} style={{ width, height }}>
          <div className={styles.modalHeader}>
            <div className={styles.title}>{title}</div>
            <div className={styles.closeBtn} onClick={onClose}>
              <MdClose />
            </div>
          </div>

          {description && <div className={styles.description}>{description}</div>}

          {type === 'step' && stepProps && (
            <div className={styles.stepProgress}>
              {stepProps.stepLabels.map((label, index) => (
                <div
                  key={index}
                  className={`${styles.step} ${stepProps.currentStep === index ? styles.active : ''} ${
                    index < stepProps.currentStep ? styles.completed : ''
                  }`}
                >
                  <div className={styles.circle}>
                    {index < stepProps.currentStep && <FaCheck className={styles.checkIcon} />}
                  </div>
                  <div className={styles.label}>{label}</div>
                </div>
              ))}
            </div>
          )}

          <div className={styles.modalContent}>{children}</div>
          {type !== 'free' && (
            <div className={styles.modalFooter}>
              {type === 'confirm' && (
                <>
                  <button className={styles.cancel} onClick={onClose}>
                    Cancel
                  </button>
                  <button className={styles.ok} onClick={onConfirm}>
                    OK
                  </button>
                </>
              )}

              {type === 'step' && stepProps && (
                <>
                  {stepProps.currentStep !== 0 && (
                    <button className={styles.back} onClick={stepProps.onPrev}>
                      Back
                    </button>
                  )}
                  <button
                    className={styles.ok}
                    onClick={stepProps.currentStep === stepProps.totalStep - 1 ? onConfirm : stepProps.onNext}
                    disabled={stepProps.isNextDisabled}
                  >
                    {stepProps.currentStep === stepProps.totalStep - 1 ? 'Create Project' : 'Next'}
                  </button>
                </>
              )}

              {type === 'info' && (
                <button className={styles.ok} onClick={onConfirm}>
                  OK
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </ModalPortal>
  );
};

export default ModalFrame;
