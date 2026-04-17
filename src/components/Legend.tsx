import Modal from './Modal';

export default function Legend({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Legend"
      footer={
        <button className="tap-btn tap-btn-neutral tap-btn-sm" onClick={onClose}>
          Close
        </button>
      }
    >
      <Section title="Alert severity">
        <div className="flex flex-wrap gap-2">
          <span className="chip-info">info</span>
          <span className="chip-warn">warning</span>
          <span className="chip-crit">critical</span>
        </div>
      </Section>

      <Section title="Pitch-count rest tiers">
        <ul className="text-sm space-y-1">
          <li><span className="chip-ok mr-1">0 days</span> 1–20 pitches</li>
          <li><span className="chip mr-1">1 day</span> 21–35</li>
          <li><span className="chip-warn mr-1">2 days</span> 36–50</li>
          <li><span className="chip-warn mr-1">3 days</span> 51–65</li>
          <li><span className="chip-crit mr-1">4 days</span> 66+</li>
        </ul>
      </Section>

      <Section title="Daily pitch limits by age">
        <ul className="text-sm space-y-0.5">
          <li>Ages 7–8: 50 pitches / day</li>
          <li>Ages 9–10: 75 pitches / day</li>
          <li>Ages 11–12: 85 pitches / day</li>
        </ul>
        <p className="text-xs text-ump-dim mt-2">
          Enter each pitcher's age on the Roster screen so the app can enforce the correct daily cap.
        </p>
      </Section>

      <Section title="In-game pitch meter">
        <ul className="text-sm space-y-0.5">
          <li><span className="chip-ok mr-1">green</span> under 80% of cap</li>
          <li><span className="chip-warn mr-1">yellow</span> 80–94%</li>
          <li><span className="chip-crit mr-1">red</span> 95%+ or over cap</li>
        </ul>
      </Section>

      <Section title="Season phase rules">
        <ul className="text-sm space-y-1">
          <li><b>Early:</b> coach-pitch remainder, no walks, no stealing home.</li>
          <li><b>Mid:</b> walks when bases loaded, stealing OK (not during manager pitch).</li>
          <li><b>End:</b> full walks & steals, no manager pitching.</li>
        </ul>
      </Section>

      <Section title="Playing time minimums">
        <ul className="text-sm space-y-0.5">
          <li>Every player: ≥4 defensive innings per game.</li>
          <li>Every player: ≥2 innings in the first four.</li>
          <li>Overridable in Settings.</li>
        </ul>
      </Section>

      <Section title="Positions">
        <div className="grid grid-cols-3 gap-1 text-xs text-ump-dim">
          <span><b className="text-ump-ink">P</b> pitcher</span>
          <span><b className="text-ump-ink">C</b> catcher</span>
          <span><b className="text-ump-ink">1B</b> first</span>
          <span><b className="text-ump-ink">2B</b> second</span>
          <span><b className="text-ump-ink">3B</b> third</span>
          <span><b className="text-ump-ink">SS</b> shortstop</span>
          <span><b className="text-ump-ink">LF</b> left</span>
          <span><b className="text-ump-ink">CF</b> center</span>
          <span><b className="text-ump-ink">RF</b> right</span>
        </div>
      </Section>
    </Modal>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-ump-line first:border-t-0 pt-2 mt-2 first:pt-0 first:mt-0">
      <div className="field-label mb-1">{title}</div>
      {children}
    </div>
  );
}
