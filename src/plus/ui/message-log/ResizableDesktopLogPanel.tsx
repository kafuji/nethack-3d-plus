import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { plusStrings } from "../../../ui/app/shared/translations";
import {
  clampDesktopLogExtraSize,
  loadDesktopLogExtraSize,
  saveDesktopLogExtraSize,
  type DesktopLogExtraSize,
} from "./desktop-log-size";
import "./resizable-desktop-log.scss";

// Keep the panel's bottom-right corner this far inside the viewport.
const viewportMarginPx = 10;

interface DragState {
  readonly pointerId: number;
  readonly startX: number;
  readonly startY: number;
  readonly startSize: DesktopLogExtraSize;
  readonly maxSize: DesktopLogExtraSize;
  // Latest size of this drag; pointerup can arrive before React re-renders.
  size: DesktopLogExtraSize;
}

export interface ResizableDesktopLogPanelProps {
  readonly className: string;
  /** The terminal gutter variant fills its column and is not resizable. */
  readonly resizable: boolean;
  readonly children: ReactNode;
}

/**
 * Top-left desktop message log box with a bottom-right drag handle. The
 * default size is the minimum; extra width/height are stored per device.
 */
export function ResizableDesktopLogPanel({
  className,
  resizable,
  children,
}: ResizableDesktopLogPanelProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const [extraSize, setExtraSize] = useState<DesktopLogExtraSize>(
    loadDesktopLogExtraSize,
  );

  // Shrink a stored size that no longer fits after the window got smaller.
  useEffect(() => {
    if (!resizable || typeof window === "undefined") {
      return;
    }
    const fitToViewport = (): void => {
      const panel = panelRef.current;
      if (!panel) {
        return;
      }
      const rect = panel.getBoundingClientRect();
      const overflowX = rect.right - (window.innerWidth - viewportMarginPx);
      const overflowY = rect.bottom - (window.innerHeight - viewportMarginPx);
      if (overflowX <= 0 && overflowY <= 0) {
        return;
      }
      setExtraSize((previous) =>
        clampDesktopLogExtraSize({
          width: previous.width - Math.max(0, overflowX),
          height: previous.height - Math.max(0, overflowY),
        }),
      );
    };
    fitToViewport();
    window.addEventListener("resize", fitToViewport);
    return () => window.removeEventListener("resize", fitToViewport);
  }, [resizable]);

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>): void => {
      const panel = panelRef.current;
      if (!panel || event.button !== 0) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      const rect = panel.getBoundingClientRect();
      dragRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startSize: extraSize,
        size: extraSize,
        maxSize: {
          width:
            extraSize.width +
            Math.max(0, window.innerWidth - viewportMarginPx - rect.right),
          height:
            extraSize.height +
            Math.max(0, window.innerHeight - viewportMarginPx - rect.bottom),
        },
      };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [extraSize],
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>): void => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) {
        return;
      }
      event.preventDefault();
      const next = clampDesktopLogExtraSize({
        width: Math.min(
          drag.maxSize.width,
          drag.startSize.width + event.clientX - drag.startX,
        ),
        height: Math.min(
          drag.maxSize.height,
          drag.startSize.height + event.clientY - drag.startY,
        ),
      });
      drag.size = next;
      setExtraSize((previous) =>
        previous.width === next.width && previous.height === next.height
          ? previous
          : next,
      );
    },
    [],
  );

  const finishDrag = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>): void => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) {
        return;
      }
      dragRef.current = null;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      saveDesktopLogExtraSize(drag.size);
    },
    [],
  );

  const handleDoubleClick = useCallback((): void => {
    const reset = { width: 0, height: 0 };
    setExtraSize(reset);
    saveDesktopLogExtraSize(reset);
  }, []);

  if (!resizable) {
    return <div className={className}>{children}</div>;
  }

  const style = {
    "--nh3d-plus-log-extra-width": `${extraSize.width}px`,
    "--nh3d-plus-log-extra-height": `${extraSize.height}px`,
  } as CSSProperties;
  const resizedClass =
    extraSize.height > 0 ? " nh3d-plus-log-height-resized" : "";

  return (
    <div
      className={`${className} nh3d-plus-resizable-log${resizedClass}`}
      ref={panelRef}
      style={style}
    >
      {children}
      <div
        aria-hidden="true"
        className="nh3d-plus-log-resize-handle"
        onDoubleClick={handleDoubleClick}
        onLostPointerCapture={finishDrag}
        onPointerCancel={finishDrag}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishDrag}
        title={plusStrings.messageLog.resizeHandle}
      />
    </div>
  );
}
