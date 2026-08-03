import { useEffect } from 'react';

export default function PixelModal({ open, title, children, onClose, footer }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-panel border-4 border-cream shadow-[8px_8px_0_rgba(0,0,0,0.8)] step-in"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {title && (
          <div className="flex items-center justify-between bg-brand px-4 py-3 border-b-4 border-black">
            <h2 className="font-pixel text-[12px] text-black">{title}</h2>
            {onClose && (
              <button
                onClick={onClose}
                className="font-pixel text-[12px] text-black border-2 border-black px-2 py-0.5 bg-black/10 hover:bg-black hover:text-cream"
                aria-label="Close"
              >
                X
              </button>
            )}
          </div>
        )}
        <div className="p-5">{children}</div>
        {footer && <div className="px-5 pb-5">{footer}</div>}
      </div>
    </div>
  );
}
