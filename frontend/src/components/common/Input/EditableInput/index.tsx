import { useEffect, useRef, useState } from 'react';
import styles from './index.module.scss';

interface EditableInputProps {
  initialValue: string;
  fontSize?: string;
  width?: string;
  placeholder?: string;
  autoFocus?: boolean;
  onSave: (value: string) => void;
  onCancel?: () => void;
}

const EditableInput = ({
  initialValue,
  fontSize = '24px',
  width = '100%',
  placeholder = '',
  autoFocus = false,
  onSave,
  onCancel,
}: EditableInputProps) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  useEffect(() => {
    if (isEditMode && autoFocus && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditMode, autoFocus]);

  const handleEnter = () => {
    setIsEditMode(false);
    onSave(value);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsEditMode(false);
    setValue(initialValue);
    onCancel?.();
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleEnter();
    } else if (e.key === 'Escape') {
      setIsEditMode(false);
      setValue(initialValue);
      onCancel?.();
    }
  };

  return (
    <input
      ref={inputRef}
      className={`${styles.input} ${isEditMode ? styles.editMode : ''}`}
      style={{ fontSize, width }}
      value={value}
      readOnly={!isEditMode}
      placeholder={placeholder}
      onClick={() => setIsEditMode(true)}
      onChange={(e) => setValue(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleInputKeyDown}
    />
  );
};

export default EditableInput;
