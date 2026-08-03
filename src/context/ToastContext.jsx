import { createContext, useContext, useState, useCallback, useRef } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const toast = useCallback(
    (message, type = 'info') => {
      const id = ++idRef.current;
      setToasts((t) => [...t, { id, message, type }]);
      setTimeout(() => dismiss(id), 3500);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[80] flex flex-col gap-2 w-[92%] max-w-sm">
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({ toast, onDismiss }) {
  const type = toast.type;
  const border = type === 'error' ? 'border-danger' : type === 'success' ? 'border-leaf' : 'border-sky';
  const icon = type === 'error' ? '!!' : type === 'success' ? 'OK' : '!!';
  return (
    <div
      className={`pixel-border pixel-shadow bg-panel-2 border-2 ${border} px-3 py-2 flex items-center gap-2 step-in`}
      onClick={onDismiss}
      role="alert"
    >
      <span className={`font-pixel text-[10px] text-black border-2 border-black px-1.5 py-0.5 ${type === 'error' ? 'bg-danger' : type === 'success' ? 'bg-leaf' : 'bg-sky'}`}>
        {icon}
      </span>
      <span className="font-crt text-lg text-cream leading-tight">{toast.message}</span>
    </div>
  );
}

export const useToast = () => useContext(ToastContext);
