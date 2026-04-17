interface Props {
  balls: number;
  strikes: number;
  outs: number;
  coachPitch?: boolean;
}

export default function CountDisplay({ balls, strikes, outs, coachPitch = false }: Props) {
  return (
    <div className="flex items-center justify-center gap-4 text-[11px] text-phil-maroon/70">
      <Group label="B" value={balls} total={4} tone="info" dim={coachPitch} />
      <span className="opacity-30">·</span>
      <Group label="S" value={strikes} total={3} tone="warn" />
      <span className="opacity-30">·</span>
      <Group label="O" value={outs} total={3} tone="crit" />
    </div>
  );
}

function Group({
  label,
  value,
  total,
  tone,
  dim = false
}: {
  label: string;
  value: number;
  total: number;
  tone: 'info' | 'warn' | 'crit';
  dim?: boolean;
}) {
  const dotOn =
    tone === 'info'
      ? 'bg-phil-maroon'
      : tone === 'warn'
      ? 'bg-ump-warn'
      : 'bg-ump-crit';
  return (
    <div className={`inline-flex items-center gap-1.5 ${dim ? 'opacity-40' : ''}`}>
      <span className="font-black text-phil-maroonDark tracking-wide text-xs">{label}</span>
      <span className="font-mono font-black text-phil-maroonDark text-sm">{value}</span>
      <span className="flex gap-0.5">
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            className={`h-1.5 w-1.5 rounded-full ${i < value ? dotOn : 'bg-phil-maroon/20'}`}
          />
        ))}
      </span>
    </div>
  );
}
