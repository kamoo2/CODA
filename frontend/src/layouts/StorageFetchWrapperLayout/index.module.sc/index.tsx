import { Outlet } from 'react-router-dom';
import { useEffect } from 'react';
import styles from './index.module.scss';
import { useStorageStore } from '@/store/storageStore';

const StorageLayout = () => {
  const { fetchBucketList } = useStorageStore();

  useEffect(() => {
    // storage 관련 진입 시에만 1번 fetch
    fetchBucketList(); // 실제 credential 값으로 교체
  }, []);

  return (
    <div className={styles.container}>
      <Outlet />
    </div>
  );
};

export default StorageLayout;
