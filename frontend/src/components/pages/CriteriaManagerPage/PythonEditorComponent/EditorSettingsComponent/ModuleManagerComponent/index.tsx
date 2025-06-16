import React, { useState, useRef } from 'react';
import styles from './index.module.scss';

interface Props {
  modules: string[];
  onUploadModule: (fileName: string, fileData: Uint8Array) => void;
  onRemoveModlue: (fileName: string) => void;
}

export default function ModuleManagerComponent({ modules, onUploadModule: onUpload, onRemoveModlue: onRemove }: Props) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // 모듈 파일 선택 핸들러
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
  };

  // 업로드 버튼 클릭 핸들러
  const handleUpload = async () => {
    if (!selectedFile) return;

    const arrayBuffer = await selectedFile.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    onUpload(selectedFile.name, uint8Array);

    setSelectedFile(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className={styles.container}>
      <h3 className={styles.sectionTitle}>📂 모듈 등록</h3>
      <input ref={inputRef} type="file" accept=".py" onChange={handleFileSelect} />
      <button onClick={handleUpload}>업로드</button>

      <ul className={styles.list}>
        {modules.map((mod) => (
          <li key={mod} className={styles.listItem}>
            {mod}
            <button className={styles.deleteButton} onClick={() => onRemove(mod)}>
              ❌
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
