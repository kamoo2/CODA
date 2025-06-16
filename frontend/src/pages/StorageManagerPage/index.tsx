import { Key, useEffect, useState } from 'react';
import { FaCloud } from 'react-icons/fa'; // 클라우드 아이콘
import { set } from 'lodash';
import { toast } from 'react-toastify';
import styles from './index.module.scss';
import { TreeNode, convertToTreeNodes } from '@/types/common';
import FileTree from '@/components/common/FileTree';
import { storageService } from '@/apis/services/storageService';
import StorageQuickSetModal from '@/pages/StorageManagerPage/StorageQuickSetModal/index';
import UploadModal from '@/pages/StorageManagerPage/UploadModal/index';
import StorageTable from '@/pages/StorageManagerPage/StorageTable/index';
import useModal from '@/hooks/useModal';
import authService from '@/apis/services/authService';
import { useStorageStore } from '@/store/storageStore';

const StorageManagerPage = () => {
  const [isUploadModalOpen, openUploadModal, closeUploadModal] = useModal();
  const [isQuickSetModalOpen, openQuickSetModal, closeQuickSetModal] = useModal();

  const [bucketName, setBucketName] = useState<string>(''); // 초기값 제거
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [expandedKeys, setExpandedKeys] = useState<Key[]>([]);
  const [selectedBucket, setSelectedBucket] = useState<string | null>(null);
  const [prefixStr, setPrefixStr] = useState('');
  const [storageBucketId, setBuckstId] = useState<string>(''); // 초기값 제거
  const [storageTableKey, setStorageTableKey] = useState(0);
  const [usedSizeInGB, setUsedSizeInGB] = useState<string>('0.00');
  const bucketList = useStorageStore((state) => state.bucketList);

  const [isTreeLoading, setIsTreeLoading] = useState(false);
  const [isTableLoading, setIsTableLoading] = useState(false);

  // 버킷 목록을 가져오고, isUsed: true인 버킷을 찾기
  const fetchCurrentUserBucket = async () => {
    try {
      const userRes = await authService.getUserDetails();
      if (userRes.success) {
        const bucketName = userRes.result.currentUsedBucketName;
        setBucketName(bucketName);
        bucketList?.forEach((bucket) => {
          if (bucket.name === bucketName) {
            setBuckstId(bucket.id);
            useStorageStore.getState().bucketId = bucket.id;
          }
        });
      } else {
        console.warn('현재 사용 중인 버킷이 없습니다.');
      }
    } catch (err) {
      console.error('사용자 정보 조회 실패:', err);
    }
  };

  const fetchUsage = async () => {
    if (!bucketName) return;

    const res = await storageService.getBucketUsage(bucketName);
    if (res.success) {
      const sizeInBytes = res.result.usedSize;
      const sizeInGB = (sizeInBytes / 1024 / 1024 / 1024).toFixed(3);
      setUsedSizeInGB(sizeInGB);
    }
  };

  // `bucketName`이 설정된 후 해당 버킷의 폴더 트리 가져오기
  const fetchBucketFolders = async (bucketName: string) => {
    try {
      const res = await storageService.getBucketFolders({ bucketName, prefix: '' });
      if (res.success) {
        const folderTree = convertToTreeNodes(res.result);
        setTreeData(folderTree);
      } else {
        console.error('폴더 트리 불러오기 실패:', res.message);
      }
    } catch (err) {
      console.error('API 호출 에러:', err);
    }
  };

  const handleSelect = (selectedKeys: Key[], info: { node: TreeNode }) => {
    setPrefixStr(info.node.key); // TreeNode의 key가 prefixStr처럼 되어 있어야 함
  };

  useEffect(() => {
    fetchCurrentUserBucket();
  }, []);

  // `bucketName`이 설정되면 폴더 트리 가져오기
  useEffect(() => {
    if (!bucketName) return;
    setIsTreeLoading(true);
    setIsTableLoading(true);

    Promise.all([fetchUsage(), fetchBucketFolders(bucketName)]).finally(() => {
      setIsTreeLoading(false);
      setIsTableLoading(false);
    });
  }, [bucketName]);

  const showModal = (bucketName: string) => {
    setSelectedBucket(bucketName);
    openQuickSetModal(); // 이거만 바뀜!
  };
  const handleQuickSetOk = async (newBucketName: string) => {
    setBucketName(newBucketName);
    setIsTreeLoading(true);
    setIsTableLoading(true);

    await fetchBucketFolders(newBucketName);
    setPrefixStr('');
    closeQuickSetModal();

    setIsTreeLoading(false);
    setIsTableLoading(false);

    toast.success('버킷을 변경했습니다.');
  };

  const handleUploadOk = async () => {
    // 업로드 후 처리 로직
    closeUploadModal();
    setStorageTableKey((prev) => prev + 1); //  리렌더링 트리거
  };

  const handleQuickSetCancel = () => {
    closeQuickSetModal();
  };

  const handleUploadCancel = () => {
    closeUploadModal();
  };

  const handleExpand = (keys: Key[], info: { node: TreeNode; expanded: boolean }) => {
    setExpandedKeys(keys);
  };
  const showInitBucket = () => {
    setPrefixStr('');
  };
  const handleTableSelectPrefix = (prefix: string) => {
    setPrefixStr(prefix); // 선택된 key
    setExpandedKeys((prev) => {
      // 중복 방지
      if (prev.includes(prefix)) return prev;
      return [...prev, prefix];
    });
  };
  const startLoading = () => {
    setIsTreeLoading(true);
    setIsTableLoading(true);
  };

  const endLoading = () => {
    setIsTreeLoading(false);
    setIsTableLoading(false);
  };

  return (
    <div className={styles.container}>
      <div className={styles.sideContainer}>
        <div className={styles.sideHeader}>
          {' '}
          <div className={styles.bucketName} onClick={showInitBucket}>
            {bucketName}
          </div>
          {isTreeLoading ? (
            <div className={styles.loadingMessage}>loading...</div>
          ) : (
            <FileTree treeData={treeData} onExpand={handleExpand} onSelect={handleSelect} selectedKeys={[prefixStr]} />
          )}
        </div>

        <div className={styles.bucketUsageBox} onClick={() => showModal(bucketName)}>
          <div className={styles.bucketHeader}>
            <FaCloud className={styles.cloudIcon} />
            <span className={styles.bucketName}>{bucketName}</span>
          </div>
          <div className={styles.usageText}>사용량 : {usedSizeInGB} GB</div>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.contentHeader}>
          {isTableLoading ? (
            <span></span>
          ) : (
            <button onClick={openUploadModal} disabled={isTreeLoading}>
              Upload
            </button>
          )}
        </div>

        {!bucketName || isTableLoading ? (
          <div className={styles.loadingOverlay}>
            <div className={styles.spinner} />
            데이터 불러오는 중...
          </div>
        ) : (
          <StorageTable
            key={storageTableKey}
            bucketName={bucketName}
            prefixStr={prefixStr}
            onChangePrefix={handleTableSelectPrefix}
          />
        )}
      </div>
      {isUploadModalOpen && (
        <UploadModal title="업로드" onOk={handleUploadOk} onCancel={handleUploadCancel} bucketName={bucketName} />
      )}

      {isQuickSetModalOpen && (
        <StorageQuickSetModal title="퀵 버킷 설정" onOk={handleQuickSetOk} onCancel={handleQuickSetCancel} />
      )}
    </div>
  );
};
//                <TableComponent columns={criteriaTableColumns} data={scoreEvalCrts} />

export default StorageManagerPage;
