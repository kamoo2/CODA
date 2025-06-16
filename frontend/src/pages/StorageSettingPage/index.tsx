import React, { useState, useEffect, useCallback } from 'react';
import clsx from 'clsx';
import { debounce } from 'lodash';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import styles from './index.module.scss';
import { storageService } from '@/apis/services/storageService';
import { useStorageStore } from '@/store/storageStore';
import authService from '@/apis/services/authService';

const wasabiRegions = [
  'us-east-1',
  'us-east-2',
  'us-central-1',
  'us-west-1',
  'us-west-2',
  'eu-central-1',
  'eu-west-1',
  'ca-central-1',
  'ap-northeast-1',
  'ap-southeast-1',
  'ap-southeast-2',
  'sa-east-1',
];

const StorageSettingPage = () => {
  const [accessKey, setAccessKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [region, setRegion] = useState('');
  const [bucketName, setBucketName] = useState('');
  const [bucketNames, setBucketNames] = useState<string[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [selectedBucketId, setSelectedBucketId] = useState<string | null>(null);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [showAccessKey, setShowAccessKey] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [isBucketListLoading, setIsBucketListLoading] = useState(false);

  const { bucketList, bucketDetails, fetchBucketDetails } = useStorageStore();

  //  AccessKey, SecretKey 유효성 검사 (debounced)
  const checkCredentials = useCallback(
    debounce(async (accessKey: string, secretKey: string) => {
      setIsChecking(true);
      const res = await storageService.checkStorageCredentials({ accessKey, secretKey });
      setIsValid(res.success);
      setRegion('');
      setBucketName('');
      setBucketNames([]);
      setIsChecking(false);
    }, 500),
    [],
  );

  useEffect(() => {
    if (accessKey && secretKey) {
      setIsValid(null);
      checkCredentials(accessKey, secretKey);
    }
  }, [accessKey, secretKey, checkCredentials]);

  useEffect(() => {
    return () => checkCredentials.cancel();
  }, [checkCredentials]);

  // bucketList 받아오면 첫번째 bucket 자동 선택
  useEffect(() => {
    const init = async () => {
      if (bucketList?.length) {
        const userRes = await authService.getUserDetails();
        const currentBucketName = userRes.result.currentUsedBucketName;

        // 이름으로 ID 찾기
        const matchedBucket = bucketList.find((b) => b.name === currentBucketName);
        const targetBucketId = matchedBucket?.id || bucketList[0].id;

        setSelectedBucketId(targetBucketId);
        fetchBucketDetails(targetBucketId);
      }
    };

    init();
  }, [bucketList, fetchBucketDetails]);

  const handleDeleteBucketClick = async () => {
    if (!selectedBucketId) {
      alert('버킷을 선택해주세요.');
      return;
    }

    const confirmDelete = window.confirm('DCAT CLOUD에 등록된 버킷 연결을 해제하시겠습니까?');
    if (!confirmDelete) return;

    const res = await storageService.deleteBucket({ bucketId: selectedBucketId });
    if (res.success) {
      toast.success('버킷 등록을 해제했습니다.');
      await useStorageStore.getState().fetchBucketList();
    } else {
      toast.error(res.message);
    }
  };

  // region 변경 시 bucket 목록 가져오기
  const handleRegionChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const r = e.target.value;
    setRegion(r);
    setBucketName('');
    setBucketNames([]);
    setIsBucketListLoading(true); //  시작

    if (accessKey && secretKey && r) {
      const res = await storageService.getStorageBuckets({ accessKey, secretKey, region: r });
      setBucketNames(res.success && Array.isArray(res.result) ? res.result : []);
    }

    setIsBucketListLoading(false); //  끝
  };

  // 저장

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await storageService.saveStorageBuckets({ accessKey, secretKey, region, name: bucketName });

    if (res.success) {
      toast.success('버킷을 등록했습니다.');
      await useStorageStore.getState().fetchBucketList();
      setIsFormVisible(false);
    } else {
      toast.error(
        <>
          등록에 실패했습니다.
          <br />
          {res.message}
        </>,
      );
    }
  };

  // bucket 선택
  const handleBucketClick = (bucketId: string) => {
    setSelectedBucketId(bucketId);
    fetchBucketDetails(bucketId);
    setIsFormVisible(false);
  };

  // 추가 버튼
  const handleAddBucketClick = () => {
    setIsFormVisible(true);
    setSelectedBucketId(null);
    setAccessKey('');
    setSecretKey('');
    setRegion('');
    setBucketName('');
    setBucketNames([]);
    setIsValid(null);

    if (isFormVisible) setSelectedBucketId(null);
  };

  const handleChangeAccessKey = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newKey = e.target.value;
    setAccessKey(newKey);
    setIsValid(null);
    setRegion('');
    setBucketName('');
    setBucketNames([]);
    checkCredentials(newKey, secretKey); // 인증 다시 시작
  };

  const handleChangeSecretKey = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newKey = e.target.value;
    setSecretKey(newKey);
    setIsValid(null);
    setRegion('');
    setBucketName('');
    setBucketNames([]);
    checkCredentials(accessKey, newKey); // 인증 다시 시작
  };

  return (
    <div className={styles.container}>
      {/* Bucket List */}
      <div className={styles.filesContainer}>
        <div className={styles.bucketAddButton} onClick={handleAddBucketClick}>
          {' '}
          +{' '}
        </div>
        {bucketList?.length ? (
          bucketList.map((bucket) => (
            <div
              key={bucket.id}
              className={clsx(styles.bucketItem, { [styles.selected]: bucket.id === selectedBucketId })}
              onClick={() => handleBucketClick(bucket.id)}
            >
              {bucket.name}
            </div>
          ))
        ) : (
          <div className={styles.empty}>No Buckets</div>
        )}
      </div>

      {isFormVisible || !bucketList?.length ? (
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label>Access Key</label>
            <input
              className={clsx(styles.input, { [styles.valid]: isValid, [styles.invalid]: isValid === false })}
              value={accessKey}
              onChange={handleChangeAccessKey}
            />
          </div>

          <div className={styles.inputGroup}>
            <label>Secret Key</label>
            <input
              className={clsx(styles.input, { [styles.valid]: isValid, [styles.invalid]: isValid === false })}
              value={secretKey}
              onChange={handleChangeSecretKey}
            />
          </div>

          <div className={styles.authStatus}>
            {isChecking ? '🔄 인증 중...' : isValid !== null && (isValid ? '✅ 인증 성공' : '❌ 인증 실패')}
          </div>

          {isValid && (
            <>
              <div className={styles.inputGroup}>
                <label>Region</label>
                <select value={region} className={styles.RegionInput} onChange={handleRegionChange}>
                  <option value="">Select Region</option>
                  {wasabiRegions.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.inputGroup}>
                <label>Bucket Name</label>
                <select
                  value={bucketName}
                  className={styles.BucketInput}
                  onChange={(e) => setBucketName(e.target.value)}
                  disabled={isBucketListLoading || !bucketNames.length}
                >
                  {isBucketListLoading ? (
                    <option value="">🔄 버킷 목록 불러오는 중...</option>
                  ) : (
                    <>
                      <option value="">Select Bucket</option>
                      {bucketNames.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </>
                  )}
                </select>
              </div>
            </>
          )}

          <div className={styles.submitWrapper}>
            <button className={styles.submitButton} type="submit" disabled={!isValid}>
              등록
            </button>
          </div>
        </form>
      ) : (
        <div className={styles.bucketDetail}>
          <div className={styles.inputGroup}>
            <label>Name</label>
            <input className={styles.input} value={bucketDetails?.name || ''} readOnly />
          </div>

          <div className={styles.inputGroup}>
            <label>Region</label>
            <input className={styles.input} value={bucketDetails?.region || ''} readOnly />
          </div>

          {/* Access Key - toggle masking */}
          <div className={styles.inputGroup}>
            <label>Access Key</label>
            <div className={styles.passwordInputWrapper}>
              <input
                className={styles.input}
                type={showAccessKey ? 'text' : 'password'}
                value={bucketDetails?.accessKey || ''}
                readOnly
              />
              <span className={styles.eyeIcon} onClick={() => setShowAccessKey(!showAccessKey)}>
                {showAccessKey ? <FaEyeSlash /> : <FaEye />}
              </span>
            </div>
          </div>

          {/* Secret Key - toggle masking */}
          <div className={styles.inputGroup}>
            <label>Secret Key</label>
            <div className={styles.passwordInputWrapper}>
              <input
                className={styles.input}
                type={showSecretKey ? 'text' : 'password'}
                value={bucketDetails?.secretKey || ''}
                readOnly
              />
              <span className={styles.eyeIcon} onClick={() => setShowSecretKey(!showSecretKey)}>
                {showSecretKey ? <FaEyeSlash /> : <FaEye />}
              </span>
            </div>
          </div>

          <button className={styles.deleteButton} onClick={handleDeleteBucketClick}>
            등록 해제
          </button>
        </div>
      )}
    </div>
  );
};

export default StorageSettingPage;
