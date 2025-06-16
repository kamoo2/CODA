import { ConfigProvider, Menu, MenuProps } from 'antd';
import {
  MdCloudQueue,
  MdHelp,
  MdOutlineAnalytics,
  MdOutlineGridView,
  MdOutlineSettings,
  MdOutlineVisibility,
} from 'react-icons/md';
import { NavLink, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import styles from './index.module.scss';
import { useMenuStore } from '@/store/menuStore';

// 메뉴 항목 타입 정의
interface MenuItem {
  key: string;
  label: string;
  icon?: JSX.Element;
  path?: string;
  children?: MenuItem[];
}

// 메뉴 리스트를 배열로 정리
const menuItems: MenuItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: <MdOutlineGridView />, path: '/' },
  {
    key: 'storage',
    label: 'Storage',
    icon: <MdCloudQueue />,
    children: [
      { key: 'storage-manager', label: 'Storage Manager', path: '/storage/manager' },
      { key: 'upload-data-manager', label: 'Upload Data Manager', path: '/storage/upload-data-manager' },
      { key: 'storage-setting', label: 'Storage Setting', path: '/storage/setting' },
    ],
  },
  {
    key: 'visualization',
    label: 'Visualization',
    icon: <MdOutlineVisibility />,
    children: [{ key: 'visualization-manager', label: 'Visualization Manager', path: '/visualization-manager' }],
  },
  {
    key: 'analysis',
    label: 'Analysis',
    icon: <MdOutlineAnalytics />,
    children: [
      {
        key: 'data-analysis',
        label: 'Data Analysis',
        children: [
          { key: 'data-based-evaluation', label: 'Data-based Evaluation', path: '/data-based-evaluation' },
          { key: 'data-curation', label: 'Data Curation', path: '/data-curation' },
        ],
      },
      { key: 'analysis-condition', label: 'Analysis Conditions', path: '/analysis-condition' },
      { key: 'analysis-results', label: 'Analysis Results', path: '/analysis-results' },
    ],
  },
  { key: 'task-manager', label: 'Task Manager', icon: <MdOutlineVisibility />, path: '/task-manager' },
  { key: 'log-manager', label: 'Log Manager', icon: <MdOutlineVisibility />, path: '/log-manager' },
  {
    key: 'setting',
    label: 'Setting',
    icon: <MdOutlineSettings />,
    children: [
      { key: 'license-setting', label: 'License Setting', path: '/license-setting' },
      { key: 'tool-setting', label: 'Tool Setting', path: '/tool-setting' },
    ],
  },
  {
    key: 'help-center',
    label: 'Help Center',
    icon: <MdHelp />,
    children: [
      { key: 'user-guide', label: 'User Guide', path: '/user-guide' },
      { key: 'faq', label: 'FAQ', path: '/faq' },
      { key: 'support-ticket', label: 'Support Tickets', path: '/support-ticket' },
    ],
  },
];

interface MenuListProps {
  collapsed: boolean;
}

const MenuList = ({ collapsed }: MenuListProps) => {
  const location = useLocation(); // 현재 URL 가져오기
  const { selectedKey, setSelectedMenu, setCurrentHeader } = useMenuStore();

  useEffect(() => {
    const findMenuItem = (items: MenuItem[], path: string): MenuItem | undefined => {
      for (const item of items) {
        if (item.path === path) return item;
        if (item.children) {
          const found = findMenuItem(item.children, path);
          if (found) return found;
        }
      }
    };

    // ✅ 시각화 모드 경로인지 확인
    const isVisualizationMode =
      location.pathname.includes('/visualization-manager') && location.pathname.includes('/view');

    if (isVisualizationMode) {
      const matchedMenu = findMenuItem(menuItems, '/visualization-manager');

      if (matchedMenu) {
        setSelectedMenu(matchedMenu.label, matchedMenu.key);
        setCurrentHeader(`${matchedMenu.label} / Viewer`);
      }
    }

    const matchedMenu = findMenuItem(menuItems, location.pathname);

    if (matchedMenu) {
      setSelectedMenu(matchedMenu.label, matchedMenu.key);
      setCurrentHeader(matchedMenu.label);
    }
  }, [location, setSelectedMenu, setCurrentHeader]);

  type MenuItemType = Required<MenuProps>['items'][number];
  const generateMenuItems = (items: MenuItem[]): MenuItemType[] =>
    items.map((item) => ({
      key: item.key,
      icon: item.icon,
      label: item.path ? <NavLink to={item.path}>{item.label}</NavLink> : item.label,
      className: item.children
        ? `${styles.submenu} ${collapsed ? styles.collapsed : ''}`
        : `${styles.menu} ${collapsed ? styles.collapsed : ''}`,
      children: item.children ? generateMenuItems(item.children) : undefined,
    }));

  return (
    <ConfigProvider
      theme={{
        components: {
          Menu: {
            darkItemBg: '#101010',
            darkItemColor: 'gray',
            darkItemHoverColor: '#ffffff',
            darkItemHoverBg: '#2e343b',
            darkItemSelectedBg: '#2e343b',
            darkSubMenuItemBg: '#101010',
            fontSize: 15,
            itemBorderRadius: 6,
            collapsedWidth: 20,
            darkPopupBg: '#101010',
            motionDurationFast: '100',
          },
        },
      }}
    >
      <Menu
        selectedKeys={[selectedKey]}
        className={styles.menu}
        theme="dark"
        mode="inline"
        triggerSubMenuAction="click"
        items={generateMenuItems(menuItems)} // ✅ 변경된 items 적용
      />
    </ConfigProvider>
  );
};

export default MenuList;
