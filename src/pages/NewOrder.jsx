import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import PixelCard from '../components/PixelCard';
import PixelButton from '../components/PixelButton';
import { PICKUP_SHOPS, DELIVERY_ZONES, SHOP_COLORS, MIN_DESCRIPTION_LEN } from '../lib/constants';
import { validateOrder } from '../lib/validate';
import { orders } from '../lib/backend';
import { ROUTES } from '../lib/routes';

const TEXTAREA_PLACEHOLDER =
  'Describe what you want, which shop, any extras. Be specific so your rider knows exactly what to get...';

export default function NewOrder() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [description, setDescription] = useState('');
  const [shops, setShops] = useState([]);
  const [zone, setZone] = useState(null);
  const [deliveryNote, setDeliveryNote] = useState('');
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const toggleShop = (name) =>
    setShops((s) => (s.includes(name) ? s.filter((x) => x !== name) : [...s, name]));

  const pickZone = (z) => {
    setZone(z);
    setErrors((e) => ({ ...e, zone: undefined, deliveryNote: undefined }));
  };

  const submit = async () => {
    const check = validateOrder({ description, shops, zone, deliveryNote });
    if (!check.ok) {
      setErrors({ [check.field]: check.message });
      toast(check.message, 'error');
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      const id = await orders.createOrder({
        customerId: user.uid,
        customerName: user.name,
        customerPhone: user.phone,
        customerOrderCount: user.customerOrderCount,
        description,
        shops,
        zoneId: zone.id,
        zoneName: zone.name,
        deliveryFee: zone.fee,
        deliveryNote,
      });
      setBusy(false);
      toast('Order dropped into the feed', 'success');
      navigate(ROUTES.ORDER(id));
    } catch (e) {
      setBusy(false);
      toast('Could not create order. Try again.', 'error');
    }
  };

  const total = zone ? zone.fee : 0;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-pixel text-[13px] text-cream">NEW ORDER</h1>
        <p className="font-crt text-fade text-lg">What does the campus need you to grab?</p>
      </div>

      <PixelCard>
        <div className="font-pixel text-[10px] text-sky mb-3">1 · DESCRIBE YOUR ORDER</div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={TEXTAREA_PLACEHOLDER}
          rows={4}
          className={[
            'w-full bg-ink border-2 px-3 py-3 text-cream font-crt text-xl outline-none resize-none',
            'placeholder:text-fade/50 placeholder:text-base caret-brand blink-caret',
            errors.description ? 'border-danger' : 'border-line focus:border-sky',
          ].join(' ')}
        />
        <div className="flex justify-between mt-2">
          <span className="font-pixel text-[9px] text-danger">
            {errors.description ? `!! ${errors.description}` : ''}
          </span>
          <span
            className={`font-pixel text-[9px] ${
              description.length >= MIN_DESCRIPTION_LEN ? 'text-leaf' : 'text-fade'
            }`}
          >
            {description.length}/{MIN_DESCRIPTION_LEN}+ CHARS
          </span>
        </div>
      </PixelCard>

      <PixelCard>
        <div className="font-pixel text-[10px] text-sky mb-3">2 · PICK SHOPS (MULTI)</div>
        <div className="grid grid-cols-2 gap-2">
          {PICKUP_SHOPS.map((name) => {
            const on = shops.includes(name);
            const color = SHOP_COLORS[name];
            return (
              <button
                key={name}
                type="button"
                onClick={() => toggleShop(name)}
                className={[
                  'tap font-pixel text-[10px] px-3 py-3 border-2 transition-colors cursor-pointer text-left',
                  on
                    ? 'text-black border-black shadow-[3px_3px_0_rgba(0,0,0,0.6)]'
                    : 'bg-panel-2 text-fade border-line hover:border-cream',
                ].join(' ')}
                style={on ? { backgroundColor: color } : undefined}
              >
                <span className="block">{on ? '▣' : '▢'} {name}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-2 font-pixel text-[9px] text-danger">
          {errors.shops ? `!! ${errors.shops}` : ''}
        </div>
      </PixelCard>

      <PixelCard>
        <div className="font-pixel text-[10px] text-sky mb-3">3 · DELIVERY ZONE</div>
        <div className="flex flex-col gap-2">
          {DELIVERY_ZONES.map((z) => {
            const on = zone?.id === z.id;
            return (
              <button
                key={z.id}
                type="button"
                onClick={() => pickZone(z)}
                className={[
                  'tap flex items-center justify-between px-3 py-2.5 border-2 cursor-pointer font-pixel text-[10px]',
                  on
                    ? 'bg-sky text-black border-black shadow-[3px_3px_0_rgba(0,0,0,0.6)]'
                    : 'bg-panel-2 text-fade border-line hover:border-cream',
                ].join(' ')}
              >
                <span className="flex items-center gap-2">
                  <span>{on ? '▣' : '▢'}</span> {z.name.toUpperCase()}
                </span>
                <span className={on ? 'text-black' : 'text-gold'}>Rs {z.fee}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-2 font-pixel text-[9px] text-danger">
          {errors.zone ? `!! ${errors.zone}` : ''}
        </div>

        {zone && (
          <div className="mt-4 step-in">
            <label className="font-pixel text-[10px] text-cream block mb-2">
              EXACT SPOT IN {zone.name.toUpperCase()}
            </label>
            <input
              type="text"
              value={deliveryNote}
              onChange={(e) => setDeliveryNote(e.target.value)}
              placeholder="(room no, floor no, lab no, or anything)"
              maxLength={80}
              className={[
                'w-full bg-ink border-2 px-3 py-3 text-cream font-crt text-xl outline-none',
                'placeholder:text-fade/50 placeholder:text-base caret-brand blink-caret',
                errors.deliveryNote ? 'border-danger' : 'border-line focus:border-sky',
              ].join(' ')}
            />
            <div className="mt-2 font-pixel text-[9px]">
              <span className={errors.deliveryNote ? 'text-danger' : 'text-fade'}>
                {errors.deliveryNote ? `!! ${errors.deliveryNote}` : 'RIDER WILL SEE THIS TO FIND YOU'}
              </span>
              <span className="float-right text-fade">{deliveryNote.length}/80</span>
            </div>
          </div>
        )}
      </PixelCard>

      <PixelCard tone="highlight">
        <div className="font-pixel text-[10px] text-gold mb-3">4 · ORDER SUMMARY</div>
        <div className="flex flex-col gap-2 font-crt text-lg">
          <div className="flex justify-between">
            <span className="text-fade">Shops</span>
            <span className="text-cream text-right">
              {shops.length ? shops.join(', ') : '— none —'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-fade">Zone</span>
            <span className="text-cream">{zone ? `${zone.name}` : '— pick zone —'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-fade">Drop spot</span>
            <span className="text-cream text-right">
              {zone && deliveryNote ? deliveryNote : '— fill spot —'}
            </span>
          </div>
          <div className="flex justify-between items-baseline border-t-2 border-line pt-2">
            <span className="text-fade">Delivery fee</span>
            <span className="font-pixel text-[16px] text-gold">Rs {total}</span>
          </div>
          <p className="text-fade text-base italic break-words">
            “{description.trim() || 'no description yet'}”
          </p>
        </div>
        <div className="mt-4">
          <PixelButton block onClick={submit} disabled={busy}>
            {busy ? 'SENDING...' : `Confirm Order — Rs ${total}`}
          </PixelButton>
        </div>
      </PixelCard>
    </div>
  );
}
