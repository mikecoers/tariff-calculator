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
        Quick reference for what's legal and how to play it smart.
        None of this is cheating — it's working the rules in your favor.
      </p>

      <Section icon="🌱" title="Early Season · Coach Pitch">
        <Rules>
          <Rule>Kid pitcher throws until <b>4 balls</b>. After that, the coach finishes the at-bat.</Rule>
          <Rule><b>Every coach pitch is a strike.</b> Three strikes and the batter is out.</Rule>
          <Rule><b>No walks.</b> No stealing home.</Rule>
          <Rule>Manager can still pitch if needed.</Rule>
        </Rules>
        <SmartPlay title="Work the count">
          Tell your hitters to take close pitches. Once they see <b>4 balls</b>,
          the coach pitches — which is straight, hittable, and the kid already
          has 3 swings to put it in play. Great for weaker bats.
        </SmartPlay>
        <SmartPlay title="Throw strikes">
          There's no walk penalty here, so your pitcher never loses a batter.
          Encourage them to attack the zone — worst case is a coach-pitch
          at-bat, not a free base.
        </SmartPlay>
      </Section>

      <Section icon="🌳" title="Mid Season · Limited Walks + Steals">
        <Rules>
          <Rule><b>Walks allowed</b> — but only when the bases are loaded.</Rule>
          <Rule><b>Stealing allowed</b> (including home) — except when the manager is pitching.</Rule>
          <Rule>Kid pitcher still works a full count; if bases aren't loaded at ball 4 it flips to coach pitch.</Rule>
        </Rules>
        <SmartPlay title="Load them up">
          With 2 outs and runners on, a walk with bases loaded forces in a
          run. Be patient at the plate in that situation — the free run is
          on the table.
        </SmartPlay>
        <SmartPlay title="Steal on the right pitcher">
          Once the kid pitcher is in, greenlight fast runners. Skip it when
          the manager is on the mound (not allowed). Steals of 2nd and 3rd
          are usually low-risk at this level.
        </SmartPlay>
      </Section>

      <Section icon="🏆" title="End Season · Full Rules">
        <Rules>
          <Rule><b>Full walks</b> at 4 balls. <b>Full stealing</b> including home.</Rule>
          <Rule><b>No manager pitching</b> — kids only.</Rule>
          <Rule>Last inning's <b>5-run cap is lifted</b> — score as much as you can.</Rule>
        </Rules>
        <SmartPlay title="Save your arms for the last inning">
          Cap is gone in the final frame, so the best pitcher last means fewer
          runs allowed when it matters most. Start your #2 or #3.
        </SmartPlay>
        <SmartPlay title="Press the steal">
          Against a slow catcher, steal 2nd, 3rd, and home. Runners can tag
          up on fly balls. Practice reading the catcher's throw-down.
        </SmartPlay>
      </Section>

      <Section icon="🎯" title="Pitch Counts (Every Phase)">
        <Rules>
          <Rule>Daily caps by age: <b>7–8 = 50</b>, <b>9–10 = 75</b>, <b>11–12 = 85</b>.</Rule>
          <Rule>Rest days after an outing: 0d ≤20 · 1d 21–35 · 2d 36–50 · 3d 51–65 · <b>4d 66+</b>.</Rule>
          <Rule>A catcher who caught the same inning <b>cannot</b> pitch that inning.</Rule>
        </Rules>
        <SmartPlay title="Pull at 20 or 35 if you can">
          Stopping a pitcher at exactly <b>20</b> pitches = 0 rest days (fully
          available the next day). Stopping at <b>35</b> = 1 rest day.
          Crossing those thresholds by one pitch costs you a whole day.
        </SmartPlay>
        <SmartPlay title="Protect your ace">
          Only use your best pitcher for the innings you truly need. Let #3
          and #4 soak up the cap-safe innings.
        </SmartPlay>
      </Section>

      <Section icon="🧤" title="Playing Time & Fielding">
        <Rules>
          <Rule>Every kid plays at least <b>4 defensive innings</b> per game.</Rule>
          <Rule>Every kid plays at least <b>2 innings in the first four</b>.</Rule>
          <Rule>The app warns you when a player is at risk of missing either minimum.</Rule>
        </Rules>
        <SmartPlay title="Get the weakest fielders out of the way early">
          Start the first four innings with the kids who are hardest to
          place at key positions. Meet their 2-in-first-4 while the game
          is still close, then shift stronger defenders to SS/CF late.
        </SmartPlay>
        <SmartPlay title="Rotate outfielders to the infield">
          With 12 on the roster, use the 🎲 Defense re-roll to shuffle
          kids across positions — it keeps them sharp and hides defensive
          weak spots.
        </SmartPlay>
      </Section>

      <Section icon="💯" title="Scoring & Innings">
        <Rules>
          <Rule><b>5-run cap</b> per half-inning (all innings except the last).</Rule>
          <Rule>Inning ends at <b>3 outs</b> OR when the run cap is reached.</Rule>
          <Rule>Final inning: run cap <b>lifted</b>.</Rule>
        </Rules>
        <SmartPlay title="Stop pressing at 5">
          Once you've hit the cap, save your baserunners' legs. Swing at
          strikes and let the inning end so you can go field and shut them
          down.
        </SmartPlay>
        <SmartPlay title="Hold something back for the last">
          Best hitters near the top of the order in the last inning, best
          pitcher on the mound. That's when the gloves come off.
        </SmartPlay>
      </Section>

      <Section icon="⚾" title="At the Plate">
        <Rules>
          <Rule>Strikes: 3 and you're out.</Rule>
          <Rule>Fouls count up to 2 strikes, never the 3rd.</Rule>
          <Rule>Dropped 3rd strike does not apply at this level.</Rule>
        </Rules>
        <SmartPlay title="Foul off to see more pitches">
          Against a wild kid pitcher, fouling off gets you closer to
          ball 4 and coach pitch (early) or a walk (late). Coach tell
          your hitters: "Battle with 2 strikes."
        </SmartPlay>
        <SmartPlay title="Small ball works">
          Bunt, slap, and ground-ball singles cause errors at this age
          far more than big swings. Prioritize contact and speed.
        </SmartPlay>
      </Section>

      <Section icon="🏃" title="Base Running">
        <Rules>
          <Rule>Lead-offs are NOT allowed — runners leave after the ball crosses the plate.</Rule>
          <Rule>Stealing only when the rules allow for the current phase.</Rule>
          <Rule>Runners tag up on caught fly balls.</Rule>
        </Rules>
        <SmartPlay title="Fake steals rattle pitchers">
          A break-and-back move at this age often causes the pitcher to
          balk the ball (or throw it away). Legal and effective.
        </SmartPlay>
        <SmartPlay title="Two runners, two steals">
          When you have 1st and 3rd, send the runner on 1st. If the
          catcher throws through, 3rd breaks for home. It works a lot.
        </SmartPlay>
      </Section>

      <Section icon="📝" title="Roster & Substitutions">
        <Rules>
          <Rule>Free substitution on defense — swap any time.</Rule>
          <Rule>Batting order is continuous — everyone present bats.</Rule>
          <Rule>Absent players don't appear in the lineup or rotation.</Rule>
        </Rules>
        <SmartPlay title="Stack the top of the order">
          Best contact hitters at #1–4, speed guys at #5–6, power at
          #3–5. The app auto-randomizes each game, but use the Lineup
          arrows to tune it.
        </SmartPlay>
      </Section>

      <p className="mt-4 text-[11px] text-phil-maroon font-semibold text-center">
        Rules vary by league — double-check the specifics with your
        local board. This guide matches the Kid Pitch (AA) defaults used
        in the app's Settings screen.
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
