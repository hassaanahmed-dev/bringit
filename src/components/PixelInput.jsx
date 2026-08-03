import { useState } from 'react';

export default function PixelInput({
  label,
  type = 'text',
  error,
  hint,
  className = '',
  ...rest
}) {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword && show ? 'text' : type;

  return (
    <label className="block w-full">
      {label && (
        <span className="font-pixel text-[10px] text-fade uppercase block mb-2">{label}</span>
      )}
      <div className="relative">
        <input
          type={inputType}
          className={[
            'w-full bg-ink border-2 px-3 py-3 text-cream font-crt text-xl outline-none',
            'placeholder:text-fade/50 placeholder:text-base',
            'focus:border-sky transition-colors',
            error ? 'border-danger' : 'border-line',
            isPassword ? 'pr-16' : '',
            className,
          ]
            .filter(Boolean)
            .join(' ')}
          {...rest}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? 'Hide password' : 'Show password'}
            aria-pressed={show}
            className="absolute right-2 top-1/2 -translate-y-1/2 font-pixel text-[8px] text-fade border-2 border-line px-1.5 py-1 hover:border-sky hover:text-sky cursor-pointer"
          >
            {show ? 'HIDE' : 'SHOW'}
          </button>
        )}
      </div>
      {error && (
        <span className="block mt-2 font-pixel text-[10px] text-danger">!! {error}</span>
      )}
      {hint && !error && (
        <span className="block mt-2 font-pixel text-[10px] text-fade">{hint}</span>
      )}
    </label>
  );
}
