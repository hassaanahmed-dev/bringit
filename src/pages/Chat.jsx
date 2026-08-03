import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PixelCard from '../components/PixelCard';
import PixelButton from '../components/PixelButton';
import { chat, orders } from '../lib/backend';
import { formatTime } from '../lib/rank';
import { ROUTES } from '../lib/routes';

export default function Chat() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [order, setOrder] = useState(null);
  const [text, setText] = useState('');
  const [denied, setDenied] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    let active = true;
    const off = [];
    chat.canAccessThread(id, user.uid).then((allowed) => {
      if (!active) return;
      if (!allowed) {
        setDenied(true);
        return;
      }
      off.push(orders.listenOrder(id, setOrder));
      off.push(chat.listenMessages(id, setMessages));
    });
    return () => {
      active = false;
      off.forEach((fn) => fn && fn());
    };
  }, [id, user.uid]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length]);

  const otherName = order ? (order.customerId === user.uid ? order.riderName : order.customerName) : null;

  const send = async () => {
    if (!text.trim()) return;
    const res = await chat.sendMessage(id, { uid: user.uid, name: user.name }, text);
    if (res.ok) setText('');
  };

  if (denied) {
    return (
      <PixelCard>
        <div className="font-pixel text-[11px] text-danger mb-2">ACCESS DENIED</div>
        <p className="font-crt text-fade text-lg mb-4">You're not part of this thread.</p>
        <PixelButton variant="sky" block onClick={() => navigate(ROUTES.HOME)}>
          Back Home
        </PixelButton>
      </PixelCard>
    );
  }

  return (
    <div className="flex flex-col gap-2 sm:gap-3 h-[calc(100dvh-7rem)] sm:h-[calc(100dvh-8rem)]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-pixel text-[12px] text-cream">
            CHAT · #{id.slice(0, 6).toUpperCase()}
          </h1>
          <p className="font-crt text-fade text-lg">
            with {otherName ? otherName.toUpperCase() : '...'}
          </p>
        </div>
        <button
          onClick={() => navigate(-1)}
          className="font-pixel text-[10px] text-fade border-2 border-line px-2 py-1.5 hover:border-cream cursor-pointer"
        >
          ← BACK
        </button>
      </div>

      <PixelCard className="flex-1 flex flex-col overflow-hidden !p-0">
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2" style={{ minHeight: 0 }}>
          {messages.length === 0 && (
            <div className="text-center my-auto">
              <div className="font-pixel text-2xl text-fade mb-2">≡</div>
              <p className="font-crt text-fade text-lg">Say hi — coordinate your delivery here.</p>
            </div>
          )}
          {messages.map((m) => {
            const mine = m.senderId === user.uid;
            return (
              <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] border-2 px-3 py-2 ${
                    mine
                      ? 'bg-brand border-black text-black'
                      : 'bg-panel-2 border-line text-cream'
                  }`}
                >
                  <div
                    className={`font-pixel text-[7px] mb-1 ${
                      mine ? 'text-black/70' : 'text-sky'
                    }`}
                  >
                    {mine ? 'YOU' : m.senderName.toUpperCase()}
                  </div>
                  <p className="font-crt text-lg leading-snug break-words">{m.text}</p>
                  <div
                    className={`text-right font-pixel text-[7px] mt-1 ${
                      mine ? 'text-black/60' : 'text-fade/60'
                    }`}
                  >
                    {formatTime(m.createdAt)}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        <div className="border-t-2 border-line p-2 flex gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder="Type a message..."
            maxLength={300}
            className="flex-1 min-w-0 bg-ink border-2 border-line px-2 sm:px-3 py-2 sm:py-2.5 text-cream font-crt text-lg outline-none focus:border-sky placeholder:text-fade/50 caret-brand blink-caret"
          />
          <PixelButton onClick={send} disabled={!text.trim()}>
            SEND
          </PixelButton>
        </div>
      </PixelCard>
    </div>
  );
}
