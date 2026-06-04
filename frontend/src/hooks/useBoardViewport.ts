import { useEffect, useRef, useState } from 'react';

type UseBoardViewportOptions = {
  desktopWidth?: number;
  tvWidth?: number;
  mobileOffset?: number;
  tabletRatio?: number;
};

export function useBoardViewport(options: UseBoardViewportOptions = {}) {
  const {
    desktopWidth = 256,
    tvWidth = 288,
    mobileOffset = 48,
    tabletRatio = 0.46,
  } = options;

  const [viewportWidth, setViewportWidth] = useState(() => window.innerWidth);
  const boardScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', onResize, { passive: true });
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const isCompactViewport = viewportWidth < 1024;

  const getColumnWidth = (tvMode: boolean) => {
    if (tvMode) return tvWidth;
    if (viewportWidth < 640) return Math.max(250, viewportWidth - mobileOffset);
    if (viewportWidth < 1024) return Math.max(260, Math.min(320, viewportWidth * tabletRatio));
    return desktopWidth;
  };

  const scrollColumns = (direction: 'left' | 'right', columnWidth: number) => {
    if (!boardScrollRef.current) return;
    const offset = Math.max(columnWidth * 0.92, 240);
    boardScrollRef.current.scrollBy({
      left: direction === 'right' ? offset : -offset,
      behavior: 'smooth',
    });
  };

  return {
    viewportWidth,
    isCompactViewport,
    boardScrollRef,
    getColumnWidth,
    scrollColumns,
  };
}