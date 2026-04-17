interface Props {
  balls: number;
  strikes: number;
  outs: number;
  coachPitch?: boolean;
}

export default function CountDisplay({ balls, strikes, outs, coachPitch = false }: Props) {
  return (
    <div className="flex items-center gap-3">
      <Group label="B" value={balls} total={4} tone="maroon" dim={coachPitch} />
      <Group label="S" value={strikes} total={3} tone="amber" />
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
  tone: 'maroon' | 'amber' | 'crit';
  dim?: boolean;
}) {
  const dotOn =
    tone === 'maroon'
      ? 'bg-phil-maroon'
      : tone === 'amber'
      ? 'bg-amber-600'
      : 'bg-red-700';
  return (
    <div className={`inline-flex items-center gap-1 ${dim ? 'opacity-40' : ''}`}>
      <span className="font-black text-phil-maroonDark text-sm">{label}</span>
      <span className="font-mono font-black text-phil-maroonDark text-base">{value}</span>
      <span className="flex gap-0.5">
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            className={`h-1.5 w-1.5 rounded-full ${i < value ? dotOn : 'bg-phil-maroon/25'}`}
          />
        ))}
      </span>
    </div>
  );
}
