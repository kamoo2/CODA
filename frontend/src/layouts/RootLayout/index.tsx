import { Outlet } from 'react-router-dom';
import styles from './index.module.scss';
import Header from '@/components/common/Header';
import Sidebar from '@/components/common/Sidebar';

const RootLayout = () => {
  return (
    <div className={styles.rootLayout}>
      <div className={styles.sidebarWrapper}>
        <Sidebar />
      </div>
      <div className={styles.mainContent}>
        <div className={styles.headerWrapper}>
          <Header />
        </div>
        <div className={styles.outletWrapper}>
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default RootLayout;
