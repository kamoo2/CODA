import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import styles from './index.module.scss';

export interface KebabMenuItem {
  label: string;
  onClick: (rowData: any) => void;
}

interface KebabMenuProps {
  rowData: any;
  menuItems: KebabMenuItem[];
  width?: string;
  placement?: 'top' | 'bottom';
}

const KebabMenu = ({ rowData, menuItems, width = '120px', placement = 'bottom' }: KebabMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!buttonRef.current?.contains(event.target as Node) && !menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 위치 계산
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const baseTop = placement === 'bottom' ? rect.bottom : rect.top;
      const estimatedMenuHeight = 40 + menuItems.length * 32; // rough estimate

      setMenuPos({
        top: placement === 'bottom' ? baseTop + window.scrollY : baseTop - estimatedMenuHeight + window.scrollY,
        left: rect.left + window.scrollX,
      });
    }
  }, [isOpen, placement, menuItems.length]);

  return (
    <>
      <button ref={buttonRef} onClick={() => setIsOpen((prev) => !prev)} className={styles.kebabButton}>
        ⋮
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            className={styles.dropdownMenu}
            style={{
              position: 'absolute',
              top: menuPos.top,
              left: menuPos.left,
              zIndex: 9999,
              width,
            }}
          >
            {menuItems.map((item, idx) => (
              <div
                key={idx}
                className={styles.dropdownItem}
                onClick={() => {
                  item.onClick(rowData);
                  setIsOpen(false);
                }}
              >
                {item.label}
              </div>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
};

export default KebabMenu;
