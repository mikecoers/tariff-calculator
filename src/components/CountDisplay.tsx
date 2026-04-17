interface Props {
  balls: number;
  strikes: number;
  outs: number;
  coachPitch?: boolean;
}

export default function CountDisplay({ balls, strikes, outs, coachPitch = false }: Props) {
  return (
    <div className="rounded-2xl border border-phil-blueDeep/70 bg-white p-2 shadow-card">
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
      ? 'bg-phil-maroon shadow-glowMaroon'
      : tone === 'warn'
      ? 'bg-ump-warn shadow-glow'
      : 'bg-ump-crit shadow-glowCrit';
  const labelColor =
    tone === 'info' ? 'text-phil-maroon' : tone === 'warn' ? 'text-ump-warn' : 'text-ump-crit';
  return (
    <div
      className={`rounded-xl border border-phil-blueDeep/50 bg-phil-blueLight p-2 flex flex-col items-center ${
        dim ? 'opacity-40' : ''
      }`}
    >
      <div className={`text-[9px] font-black tracking-widest ${labelColor}`}>{label}</div>
      <div
        className={`font-mono text-4xl font-black leading-none my-1 ${
          dim ? 'text-phil-maroon/60' : 'text-phil-maroonDark'
        }`}
      >
        {value}
        {suffix && <span className="ml-1 text-[10px] align-top text-phil-maroon/70">{suffix}</span>}
      </div>
      <div className="flex gap-1">
        {Array.from({ length: total }).map((_, i) => {
          const on = i < filled;
          return (
            <span
              key={i}
              className={`h-2 w-2 rounded-full ${on ? dotFill : 'bg-phil-blueDeep/40'}`}
            />
          );
        })}
      </div>
    </div>
  );
}
