import { useEffect, useRef, useState, type CSSProperties } from 'react';

type UseBoardViewportOptions = {
  desktopWidth?: number;
  tvWidth?: number;
  mobileOffset?: number;
  tabletRatio?: number;
  fitBreakpoint?: number;
  minFitScale?: number;
};

export function useBoardViewport(options: UseBoardViewportOptions = {}) {
  const {
    desktopWidth = 256,
    tvWidth = 320,
    mobileOffset = 48,
    tabletRatio = 0.46,
    fitBreakpoint = 768,
    minFitScale = 0.85,
  } = options;

  const [viewportWidth, setViewportWidth] = useState(() => window.innerWidth);
  const boardScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', onResize, { passive: true });
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const isCompactViewport = viewportWidth < 1024;

  // TV: poucas colunas largas e legíveis a distância (as vazias ficam fora; ver KanbanPage).
  const getColumnWidth = (tvMode: boolean, visibleColumns = 5) => {
    if (tvMode) {
      const gap = 12;
      const usable = viewportWidth - 48 - gap * (visibleColumns - 1);
      return Math.max(tvWidth, Math.floor(usable / Math.max(1, visibleColumns)));
    }
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

  const getBoardFit = (params: {
    columnCount: number;
    columnWidth: number;
    gap?: number;
    padding?: number;
    tvMode: boolean;
  }) => {
    const {
      columnCount,
      columnWidth,
      gap = 12,
      padding = viewportWidth < 640 ? 24 : 32,
      tvMode,
    } = params;

    const totalBoardWidth = columnCount * columnWidth + Math.max(0, columnCount - 1) * gap + padding;
    const availableWidth = Math.max(320, viewportWidth - padding);

    if (tvMode || viewportWidth < fitBreakpoint) {
      return {
        fitEnabled: false,
        scale: 1,
        totalBoardWidth,
        wrapperStyle: undefined as CSSProperties | undefined,
        innerStyle: undefined as CSSProperties | undefined,
      };
    }

    const rawScale = availableWidth / totalBoardWidth;
    // Reduzir demais deixa o texto ilegível: abaixo do mínimo o quadro rola na horizontal em escala 1.
    const scale = rawScale < minFitScale ? 1 : Math.min(1, rawScale);
    const fitEnabled = scale < 0.999;

    return {
      fitEnabled,
      scale,
      totalBoardWidth,
      wrapperStyle: fitEnabled
        ? ({
            height: `calc((100vh - 104px) * ${1 / scale})`,
          } as CSSProperties)
        : undefined,
      innerStyle: fitEnabled
        ? ({
            width: `${totalBoardWidth}px`,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          } as CSSProperties)
        : undefined,
    };
  };

  return {
    viewportWidth,
    isCompactViewport,
    boardScrollRef,
    getColumnWidth,
    getBoardFit,
    scrollColumns,
  };
}