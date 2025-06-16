import { Layout } from 'antd';
import Sider from 'antd/es/layout/Sider';
import { useEffect, useRef, useState } from 'react';
import { MdKeyboardArrowLeft, MdKeyboardArrowRight } from 'react-icons/md';
import styles from './index.module.scss';
import Logo from '@/assets/images/logo.svg?react';
import MenuList from '@/components/common/Sidebar/MenuList';
import useSidebarResize from '@/hooks/useResize';
import useResponsive from '@/hooks/useResponsive';

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { width, handleMouseDown } = useSidebarResize(300, 600);
  const { isMobile } = useResponsive();
  const wasUserCollapsed = useRef(false); // 사용자가 수동으로 닫았는지 여부
  const wasForcedCollapsed = useRef(false); // 모바일에서 자동으로 닫혔는지 여부

  useEffect(() => {
    if (isMobile) {
      wasUserCollapsed.current = collapsed; // 현재 상태 기억
      setCollapsed(true);
      wasForcedCollapsed.current = true;
    } else {
      if (wasForcedCollapsed.current && !wasUserCollapsed.current) {
        setCollapsed(false);
      }
      wasForcedCollapsed.current = false;
    }
  }, [isMobile]);

  const handleToggle = () => {
    wasUserCollapsed.current = !collapsed;
    setCollapsed((prev) => !prev);
  };

  return (
    <Layout style={{ height: '100%' }}>
      <Sider
        collapsed={collapsed}
        collapsible
        trigger={null}
        className={styles.sidebar}
        width={width}
        collapsedWidth={60}
      >
        <div className={styles.sidebarInner}>
          <div className={styles.logo}>
            <Logo className={styles.logoIcon} />
            {!collapsed && <span className={styles.logoTitle}>DCAT CLOUD</span>}
            {!isMobile && (
              <div className={styles.collapsedBtn} onClick={handleToggle}>
                {collapsed ? <MdKeyboardArrowRight /> : <MdKeyboardArrowLeft />}
              </div>
            )}
          </div>
          <div className={styles.scrollWrapper}>
            <MenuList collapsed={collapsed} />
            {/* ✅ 드래그 핸들 추가 */}
          </div>
          {!collapsed && <div className={styles.resizeHandle} onMouseDown={handleMouseDown} />}
        </div>
      </Sider>
    </Layout>
  );
};

export default Sidebar;
