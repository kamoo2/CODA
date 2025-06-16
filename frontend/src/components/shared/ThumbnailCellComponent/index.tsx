import { createPortal } from 'react-dom';
import { useCallback, useEffect, useRef, useState } from 'react';
import styles from './index.module.scss';

interface ThumbnailCellProps {
  thumbnailUrl: string;
}

const ThumbnailCell = ({ thumbnailUrl }: ThumbnailCellProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);

  // 마우스 움직임을 추적하는 함수
  const handleMouseMove = useCallback((e: MouseEvent) => {
    setMousePosition({ x: e.clientX, y: e.clientY });
  }, []);

  // hover 상태 설정
  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  // 마우스 움직임을 윈도우에서 계속 추적
  useEffect(() => {
    if (isHovered) {
      window.addEventListener('mousemove', handleMouseMove);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
    }

    // 컴포넌트 언마운트 시 리스너 정리
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isHovered, handleMouseMove]);

  const calculateTooltipPosition = () => {
    const padding = 10;
    const { x, y } = mousePosition;
    const tooltipWidth = tooltipRef.current?.offsetWidth ?? 0;
    const tooltipHeight = tooltipRef.current?.offsetHeight ?? 0;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    let newX = x + padding; // 기본은 오른쪽
    let newY = y + padding; // 기본은 아래쪽

    // 오른쪽 공간이 부족하면 왼쪽으로
    if (x + tooltipWidth + padding > windowWidth) {
      newX = x - tooltipWidth - padding;
    }

    // 아래 공간이 부족하면 위로
    if (y + tooltipHeight + padding > windowHeight) {
      newY = y - tooltipHeight - padding;
    }

    // (추가 보정) 화면 밖으로 나가는 걸 막기
    if (newX < 0) newX = 0;
    if (newY < 0) newY = 0;

    return { left: newX, top: newY };
  };

  const position = calculateTooltipPosition();

  return (
    <>
      <div className={styles.thumbnailWrapper} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
        <img src={thumbnailUrl} alt="thumbnail" className={styles.thumbnailImage} />
      </div>

      {isHovered &&
        createPortal(
          <div
            ref={tooltipRef}
            className={styles.tooltip}
            style={{
              position: 'fixed',
              top: position.top,
              left: position.left,
              zIndex: 9999,
              transition: 'top 0.1s ease, left 0.1s ease', // 부드러운 위치 변경 애니메이션
            }}
          >
            <img className={styles.tooltipImage} src={thumbnailUrl} alt="large-preview" />
          </div>,
          document.getElementById('modal-root')!, // 반드시 index.html에 추가해야 함
        )}
    </>
  );
};

export default ThumbnailCell;
