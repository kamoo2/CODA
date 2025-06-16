import { useState } from 'react';
import styles from './index.module.scss';

type BreadcrumbProps = {
  prefixStr: string;
  onNavigate: (newPrefix: string) => void;
};

const MAX_DISPLAY_COUNT = 3;

const StorageBreadCrumb = ({ prefixStr, onNavigate }: BreadcrumbProps) => {
  const parts = prefixStr.split('/').filter(Boolean);
  const isOverflow = parts.length > MAX_DISPLAY_COUNT;
  const overflowStartIndex = parts.length - MAX_DISPLAY_COUNT;

  const displayedParts = isOverflow ? ['...', ...parts.slice(overflowStartIndex)] : parts;

  const [showDropdown, setShowDropdown] = useState(false);

  const handleClick = (index: number) => {
    if (displayedParts[index] === '...') {
      setShowDropdown(!showDropdown);
      return;
    }

    const realIndex = isOverflow ? index - 1 + overflowStartIndex : index;
    const newPrefix = parts.slice(0, realIndex + 1).join('/') + '/';
    onNavigate(newPrefix);
  };

  const handleDropdownSelect = (index: number) => {
    const newPrefix = parts.slice(0, index + 1).join('/') + '/';
    onNavigate(newPrefix);
    setShowDropdown(false);
  };

  return (
    <div className={styles.breadcrumb}>
      {displayedParts.map((part, idx) => (
        <span
          key={idx}
          className={`${styles.crumb} ${part !== '...' ? styles.clickable : ''}`}
          onClick={() => handleClick(idx)}
        >
          {part}
          {idx < displayedParts.length - 1 && <span className={styles.divider}> / </span>}
        </span>
      ))}

      {/* 드롭다운 */}
      {showDropdown && isOverflow && (
        <div className={styles.dropdown}>
          {parts.slice(0, overflowStartIndex).map((part, idx) => (
            <div key={idx} className={styles.dropdownItem} onClick={() => handleDropdownSelect(idx)}>
              {part}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StorageBreadCrumb;
