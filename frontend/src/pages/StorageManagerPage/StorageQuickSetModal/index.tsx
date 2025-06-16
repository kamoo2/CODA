import React, { useState, useEffect, useCallback } from 'react';
import { MdDelete } from 'react-icons/md';
import { toast } from 'react-toastify';
import styles from './index.module.scss';
import { storageService } from '@/apis/services/storageService';
import authService from '@/apis/services/authService';
import { Bucket } from '@/types/storage';
import ModalFrame from '@/components/common/Modal/ModalFrame';
import { useStorageStore } from '@/store/storageStore';
interface StorageQuickSetModalProps {
  title: string;
  onOk: (selectedBucketName: string) => void;
  onCancel: () => void;
}

const StorageQuickSetModal = ({ title, onOk, onCancel }: StorageQuickSetModalProps) => {
  const [myBuckets, setMyBuckets] = useState<Bucket[]>([]);
  const [selectedBucketId, setSelectedBucketId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchUserAndBuckets = useCallback(async () => {
    try {
      // 1. 내 정보 조회 (currentUsedBucket 포함)
      const userRes = await authService.getUserDetails();
      console.log('userRes', userRes);
      if (!userRes.success) {
        throw new Error('사용자 정보 또는 버킷 정보 없음');
      }

      const currentBucketName = userRes.result.currentUsedBucketName;

      console.log('currentBucketId', currentBucketName);
      const bucketRes = await storageService.getMyStorageBucketsList();
      if (bucketRes.success && Array.isArray(bucketRes.result)) {
        setMyBuckets(bucketRes.result);

        const match = bucketRes.result.find((b) => b.name === currentBucketName);
        if (match) {
          setSelectedBucketId(match.id);
        }
      }
    } catch (err) {
      console.error('버킷 및 사용자 정보 조회 실패', err);
    }
  }, []);

  const postUsingBucket = useCallback(async (bucketId: string) => {
    try {
      const res = await storageService.assignCurrentBucket({ bucketId });

      if (res.success) {
        console.log('버킷 설정 성공');
      }
    } catch (err) {
      console.error('선택된 버킷 설정 실패', err);
    }
  }, []);

  useEffect(() => {
    fetchUserAndBuckets();
  }, [fetchUserAndBuckets]);
  const handleOk = async () => {
    if (!selectedBucketId) return;

    setIsLoading(true);
    try {
      await postUsingBucket(selectedBucketId);
      const selected = myBuckets.find((b) => b.id === selectedBucketId);
      if (selected) {
        await onOk(selected.name); // ✅ await 처리
      }
    } finally {
      setIsLoading(false); // ✅ 모달이 진짜 닫히는 시점과 스피너 연동됨
    }
  };

  const handleDelete = async (bucketId: string) => {
    if (selectedBucketId === bucketId) {
      toast.error('현재 선택된 버킷은 삭제할 수 없습니다.');
      return;
    }

    const confirmDelete = window.confirm('DCAT CLOUD에 등록된 버킷 연결을 해제하시겠습니까?');
    if (!confirmDelete) return;

    const res = await storageService.deleteBucket({ bucketId });
    if (res.success) {
      toast.success('버킷 등록을 해제했습니다.');
      await useStorageStore.getState().fetchBucketList();
      setMyBuckets((prev) => prev.filter((b) => b.id !== bucketId)); // 삭제된 버킷 UI 반영
    } else {
      toast.error(res.message);
    }
  };

  return (
    <ModalFrame onConfirm={handleOk} onClose={onCancel} title={title} type="confirm">
      <div className={styles.modalContent}>
        <div>
          {myBuckets.length > 0 ? (
            myBuckets.map((bucket) => (
              <div key={bucket.id} className={styles.bucketItem}>
                <span className={styles.bucketName}>{bucket.name}</span>
                <input
                  type="radio"
                  name="bucketRadio"
                  value={bucket.id}
                  checked={selectedBucketId === bucket.id}
                  onChange={() => setSelectedBucketId(bucket.id)}
                  className={styles.radioButton}
                />
                <MdDelete onClick={() => handleDelete(bucket.id)} className={styles.deleteButton} />
              </div>
            ))
          ) : (
            <div>저장하신 버킷이 없습니다.</div>
          )}
        </div>
      </div>
      {isLoading && (
        <div className={styles.loadingOverlay}>
          <div className={styles.spinner} />
          버킷 설정 중...
        </div>
      )}
    </ModalFrame>
  );
};

export default StorageQuickSetModal;
