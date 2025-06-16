import React, { useRef, useState } from 'react';
import styles from './index.module.scss';

interface Props {
  packages: string[];
  onInstallPackage: (packageName: string) => void;
  onRemovePackage: (packageName: string) => void;
}

export default function PackageManagerComponent({ packages, onInstallPackage, onRemovePackage }: Props) {
  const [packageName, setPackageName] = useState<string>('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  // 설치 버튼 클릭 핸들러
  const handleInstall = async () => {
    if (!packageName) return;

    onInstallPackage(packageName);
    setPackageName('');
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className={styles.container}>
      <h3 className={styles.sectionTitle}>📦 패키지 관리</h3>
      <input
        ref={inputRef}
        className={styles.input}
        value={packageName}
        onChange={(e) => setPackageName(e.target.value)}
        placeholder="패키지명"
      />
      <button className={styles.installButton} onClick={handleInstall}>
        설치
      </button>

      <ul className={styles.list}>
        {packages.map((pkg) => (
          <li className={styles.listItem} key={pkg}>
            {pkg}
            <button className={styles.deleteButton} onClick={() => onRemovePackage(pkg)}>
              ❌
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
