import { ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface ModalPortalProps {
  children: ReactNode;
}

const ModalPortal = ({ children }: ModalPortalProps) => {
  const modalRoot = document.getElementById('modal-root');
  if (!modalRoot) return null; // modalRoot가 없는 경우엔 null 반환

  return createPortal(children, modalRoot);
};

export default ModalPortal;
