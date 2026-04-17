interface DiamondProps {
  batterName?: string;
  firstName?: string | null;
  secondName?: string | null;
  thirdName?: string | null;
  outs: number;
  balls: number;
  strikes: number;
  onBasePress?: (base: 'first' | 'second' | 'third' | 'home') => void;
}

export default function Diamond({
  batterName,
  firstName,
  secondName,
  thirdName,
  outs,
  balls,
  strikes,
  onBasePress
}: DiamondProps) {
  const filled = 'bg-ump-accent text-ump-bg border-ump-accent';
  const empty = 'bg-ump-card text-ump-dim border-ump-line';
  return (
    <div className="relative w-full aspect-square max-w-[340px] mx-auto select-none">
      <div className="absolute inset-[10%] rotate-45 border-2 border-ump-line rounded-md bg-field-900/20" />

      <BaseDot
        position="top"
        label="2B"
        name={secondName}
        className={secondName ? filled : empty}
        onClick={() => onBasePress?.('second')}
      />
      <BaseDot
        position="right"
        label="1B"
        name={firstName}
        className={firstName ? filled : empty}
        onClick={() => onBasePress?.('first')}
      />
      <BaseDot
        position="left"
        label="3B"
        name={thirdName}
        className={thirdName ? filled : empty}
        onClick={() => onBasePress?.('third')}
      />
      <BaseDot
        position="bottom"
        label="HOME"
        name={batterName}
        batter
        className={batterName ? 'bg-ump-ok text-ump-bg border-ump-ok' : empty}
        onClick={() => onBasePress?.('home')}
      />

      <div className="absolute inset-x-0 top-2 flex justify-center">
        <div className="bg-ump-card/80 backdrop-blur rounded-full px-3 py-1 text-xs flex gap-3 border border-ump-line">
          <span className="font-mono font-bold">{balls}-{strikes}</span>
          <span className="text-ump-dim">·</span>
          <span className="font-mono">
            <span className={outs >= 1 ? 'text-ump-crit' : 'text-ump-dim'}>●</span>
            <span className={outs >= 2 ? 'text-ump-crit ml-1' : 'text-ump-dim ml-1'}>●</span>
            <span className={outs >= 3 ? 'text-ump-crit ml-1' : 'text-ump-dim ml-1'}>●</span>
          </span>
        </div>
      </div>
    </div>
  );
}

function BaseDot({
  position,
  label,
  name,
  batter = false,
  className,
  onClick
}: {
  position: 'top' | 'right' | 'bottom' | 'left';
  label: string;
  name?: string | null;
  batter?: boolean;
  className?: string;
  onClick?: () => void;
}) {
  const posStyles: Record<typeof position, string> = {
    top: 'top-[6%] left-1/2 -translate-x-1/2',
    right: 'right-[6%] top-1/2 -translate-y-1/2',
    bottom: 'bottom-[6%] left-1/2 -translate-x-1/2',
    left: 'left-[6%] top-1/2 -translate-y-1/2'
  };
  return (
    <button
      onClick={onClick}
      className={`absolute ${posStyles[position]} flex flex-col items-center`}
    >
      <div
        className={`h-14 w-14 rotate-45 border-2 rounded-md flex items-center justify-center transition ${className} ${
          batter ? 'shadow-field' : ''
        }`}
      >
        <span className="-rotate-45 text-[10px] font-bold">{label}</span>
      </div>
      <div className="mt-1 text-xs font-semibold max-w-[100px] truncate text-center text-ump-ink">
        {name ?? '—'}
      </div>
    </button>
  );
}
