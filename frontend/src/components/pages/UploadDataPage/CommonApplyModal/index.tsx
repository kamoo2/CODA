import React, { useState } from 'react';
import styles from './index.module.scss';
import ModalFrame from '@/components/common/Modal/ModalFrame';
import InfoTooltip from '@/components/common/InfoTooltip';
import { ParserDto } from '@/types/system';
interface CommonApplyModalProps {
  extension: string; // 예: 'csv'
  visible: boolean;
  onClose: () => void;
  onConfirm: (parserName: string, dontAskAgain: boolean) => void;
  parserOptions: ParserDto[];
}

const parserOptions = ['lidar', 'gps', 'video', 'can'];

const CommonApplyModal = ({ extension, visible, onClose, onConfirm, parserOptions }: CommonApplyModalProps) => {
  const [selectedParser, setSelectedParser] = useState('');
  const [dontAskAgain, setDontAskAgain] = useState(false);

  if (!visible) return null;

  return (
    <ModalFrame
      title="같은 확장자 일괄 적용"
      description="선택한 파일 중 동일한 확장자를 가진 파일에 동일한 파서를 적용하시겠습니까?"
      type="confirm"
      onClose={onClose}
      onConfirm={() => onConfirm(selectedParser, dontAskAgain)}
      height="300px"
    >
      <div className={styles.contentDescription}>
        선택한 데이터에 파서를 적용하여 업로드합니다.
        <InfoTooltip
          text={`✅ CSV 파일의 데이터 구조는 각기 다를 수 있습니다. 
모든 파일에 동일한 파서를 적용하면,
 데이터 오류가 발생할 수 있습니다.
개별 파일의 구조를 확인한 후 적절한 파서를 선택하세요.`}
        />
      </div>
      <div className={styles.modalBody}>
        <div className={styles.extensionText}>
          <span>현재 선택한 확장자 : </span> <strong>{extension}</strong>
        </div>

        <select
          className={styles.parserSelect}
          value={selectedParser}
          onChange={(e) => setSelectedParser(e.target.value)}
        >
          <option value="">파서 선택</option>
          {parserOptions
            .filter((parser) => parser.name !== 'VideoParser')
            .map((parser) => (
              <option key={parser.id} value={parser.id}>
                {parser.name}
              </option>
            ))}
        </select>
        {/* 
        <label className={styles.checkboxRow}>
          <input type="checkbox" checked={dontAskAgain} onChange={(e) => setDontAskAgain(e.target.checked)} />
          1분 동안 묻지 않기
        </label> */}
      </div>
    </ModalFrame>
  );
};

export default CommonApplyModal;
