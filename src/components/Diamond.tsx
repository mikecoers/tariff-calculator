interface DiamondProps {
  batterName?: string | null;
  firstName?: string | null;
  secondName?: string | null;
  thirdName?: string | null;
  outs: number;
  balls: number;
  strikes: number;
  compact?: boolean;
}

export default function Diamond({
  batterName,
  firstName,
  secondName,
  thirdName,
  outs,
  balls,
  strikes,
  compact = false
}: DiamondProps) {
  return (
    <div className={`relative w-full mx-auto ${compact ? 'max-w-[300px]' : 'max-w-[340px]'} aspect-square select-none`}>
      {/* outfield backdrop */}
      <div
        className="absolute inset-0 rounded-full bg-field-stripes border border-field-700/60"
        style={{ background: 'radial-gradient(circle at 50% 100%, #166534 0%, #0f4020 60%, #072414 100%)' }}
      />
      {/* infield diamond */}
      <div
        className="absolute inset-[14%] rotate-45 rounded-md border-2 border-white/20"
        style={{ background: 'linear-gradient(160deg, #c2854a, #92400e 80%)' }}
      />

      {/* pitcher mound */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-dirt-200/50 border border-white/20"
      />

      {/* B-S-O strip */}
      <div className="absolute top-1 inset-x-0 flex justify-center">
        <div className="rounded-full px-3 py-1 text-xs flex items-center gap-2 bg-ump-bg/80 backdrop-blur border border-ump-line">
          <span className="font-mono font-bold text-ump-ink">{balls}-{strikes}</span>
          <span className="text-ump-dim">·</span>
          <span className="flex gap-1">
            <Dot active={outs >= 1} />
            <Dot active={outs >= 2} />
            <Dot active={outs >= 3} />
          </span>
        </div>
      </div>

      <BaseMarker position="top" label="2B" name={secondName} />
      <BaseMarker position="right" label="1B" name={firstName} />
      <BaseMarker position="left" label="3B" name={thirdName} />
      <BaseMarker position="bottom" label="HOME" name={batterName} home />
    </div>
  );
}

function Dot({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-block h-2.5 w-2.5 rounded-full ${active ? 'bg-ump-crit shadow-glowCrit' : 'bg-ump-line'}`}
    />
  );
}

function BaseMarker({
  position,
  label,
  name,
  home = false
}: {
  position: 'top' | 'right' | 'bottom' | 'left';
  label: string;
  name?: string | null;
  home?: boolean;
}) {
  const occupied = !!name;
  const posStyles: Record<typeof position, string> = {
    top: 'top-[8%] left-1/2 -translate-x-1/2',
    right: 'right-[8%] top-1/2 -translate-y-1/2',
    bottom: 'bottom-[8%] left-1/2 -translate-x-1/2',
    left: 'left-[8%] top-1/2 -translate-y-1/2'
  };
  const filledBg = home
    ? 'bg-grad-ok border-white shadow-glowOk'
    : 'bg-grad-blue border-white shadow-glow';
  const emptyBg = 'bg-white/90 border-white/60';
  return (
    <div className={`absolute ${posStyles[position]} flex flex-col items-center`}>
      <div
        className={`h-12 w-12 rotate-45 border-2 rounded-sm flex items-center justify-center ${
          occupied ? filledBg : emptyBg
        } ${occupied ? 'animate-pop-in' : ''}`}
      >
        <span
          className={`-rotate-45 text-[10px] font-black ${
            occupied ? 'text-ump-bg' : 'text-ump-bg/70'
          }`}
        >
          {label}
        </span>
      </div>
      <div
        className={`mt-1 text-[11px] font-bold max-w-[96px] truncate text-center ${
          occupied ? 'text-ump-ink' : 'text-ump-dim'
        }`}
      >
        {name ?? '—'}
      </div>
    </div>
  );
}
