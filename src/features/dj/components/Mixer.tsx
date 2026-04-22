interface MixerProps {
  crossfade: number; // 0..1, 0 = full A, 1 = full B
  onCrossfade: (v: number) => void;
  masterVolume: number; // 0..1
  onMasterVolume: (v: number) => void;
  onAIBeatMatch: () => void;
  onAIGenreBlend: () => void;
  onAIDropMix: () => void;
  aiRunning: string | null;
  levels: { a: number; b: number };
}

function LevelMeter({ value, accent }: { value: number; accent: string }) {
  const segs = 16;
  const active = Math.round(value * segs);
  return (
    <div className="flex flex-col-reverse gap-[2px] h-[110px] w-3 panel-inset p-1">
      {Array.from({ length: segs }).map((_, i) => {
        const isOn = i < active;
        const color = i > segs * 0.8 ? '#ef4444' : i > segs * 0.6 ? '#f59e0b' : accent;
        return (
          <div
            key={i}
            className="flex-1 rounded-[1px]"
            style={{
              background: isOn ? color : 'rgba(255,255,255,0.06)',
              boxShadow: isOn ? `0 0 4px ${color}` : 'none',
            }}
          />
        );
      })}
    </div>
  );
}

export default function Mixer({
  crossfade,
  onCrossfade,
  masterVolume,
  onMasterVolume,
  onAIBeatMatch,
  onAIGenreBlend,
  onAIDropMix,
  aiRunning,
  levels,
}: MixerProps) {
  return (
    <div className="panel p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="font-display text-xl tracking-widest text-white/90">MIXER</span>
        <span className="pill">
          {aiRunning ? (
            <>
              <span className="led on-amber" /> AI: {aiRunning}
            </>
          ) : (
            <>AI IDLE</>
          )}
        </span>
      </div>

      {/* level meters */}
      <div className="flex items-end justify-center gap-4 py-1">
        <div className="flex flex-col items-center gap-1">
          <LevelMeter value={levels.a} accent="#67e8f9" />
          <div className="label-cap" style={{ color: '#67e8f9' }}>A</div>
        </div>
        <div className="flex flex-col items-center gap-1">
          <LevelMeter value={Math.max(levels.a, levels.b)} accent="#ffffff" />
          <div className="label-cap">MST</div>
        </div>
        <div className="flex flex-col items-center gap-1">
          <LevelMeter value={levels.b} accent="#f0abfc" />
          <div className="label-cap" style={{ color: '#f0abfc' }}>B</div>
        </div>
      </div>

      {/* crossfader */}
      <div className="panel-inset p-3 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="label-cap" style={{ color: '#67e8f9' }}>◀ A</span>
          <span className="label-cap">CROSSFADER</span>
          <span className="label-cap" style={{ color: '#f0abfc' }}>B ▶</span>
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={crossfade}
          onChange={(e) => onCrossfade(Number(e.target.value))}
          className="slider-x"
          aria-label="Crossfader"
        />
      </div>

      {/* master volume */}
      <div className="flex items-center gap-3">
        <span className="label-cap w-14">Master</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={masterVolume}
          onChange={(e) => onMasterVolume(Number(e.target.value))}
          className="slider-x flex-1"
        />
        <span className="pill w-10 justify-center">{Math.round(masterVolume * 100)}</span>
      </div>

      {/* AI mix buttons */}
      <div className="grid grid-cols-1 gap-2 mt-1">
        <button
          onClick={onAIBeatMatch}
          className="neon-btn neon-btn-cyan py-3"
          disabled={!!aiRunning}
        >
          🤖 AI Beat Match & Blend
        </button>
        <button
          onClick={onAIGenreBlend}
          className="neon-btn neon-btn-pink py-3"
          disabled={!!aiRunning}
        >
          🎧 AI Genre Crossblend
        </button>
        <button
          onClick={onAIDropMix}
          className="neon-btn neon-btn-lime py-3"
          disabled={!!aiRunning}
        >
          💥 AI Drop Mix
        </button>
      </div>
    </div>
  );
}
