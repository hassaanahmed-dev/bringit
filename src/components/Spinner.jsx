export default function Spinner({ label = 'LOADING' }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <div className="w-8 h-8 border-4 border-panel border-t-sky animate-spin" />
      <div className="font-pixel text-[10px] text-fade animate-pulse">{label}</div>
    </div>
  );
}
