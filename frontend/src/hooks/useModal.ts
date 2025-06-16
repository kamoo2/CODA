import { useState } from 'react';

const useModal = (): [boolean, () => void, () => void] => {
  const [isOpen, setIsOpen] = useState(false);

  const handleClickModalOpen = () => {
    setIsOpen(true);
  };

  const handleClickModalClose = () => {
    setIsOpen(false);
  };

  return [isOpen, handleClickModalOpen, handleClickModalClose];
};

export default useModal;
