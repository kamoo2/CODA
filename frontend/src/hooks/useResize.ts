import { useState, useCallback, useEffect } from 'react';

const useSidebarResize = (minWidth = 300, maxWidth = 600) => {
  const [width, setWidth] = useState(minWidth);
  const [isResizing, setIsResizing] = useState(false);

  // 마우스 클릭 시 드래그 시작
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  // 마우스 이동 시 사이드바 너비 조정
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing) return;
      let newWidth = e.clientX;
      if (newWidth < minWidth) newWidth = minWidth;
      if (newWidth > maxWidth) newWidth = maxWidth;
      setWidth(newWidth);
    },
    [isResizing, minWidth, maxWidth],
  );

  // 마우스 버튼 떼면 드래그 종료
  const handleMouseUp = useCallback(() => {
    if (isResizing) {
      setIsResizing(false);
    }
  }, [isResizing]);

  // 전역 이벤트 리스너 추가 및 제거
  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  return { width, handleMouseDown };
};

export default useSidebarResize;
