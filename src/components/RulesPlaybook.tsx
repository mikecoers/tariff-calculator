import Modal from './Modal';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function RulesPlaybook({ open, onClose }: Props) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="📋 Coach's Clipboard"
      footer={
        <button className="tap-btn tap-btn-neutral tap-btn-sm" onClick={onClose}>
          Close
        </button>
      }
    >
      <p className="text-[12px] text-phil-maroonDark font-semibold mb-3 leading-snug">
        A quick reference for what's legal and how to play it smart.
        Every kid on this roster contributes — these strategies help the
        whole team play its best baseball together.
      </p>

      <Section icon="🌱" title="Early Season · Coach Pitch">
        <Rules>
          <Rule>Kid pitcher throws until <b>4 balls</b>. After that, the coach finishes the at-bat.</Rule>
          <Rule><b>Every coach pitch is a strike.</b> Three strikes and the batter is out.</Rule>
          <Rule><b>No walks.</b> No stealing home.</Rule>
          <Rule>Manager can still pitch if needed.</Rule>
        </Rules>
        <SmartPlay title="Be patient at the plate">
          Teach every hitter to let close pitches go by. After <b>4 balls</b>
          the coach comes in with straight, hittable pitches — a great
          chance for any batter to put the ball in play and get on base.
        </SmartPlay>
        <SmartPlay title="Pitchers: attack the zone">
          There's no walk penalty here, so pitchers can't "lose" a batter.
          Celebrate strike-throwing even if the ball ends up hit. Confidence
          on the mound is the goal this phase.
        </SmartPlay>
      </Section>

      <Section icon="🌳" title="Mid Season · Limited Walks + Steals">
        <Rules>
          <Rule><b>Walks allowed</b> — but only when the bases are loaded.</Rule>
          <Rule><b>Stealing allowed</b> (including home) — except when the manager is pitching.</Rule>
          <Rule>Kid pitcher still works a full count; if bases aren't loaded at ball 4 it flips to coach pitch.</Rule>
        </Rules>
        <SmartPlay title="Load the bases, stay patient">
          With runners on and 2 outs, a walk with bases loaded forces in a run.
          Remind your batter: "A walk is as good as a hit right now." Takes
          pressure off everyone.
        </SmartPlay>
        <SmartPlay title="Give every runner a chance to steal">
          Once the kid pitcher is in, greenlight any runner who's been working
          on their baserunning. Steals of 2nd and 3rd are low-pressure reps —
          a great confidence builder. Skip it on manager pitch (not allowed).
        </SmartPlay>
      </Section>

      <Section icon="🏆" title="End Season · Full Rules">
        <Rules>
          <Rule><b>Full walks</b> at 4 balls. <b>Full stealing</b> including home.</Rule>
          <Rule><b>No manager pitching</b> — kids only.</Rule>
          <Rule>Last inning's <b>5-run cap is lifted</b> — score as much as you can.</Rule>
        </Rules>
        <SmartPlay title="Plan your pitching rotation">
          The final inning has no run cap, so think about which pitcher starts
          strong vs. which one finishes strong. Spread the innings so every
          pitcher gets meaningful work.
        </SmartPlay>
        <SmartPlay title="Run the bases with purpose">
          Teach reads: watch the catcher's feet, time the release, tag up on
          fly balls. These skills stick with kids long after the game.
        </SmartPlay>
      </Section>

      <Section icon="🎯" title="Pitch Counts (Every Phase)">
        <Rules>
          <Rule>Daily caps by age: <b>7–8 = 50</b>, <b>9–10 = 75</b>, <b>11–12 = 85</b>.</Rule>
          <Rule>Rest days after an outing: 0d ≤20 · 1d 21–35 · 2d 36–50 · 3d 51–65 · <b>4d 66+</b>.</Rule>
          <Rule>A catcher who caught the same inning <b>cannot</b> pitch that inning.</Rule>
        </Rules>

        <div className="rounded-xl border-2 border-emerald-600 bg-emerald-50 p-2.5">
          <div className="text-[10px] uppercase tracking-widest font-black text-emerald-800 mb-1">
            🟢 The No-Rest Zone · ≤ 20 pitches
          </div>
          <div className="text-[13px] text-emerald-950 leading-snug font-medium">
            Pull at <b>20 or fewer</b> and your pitcher is available again
            tomorrow — huge in a weekend tournament. Watch the in-game meter
            at the bottom of the pitcher row: when it flips off green, you've
            just bought a rest day.
          </div>
        </div>

        <div className="rounded-xl border-2 border-sky-700 bg-sky-50 p-2.5">
          <div className="text-[10px] uppercase tracking-widest font-black text-sky-800 mb-1">
            🔵 The 1-Day Zone · 21–35 pitches
          </div>
          <div className="text-[13px] text-sky-950 leading-snug font-medium">
            Still a sweet spot. Most starters live here on a normal game day.
            If you're near 35 and the inning just started, consider pulling
            mid-inning — one pitch over <b>35</b> costs you a second rest
            day.
          </div>
        </div>

        <SmartPlay title="Use the rest cliffs to plan your rotation">
          Three kids at ≤20 pitches each = three arms ready tomorrow. Better
          than one kid at 60 needing three days off. Spread the load.
        </SmartPlay>

        <SmartPlay title="Pull mid-inning, not at the end">
          If your pitcher is at 18 and the inning is fresh, bring someone in
          now. If they're at 18 with 2 outs, let them finish. Use the
          in-game alert — it tells you which rest tier you're in and how
          many pitches before the next cliff.
        </SmartPlay>

        <SmartPlay title="Give every pitcher real reps">
          Rotate several kids through the mound across the season. Today's
          reliever is next month's ace — and appearances on the mound build
          confidence in every other position too.
        </SmartPlay>
      </Section>

      <Section icon="🧤" title="Playing Time & Fielding">
        <Rules>
          <Rule>Every kid plays at least <b>4 defensive innings</b> per game.</Rule>
          <Rule>Every kid plays at least <b>2 innings in the first four</b>.</Rule>
          <Rule>The app warns you when a player is at risk of missing either minimum.</Rule>
        </Rules>
        <SmartPlay title="Front-load the minimums">
          Use the first four innings to make sure everyone hits their
          2-innings-in-first-half requirement early. This takes the pressure
          off late-inning decisions and gives every kid meaningful defensive
          reps while the game is still fresh.
        </SmartPlay>
        <SmartPlay title="Rotate positions to build the whole player">
          Use 🎲 Re-roll on the Defense screen to shuffle kids across the
          diamond. A kid who plays RF one inning and 2B the next develops
          range, instincts, and confidence. No one "lives" at one position.
        </SmartPlay>
      </Section>

      <Section icon="💯" title="Scoring & Innings">
        <Rules>
          <Rule><b>5-run cap</b> per half-inning (all innings except the last).</Rule>
          <Rule>Inning ends at <b>3 outs</b> OR when the run cap is reached.</Rule>
          <Rule>Final inning: run cap <b>lifted</b>.</Rule>
        </Rules>
        <SmartPlay title="The 5-run cap is your friend">
          Once you've hit the cap, the inning ends. Celebrate the 5 and
          get back to defense — lots of momentum carries forward regardless
          of how big a lead you had.
        </SmartPlay>
        <SmartPlay title="Play every out like it matters">
          Even up 10-0, every defensive inning is a rep someone needed.
          Stay engaged, coach every play — kids remember effort more than
          the score.
        </SmartPlay>
      </Section>

      <Section icon="⚾" title="At the Plate">
        <Rules>
          <Rule>Strikes: 3 and you're out.</Rule>
          <Rule>Fouls count up to 2 strikes, never the 3rd.</Rule>
          <Rule>Dropped 3rd strike does not apply at this level.</Rule>
        </Rules>
        <SmartPlay title="Foul it off, battle on">
          Every foul ball is another chance. Teach: "Protect the plate with
          2 strikes." It's a mindset that turns strikeouts into contact and
          builds toughness at the plate for every hitter in the order.
        </SmartPlay>
        <SmartPlay title="Contact and speed beat power">
          Ground balls and hard liners cause errors at this age far more than
          home-run swings. Every hitter — from #1 to #12 — can be dangerous
          with a short, level swing. That's a confidence-builder.
        </SmartPlay>
      </Section>

      <Section icon="🏃" title="Base Running">
        <Rules>
          <Rule>Lead-offs are NOT allowed — runners leave after the ball crosses the plate.</Rule>
          <Rule>Stealing only when the rules allow for the current phase.</Rule>
          <Rule>Runners tag up on caught fly balls.</Rule>
        </Rules>
        <SmartPlay title="Fake steals rattle the defense">
          A break-and-back move often causes throwing errors at this age.
          Safe, legal, and a fun way to put pressure on the other team.
        </SmartPlay>
        <SmartPlay title="Double-steal with 1st and 3rd">
          Send the runner from 1st; if the catcher throws through, the
          runner on 3rd breaks for home. A classic play that works a lot —
          and both runners get an RBI-worthy story to tell.
        </SmartPlay>
      </Section>

      <Section icon="📝" title="Roster & Substitutions">
        <Rules>
          <Rule>Free substitution on defense — swap any time.</Rule>
          <Rule>Batting order is continuous — everyone present bats.</Rule>
          <Rule>Absent players don't appear in the lineup or rotation.</Rule>
        </Rules>
        <SmartPlay title="The continuous lineup is a gift">
          Every kid bats. That means every kid stays in the game mentally,
          gets their reps, and has a chance to be the hero in any inning.
          Don't think "weak spot" — think "next at-bat waiting to happen."
        </SmartPlay>
        <SmartPlay title="Shuffle the order game to game">
          The app auto-randomizes the batting order for each game so the
          same kids aren't always at the top or bottom. Over a season,
          everyone leads off, everyone cleans up. Use the Lineup arrows
          to fine-tune when needed.
        </SmartPlay>
      </Section>

      <p className="mt-4 text-[11px] text-phil-maroon font-semibold text-center leading-snug">
        Every kid on the bench today is a starter tomorrow. Rules vary by
        league — double-check the specifics with your local board. This
        guide matches the Kid Pitch (AA) defaults used in the app's
        Settings screen.
      </p>
    </Modal>
  );
}

function Section({
  icon,
  title,
  children
}: {
  icon: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-4 first:mt-0">
      <h3 className="flex items-center gap-2 text-[15px] font-black text-phil-maroonDark border-b-2 border-phil-maroon/40 pb-1 mb-2">
        <span>{icon}</span>
        {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function Rules({ children }: { children: React.ReactNode }) {
  return (
    <ul className="space-y-1.5 text-[13px] text-phil-maroonDark leading-snug">
      {children}
    </ul>
  );
}

function Rule({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span className="mt-[3px] text-phil-maroon shrink-0">•</span>
      <span>{children}</span>
    </li>
  );
}

function SmartPlay({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-amber-50 border-2 border-amber-600 p-2.5">
      <div className="text-[10px] uppercase tracking-widest font-black text-amber-800 mb-1">
        💡 Smart Play · {title}
      </div>
      <div className="text-[13px] text-amber-950 leading-snug font-medium">{children}</div>
    </div>
  );
}
