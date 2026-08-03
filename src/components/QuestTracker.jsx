import { ORDER_LIFECYCLE, ORDER_STATUS } from '../lib/constants';

const STAGE_GLYPHS = ['▣', '◉', '≡', '◎', '⚑'];
const STAGE_LABELS = ['PLACED', 'OPEN', 'ACCEPTED', 'PAID', 'DELIVERED'];

export default function QuestTracker({ status }) {
  const activeIdx = ORDER_LIFECYCLE.indexOf(status);

  if (status === ORDER_STATUS.CANCELLED) {
    return (
      <div className="border-2 border-danger bg-danger/10 p-4 text-center">
        <div className="font-pixel text-danger text-xs mb-2">QUEST ABORTED</div>
        <div className="font-crt text-cream text-xl">This order was cancelled.</div>
      </div>
    );
  }

  return (
    <div className="pixel-border pixel-shadow bg-panel-2 p-3 sm:p-4">
      <div className="font-pixel text-[9px] text-fade mb-4">DELIVERY QUEST</div>
      <div className="relative">
        <div
          className="absolute top-[18px] left-[10%] right-[10%] h-[4px] bg-panel"
          aria-hidden
        />
        <div
          className="absolute top-[18px] left-[10%] h-[4px] bg-sky transition-[width]"
          style={{
            width: activeIdx >= 0 ? `${(activeIdx / (ORDER_LIFECYCLE.length - 1)) * 80 + 10}%` : '10%',
          }}
          aria-hidden
        />
        <div className="relative flex justify-between">
          {ORDER_LIFECYCLE.map((stage, i) => {
            const done = i <= activeIdx;
            const isActive = i === activeIdx && status !== ORDER_STATUS.DELIVERED;
            const color = done
              ? isActive
                ? 'bg-brand text-black'
                : 'bg-sky text-black'
              : 'bg-panel text-fade/40';
            return (
              <div key={stage} className="flex flex-col items-center gap-2">
                <div
                  className={`w-7 h-7 sm:w-9 sm:h-9 flex items-center justify-center font-pixel text-xs sm:text-sm border-2 border-black ${color}`}
                >
                  {STAGE_GLYPHS[i]}
                </div>
                <div
                  className={`font-pixel text-[7px] text-center leading-tight ${
                    done ? (isActive ? 'text-brand' : 'text-sky') : 'text-fade/40'
                  }`}
                >
                  {STAGE_LABELS[i]}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
