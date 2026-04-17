interface DiamondProps {
  batterName?: string | null;
  firstName?: string | null;
  secondName?: string | null;
  thirdName?: string | null;
  outs: number;
  balls: number;
  strikes: number;
  compact?: boolean;
  onBaseTap?: (base: 'first' | 'second' | 'third') => void;
}

function initials(name?: string | null): string {
  if (!name) return '';
  const parts = name.trim().split(/\s+/);
  const a = parts[0]?.[0] ?? '';
  const b = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (a + b).toUpperCase();
}

export default function Diamond({
  batterName,
  firstName,
  secondName,
  thirdName,
  compact = false,
  onBaseTap
}: DiamondProps) {
  // viewBox is 320x320. Home plate bottom-center, 2B top-center.
  return (
    <div className={`relative mx-auto ${compact ? 'max-w-[220px]' : 'max-w-[300px]'} w-full max-h-full aspect-square select-none`}>
      <svg viewBox="0 0 320 320" className="absolute inset-0 w-full h-full drop-shadow-md">
        <defs>
          <radialGradient id="grass" cx="50%" cy="100%" r="100%">
            <stop offset="0%" stopColor="#4ade80" />
            <stop offset="55%" stopColor="#15803d" />
            <stop offset="100%" stopColor="#0b3a1f" />
          </radialGradient>
          <linearGradient id="dirt" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#e0a972" />
            <stop offset="100%" stopColor="#a15e2a" />
          </linearGradient>
          <pattern id="grassStripes" patternUnits="userSpaceOnUse" width="16" height="16" patternTransform="rotate(20)">
            <rect width="16" height="16" fill="url(#grass)" />
            <rect width="8" height="16" fill="rgba(0,0,0,0.06)" />
          </pattern>
        </defs>

        {/* Outfield (fan shape from home plate) */}
        <path
          d="M 160 300 L 316 170 A 160 160 0 0 0 4 170 Z"
          fill="url(#grassStripes)"
          stroke="#ffffff"
          strokeOpacity="0.25"
          strokeWidth="1"
        />

        {/* Foul lines */}
        <line x1="160" y1="300" x2="315" y2="165" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="2" />
        <line x1="160" y1="300" x2="5" y2="165" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="2" />

        {/* Infield dirt — full diamond */}
        <polygon
          points="160,105 255,200 160,295 65,200"
          fill="url(#dirt)"
          stroke="#ffffff"
          strokeOpacity="0.4"
          strokeWidth="2"
        />

        {/* Inner grass */}
        <polygon
          points="160,150 215,205 160,260 105,205"
          fill="url(#grass)"
        />

        {/* Mound */}
        <circle cx="160" cy="205" r="14" fill="url(#dirt)" stroke="#ffffff" strokeOpacity="0.4" />
        <circle cx="160" cy="205" r="4" fill="#ffffff" fillOpacity="0.7" />

        {/* Base paths dust lines */}
        <path
          d="M 160 295 L 255 200 M 255 200 L 160 105 M 160 105 L 65 200 M 65 200 L 160 295"
          stroke="#ffffff"
          strokeOpacity="0.5"
          strokeWidth="2"
          strokeDasharray="4 4"
        />
      </svg>

      {/* Bases + runners overlaid with HTML for interactivity */}
      <BaseMarker x="50%" y="32.8%" name={secondName} onTap={onBaseTap ? () => onBaseTap('second') : undefined} />
      <BaseMarker x="79.7%" y="62.5%" name={firstName} onTap={onBaseTap ? () => onBaseTap('first') : undefined} />
      <BaseMarker x="20.3%" y="62.5%" name={thirdName} onTap={onBaseTap ? () => onBaseTap('third') : undefined} />
      <BaseMarker x="50%" y="92.2%" name={batterName} home />
    </div>
  );
}

function BaseMarker({
  x,
  y,
  name,
  home = false,
  onTap
}: {
  x: string;
  y: string;
  name?: string | null;
  home?: boolean;
  onTap?: () => void;
}) {
  const occupied = !!name;
  const Wrapper: 'button' | 'div' = onTap && occupied ? 'button' : 'div';

  const filledGrad = home
    ? 'bg-gradient-to-br from-emerald-400 to-emerald-700'
    : 'bg-gradient-to-br from-phil-maroonLight to-phil-maroonDark';
  const emptyLook = 'bg-white/95';

  return (
    <Wrapper
      onClick={onTap && occupied ? onTap : undefined}
      style={{ left: x, top: y }}
      className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-auto ${
        onTap && occupied ? 'cursor-pointer active:scale-95 transition' : ''
      }`}
    >
      <div
        className={`h-9 w-9 rotate-45 rounded-[5px] border-2 border-white flex items-center justify-center
          ${occupied ? filledGrad : emptyLook}
          ${occupied ? 'animate-pop-in shadow-lg' : 'shadow'}`}
      >
        {occupied && (
          <span className="-rotate-45 text-[10px] font-black text-white tracking-tight">
            {initials(name)}
          </span>
        )}
      </div>
      {occupied && (
        <div className="mt-0.5 text-[10px] font-bold max-w-[84px] truncate text-center text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
          {name}
        </div>
      )}
    </Wrapper>
  );
}
