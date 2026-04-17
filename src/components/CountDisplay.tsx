interface Props {
  balls: number;
  strikes: number;
  outs: number;
  coachPitch?: boolean;
}

export default function CountDisplay({ balls, strikes, outs, coachPitch = false }: Props) {
  return (
    <div className="rounded-2xl border border-ump-line bg-phil-maroonDark/80 p-2">
      <div className="grid grid-cols-3 gap-2">
        <Row
          label="BALLS"
          value={balls}
          total={4}
          filled={balls}
          tone="info"
          dim={coachPitch}
          suffix={coachPitch ? 'CP' : undefined}
        />
        <Row label="STRIKES" value={strikes} total={3} filled={strikes} tone="warn" />
        <Row label="OUTS" value={outs} total={3} filled={outs} tone="crit" />
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  total,
  filled,
  tone,
  dim = false,
  suffix
}: {
  label: string;
  value: number;
  total: number;
  filled: number;
  tone: 'info' | 'warn' | 'crit';
  dim?: boolean;
  suffix?: string;
}) {
  const dotFill =
    tone === 'info'
      ? 'bg-phil-blue shadow-glow'
      : tone === 'warn'
      ? 'bg-ump-warn shadow-glow'
      : 'bg-ump-crit shadow-glowCrit';
  const labelColor = tone === 'info' ? 'text-phil-blue' : tone === 'warn' ? 'text-ump-warn' : 'text-ump-crit';
  return (
    <div className={`rounded-xl border border-ump-line p-2 flex flex-col items-center ${dim ? 'opacity-50' : ''}`}>
      <div className={`text-[9px] font-black tracking-widest ${labelColor}`}>{label}</div>
      <div className={`font-mono text-4xl font-black leading-none my-1 ${dim ? 'text-phil-creamDim' : 'text-phil-cream'}`}>
        {value}
        {suffix && <span className="ml-1 text-[10px] align-top text-phil-creamDim">{suffix}</span>}
      </div>
      <div className="flex gap-1">
        {Array.from({ length: total }).map((_, i) => {
          const on = i < filled;
          return (
            <span
              key={i}
              className={`h-2 w-2 rounded-full ${on ? dotFill : 'bg-ump-line'}`}
            />
          );
        })}
      </div>
    </div>
  );
}
