export default function PixelButton({
  children,
  variant = 'primary',
  block = false,
  small = false,
  disabled = false,
  className = '',
  onClick,
  type = 'button',
  ...rest
}) {
  const variants = {
    primary: 'bg-brand text-black border-black hover:bg-[#ff5c84]',
    sky: 'bg-sky text-black border-black hover:bg-[#63c7ff]',
    leaf: 'bg-leaf text-black border-black hover:bg-[#6cf09a]',
    gold: 'bg-gold text-black border-black hover:bg-[#ffd77a]',
    danger: 'bg-danger text-black border-black hover:bg-[#ff7a88]',
    ghost: 'bg-panel-2 text-cream border-line hover:border-cream',
    outline: 'bg-transparent text-cream border-line hover:bg-panel',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={[
        'font-pixel uppercase cursor-pointer tap transition-transform duration-75 active:translate-y-0.5',
        small ? 'text-[10px] px-3 py-2' : 'text-[11px] px-5 py-3.5',
        block ? 'w-full' : '',
        'border-2 shadow-[4px_4px_0_rgba(0,0,0,0.7)]',
        variants[variant],
        disabled
          ? 'opacity-40 cursor-not-allowed shadow-none translate-y-0.5 active:translate-y-0.5'
          : 'hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0_rgba(0,0,0,0.7)]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {children}
    </button>
  );
}
