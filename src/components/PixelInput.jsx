export default function PixelInput({
  label,
  type = 'text',
  error,
  hint,
  className = '',
  ...rest
}) {
  return (
    <label className="block w-full">
      {label && (
        <span className="font-pixel text-[10px] text-fade uppercase block mb-2">{label}</span>
      )}
      <input
        type={type}
        className={[
          'w-full bg-ink border-2 px-3 py-3 text-cream font-crt text-xl outline-none',
          'placeholder:text-fade/50 placeholder:text-base',
          'focus:border-sky transition-colors',
          error ? 'border-danger' : 'border-line',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...rest}
      />
      {error && (
        <span className="block mt-2 font-pixel text-[10px] text-danger">!! {error}</span>
      )}
      {hint && !error && (
        <span className="block mt-2 font-pixel text-[10px] text-fade">{hint}</span>
      )}
    </label>
  );
}
