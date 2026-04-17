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
  return (
    <div className={`relative mx-auto ${compact ? 'max-w-[240px]' : 'max-w-[320px]'} w-full max-h-full aspect-square select-none`}>
      {/* Outfield (soft grass gradient) */}
      <div
        className="absolute inset-0 rounded-full border border-white/40"
        style={{
          background:
            'radial-gradient(circle at 50% 100%, #2f855a 0%, #1e6b43 55%, #0f4020 100%)',
          boxShadow:
            'inset 0 2px 6px rgba(255,255,255,0.12), 0 12px 40px -18px rgba(0,0,0,0.45)'
        }}
      />
      {/* Infield (warmer dirt) */}
      <div
        className="absolute inset-[14%] rotate-45 rounded-md"
        style={{
          background: 'linear-gradient(155deg, #d29560 0%, #a15e2a 100%)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25)'
        }}
      />
      {/* Mound */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-7 w-7 rounded-full"
        style={{ background: 'radial-gradient(circle, #f3d8b5 0%, #b97d3e 100%)' }}
      />

      <BaseMarker position="top" name={secondName} onTap={onBaseTap ? () => onBaseTap('second') : undefined} />
      <BaseMarker position="right" name={firstName} onTap={onBaseTap ? () => onBaseTap('first') : undefined} />
      <BaseMarker position="left" name={thirdName} onTap={onBaseTap ? () => onBaseTap('third') : undefined} />
      <BaseMarker position="bottom" name={batterName} home />
    </div>
  );
}

function BaseMarker({
  position,
  name,
  home = false,
  onTap
}: {
  position: 'top' | 'right' | 'bottom' | 'left';
  name?: string | null;
  home?: boolean;
  onTap?: () => void;
}) {
  const occupied = !!name;
  const posStyles: Record<typeof position, string> = {
    top: 'top-[6%] left-1/2 -translate-x-1/2',
    right: 'right-[6%] top-1/2 -translate-y-1/2',
    bottom: 'bottom-[6%] left-1/2 -translate-x-1/2',
    left: 'left-[6%] top-1/2 -translate-y-1/2'
  };
  const Wrapper: 'button' | 'div' = onTap && occupied ? 'button' : 'div';

  // Uniform base style — square, subtle gradient, white border
  const occupiedStyle = home
    ? 'bg-gradient-to-br from-emerald-400 to-emerald-700 border-white'
    : 'bg-gradient-to-br from-phil-maroonLight to-phil-maroonDark border-white';
  const emptyStyle = 'bg-white/90 border-white/70';
  return (
    <Wrapper
      onClick={onTap && occupied ? onTap : undefined}
      className={`absolute ${posStyles[position]} flex flex-col items-center ${onTap && occupied ? 'cursor-pointer active:scale-95 transition' : ''}`}
    >
      <div
        className={`h-11 w-11 rotate-45 rounded-md border-2 flex items-center justify-center
          ${occupied ? occupiedStyle : emptyStyle}
          ${occupied ? 'animate-pop-in shadow-lg' : 'shadow'}`}
      >
        {occupied && (
          <span className="-rotate-45 text-[11px] font-black text-white tracking-tight">
            {initials(name)}
          </span>
        )}
      </div>
      {occupied && (
        <div className="mt-1 text-[11px] font-semibold max-w-[100px] truncate text-center text-phil-cream drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
          {name}
        </div>
      )}
    </Wrapper>
  );
}
