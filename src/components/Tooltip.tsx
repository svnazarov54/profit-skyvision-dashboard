import clsx from 'clsx';
import { createPortal } from 'react-dom';
import { useCallback, useRef, useState, type ReactNode } from 'react';

type TipSide = 'top' | 'bottom';

interface TipProps {
  content: ReactNode;
  children: ReactNode;
  side?: TipSide;
  className?: string;
  maxWidth?: number;
}

export function Tip({
  content,
  children,
  side = 'top',
  className,
  maxWidth = 280,
}: TipProps) {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });

  const show = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setCoords({
      x: rect.left + rect.width / 2,
      y: side === 'top' ? rect.top - 8 : rect.bottom + 8,
    });
    setVisible(true);
  }, [side]);

  const hide = useCallback(() => setVisible(false), []);

  if (!content) {
    return <>{children}</>;
  }

  return (
    <>
      <span
        ref={anchorRef}
        className={clsx('inline-flex max-w-full', className)}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
      >
        {children}
      </span>
      {visible &&
        createPortal(
          <div
            className="pointer-events-none fixed z-[9999] animate-none"
            style={{
              left: coords.x,
              top: coords.y,
              transform: side === 'top' ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
              maxWidth,
            }}
            role="tooltip"
          >
            <div className="rounded-xl border border-[#E5E7EB] bg-[#111827] px-3 py-2 text-xs leading-relaxed text-white shadow-xl shadow-black/20">
              {content}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

interface HintProps {
  text: string;
}

/** Small “?” hint icon with instant tooltip */
export function Hint({ text }: HintProps) {
  return (
    <Tip content={text}>
      <span className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full bg-[#F1F5F9] text-[10px] font-semibold text-[#6B7280] hover:bg-[#E5E7EB] hover:text-[#111827]">
        ?
      </span>
    </Tip>
  );
}
