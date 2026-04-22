import { useCallback, useEffect, useRef } from 'react';

interface KnobProps {
  value: number; // 0..1
  onChange: (v: number) => void;
  label: string;
  color?: string; // tailwind hex-ish, passed to stroke
  size?: number;
  hint?: string;
  bipolar?: boolean; // center-detent style
  onDoubleClick?: () => void;
}

export default function Knob({
  value,
  onChange,
  label,
  color = '#67e8f9',
  size = 64,
  hint,
  bipolar = false,
  onDoubleClick,
}: KnobProps) {
  const dragging = useRef(false);
  const startY = useRef(0);
  const startVal = useRef(0);

  const handleDown = useCallback(
    (e: React.PointerEvent) => {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      dragging.current = true;
      startY.current = e.clientY;
      startVal.current = value;
    },
    [value]
  );

  const handleMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current) return;
      const dy = startY.current - e.clientY; // up = increase
      const delta = dy / 150;
      const next = Math.max(0, Math.min(1, startVal.current + delta));
      onChange(next);
    },
    [onChange]
  );

  const handleUp = useCallback((e: React.PointerEvent) => {
    dragging.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  }, []);

  // wheel support
  const wheelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = wheelRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const step = e.shiftKey ? 0.002 : 0.02;
      const dir = e.deltaY > 0 ? -1 : 1;
      onChange(Math.max(0, Math.min(1, value + dir * step)));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [onChange, value]);

  // map to angle: -135deg (0) to +135deg (1)
  const angle = -135 + value * 270;
  const r = size / 2 - 4;
  const cx = size / 2;
  const cy = size / 2;
  // indicator position
  const rad = (angle * Math.PI) / 180;
  const ix = cx + Math.sin(rad) * (r - 6);
  const iy = cy - Math.cos(rad) * (r - 6);

  // arc: draw from -135 to current angle (for unipolar) or from 0 to current (for bipolar)
  const describeArc = () => {
    const startA = bipolar ? 0 : -135;
    const endA = angle;
    const large = Math.abs(endA - startA) > 180 ? 1 : 0;
    const sweep = endA > startA ? 1 : 0;
    const toXY = (a: number) => {
      const rad2 = (a * Math.PI) / 180;
      return [cx + Math.sin(rad2) * r, cy - Math.cos(rad2) * r];
    };
    const [sx, sy] = toXY(startA);
    const [ex, ey] = toXY(endA);
    return `M ${sx} ${sy} A ${r} ${r} 0 ${large} ${sweep} ${ex} ${ey}`;
  };

  return (
    <div className="flex flex-col items-center gap-1 select-none">
      <div
        ref={wheelRef}
        className="relative touch-none cursor-ns-resize"
        style={{ width: size, height: size }}
        onPointerDown={handleDown}
        onPointerMove={handleMove}
        onPointerUp={handleUp}
        onPointerCancel={handleUp}
        onDoubleClick={onDoubleClick}
      >
        <svg width={size} height={size} className="absolute inset-0">
          {/* outer ring track */}
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
          {/* active arc */}
          <path d={describeArc()} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 5px ${color})` }} />
          {/* body */}
          <defs>
            <radialGradient id={`kg-${label}`}>
              <stop offset="0%" stopColor="#2a2a36" />
              <stop offset="100%" stopColor="#08080c" />
            </radialGradient>
          </defs>
          <circle cx={cx} cy={cy} r={r - 8} fill={`url(#kg-${label})`} stroke="rgba(0,0,0,0.8)" />
          {/* indicator line */}
          <line x1={cx} y1={cy} x2={ix} y2={iy} stroke={color} strokeWidth="2" strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 3px ${color})` }} />
          <circle cx={ix} cy={iy} r="2.5" fill={color} />
        </svg>
      </div>
      <div className="label-cap text-center">{label}</div>
      {hint && <div className="text-[9px] font-mono text-white/40">{hint}</div>}
    </div>
  );
}
