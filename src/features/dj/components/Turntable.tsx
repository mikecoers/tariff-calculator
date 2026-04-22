import { thumbUrl } from '../utils/youtube';

interface TurntableProps {
  videoId: string | null;
  spinning: boolean;
  accent: string;
  side: 'A' | 'B';
}

export default function Turntable({ videoId, spinning, accent, side }: TurntableProps) {
  return (
    <div
      className="relative mx-auto w-[180px] h-[180px] sm:w-[210px] sm:h-[210px] lg:w-[220px] lg:h-[220px]"
    >
      {/* platter */}
      <div
        className="absolute inset-0 rounded-full vinyl-grooves"
        style={{
          boxShadow: `0 0 0 4px #111, 0 8px 40px -10px ${accent}55, inset 0 0 50px rgba(0,0,0,0.9)`,
        }}
      />
      {/* spinning layer */}
      <div
        className={`absolute inset-0 rounded-full ${spinning ? 'spinning' : ''}`}
        style={{ animationPlayState: spinning ? 'running' : 'paused' }}
      >
        {/* label */}
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full overflow-hidden border-2 border-black w-[42%] h-[42%]"
          style={{ boxShadow: `0 0 20px -4px ${accent}` }}
        >
          {videoId ? (
            <img
              src={thumbUrl(videoId)}
              alt=""
              className="w-full h-full object-cover"
              draggable={false}
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center font-display text-4xl"
              style={{
                background: `radial-gradient(circle at 30% 30%, ${accent}, #0a0a12)`,
                color: '#fff',
              }}
            >
              {side}
            </div>
          )}
          {/* spindle */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-black border border-white/30" />
        </div>
        {/* tick mark so spin is visible */}
        <div
          className="absolute top-2 left-1/2 -translate-x-1/2 w-1.5 h-5 rounded-full"
          style={{ background: accent, boxShadow: `0 0 8px ${accent}` }}
        />
      </div>
      {/* tonearm */}
      <div
        className="absolute -right-3 top-2 w-[40%] h-[40%] pointer-events-none"
        style={{
          transformOrigin: 'top right',
          transform: spinning ? 'rotate(-28deg)' : 'rotate(-12deg)',
          transition: 'transform 0.8s ease',
        }}
      >
        <div
          className="absolute top-0 right-0 w-3 h-3 rounded-full"
          style={{ background: '#64748b', boxShadow: '0 0 0 2px #1e293b' }}
        />
        <div
          className="absolute top-1 right-1 h-1 w-[85%] rounded-full"
          style={{
            background: 'linear-gradient(90deg, #94a3b8, #475569)',
            transformOrigin: 'right',
          }}
        />
      </div>
    </div>
  );
}
