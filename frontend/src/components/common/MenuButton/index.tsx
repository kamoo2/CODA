import React from 'react';
import { Button, Dropdown, MenuProps } from 'antd';
import styles from './index.module.scss';

export interface MenuItemOption {
  key: string;
  label: string;
  disabled?: boolean;
}

interface MenuButtonProps {
  buttonLabel: string;
  menuItems: MenuItemOption[];
  onSelect: (key: string) => void;
  buttonType?: 'text' | 'default' | 'primary' | 'link' | 'dashed';
  ghost?: boolean;
  size?: 'small' | 'middle' | 'large';
}

const MenuButton: React.FC<MenuButtonProps> = ({
  buttonLabel,
  menuItems,
  onSelect,
  buttonType = 'default',
  ghost = false,
  size = 'middle',
}) => {
  const handleMenuClick: MenuProps['onClick'] = (info) => {
    onSelect(info.key);
  };

  const items: MenuProps['items'] = menuItems.map((item) => ({
    key: item.key,
    label: item.label,
    disabled: item.disabled,
  }));

  return (
    <Dropdown menu={{ items, onClick: handleMenuClick }} trigger={['click']}>
      <Button className={styles.button} type={buttonType} size={size} ghost={ghost}>
        {buttonLabel}
      </Button>
    </Dropdown>
  );
};

export default MenuButton;
