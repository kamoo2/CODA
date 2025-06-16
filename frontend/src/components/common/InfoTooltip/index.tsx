// InfoTooltip.tsx
import React from 'react';
import { AiOutlineInfoCircle } from 'react-icons/ai';
import styles from './index.module.scss';

interface InfoTooltipProps {
  text: string;
}

const InfoTooltip = ({ text }: InfoTooltipProps) => {
  return (
    <div className={styles.tooltip}>
      <AiOutlineInfoCircle size={16} />
      <span className={styles.tooltipText}>{text}</span>
    </div>
  );
};

export default InfoTooltip;
