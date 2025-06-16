import { useEffect, useRef, useState } from 'react';
import styles from './index.module.scss';

interface SelectProps<T> {
  options: T[];
  value?: T;
  width?: string;
  onChange: (value: T) => void;
  placeholder?: string;
  getLabel: (item: T) => string;
  isEqual?: (a: T, b: T) => boolean;
}

const Select = <T,>({
  options,
  value,
  width = 'auto',
  onChange,
  placeholder = 'All',
  getLabel,
  isEqual = (a, b) => a === b,
}: SelectProps<T>) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className={styles.wrapper} ref={ref} style={{ width }}>
      <div className={styles.selected} onClick={() => setIsOpen((prev) => !prev)}>
        {value ? getLabel(value) : <span className={styles.placeholder}>{placeholder}</span>}
        <span className={styles.arrow}>{isOpen ? '▲' : '▼'}</span>
      </div>
      {isOpen && (
        <div className={styles.dropdown}>
          {options.map((opt, i) => (
            <div
              key={i}
              className={`${styles.option} ${value && isEqual(opt, value) ? styles.selectedOption : ''}`}
              onClick={() => {
                onChange(opt);
                setIsOpen(false);
              }}
            >
              {getLabel(opt)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Select;
