interface Props {
  balls: number;
  strikes: number;
  outs: number;
  coachPitch?: boolean;
}

export default function CountDisplay({ balls, strikes, outs, coachPitch = false }: Props) {
  return (
    <div className="rounded-2xl border border-phil-blueDeep/70 bg-white p-1.5 shadow-card">
      <div className="grid grid-cols-3 gap-1.5">
        <Row label="B" full="BALLS" value={balls} total={4} tone="info" dim={coachPitch} />
        <Row label="S" full="STRIKES" value={strikes} total={3} tone="warn" />
        <Row label="O" full="OUTS" value={outs} total={3} tone="crit" />
      </div>
    </div>
  );
}

function Row({
  label,
  full,
  value,
  total,
  tone,
  dim = false
}: {
  label: string;
  full: string;
  value: number;
  total: number;
  tone: 'info' | 'warn' | 'crit';
  dim?: boolean;
}) {
  const dotFill =
    tone === 'info'
      ? 'bg-phil-maroon'
      : tone === 'warn'
      ? 'bg-ump-warn'
      : 'bg-ump-crit';
  const labelColor =
    tone === 'info' ? 'text-phil-maroon' : tone === 'warn' ? 'text-ump-warn' : 'text-ump-crit';
  return (
    <div
      className={`rounded-xl border border-phil-blueDeep/50 bg-phil-blueLight px-2 py-1 flex items-center gap-2 ${
        dim ? 'opacity-40' : ''
      }`}
    >
      <div className="flex flex-col items-start leading-none">
        <span className={`text-[8px] font-black tracking-widest ${labelColor}`}>{full}</span>
        <span className={`font-mono text-2xl font-black ${dim ? 'text-phil-maroon/60' : 'text-phil-maroonDark'}`}>
          {value}
        </span>
      </div>
      <div className="flex flex-col gap-0.5 ml-auto">
        {Array.from({ length: total }).map((_, i) => {
          const on = i < value;
          return (
            <span
              key={i}
              className={`h-1.5 w-3 rounded-full ${on ? dotFill : 'bg-phil-blueDeep/40'}`}
            />
          );
        })}
      </div>
      {/* eslint-disable-next-line @typescript-eslint/no-unused-vars */}
      <span className="sr-only">{label}</span>
    </div>
  );
}
