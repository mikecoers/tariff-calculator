import { useCallback, useEffect, useRef, useState } from 'react';
import { useApp } from '@/app/AppContext';
import { playersRepo } from '@/db/repositories';
import Header from '@/components/Header';
import PrimaryButton from '@/components/PrimaryButton';
import Modal from '@/components/Modal';
import EmptyState from '@/components/EmptyState';
import { parseRosterCsv, rosterToCsv } from './csv';
import { DEFENSIVE_POSITIONS, type Player, type Position } from '@/types';

const emptyPlayer = (teamId: string): Omit<Player, 'id' | 'createdAt' | 'updatedAt'> => ({
  teamId,
  firstName: '',
  lastName: '',
  displayName: '',
  jerseyNumber: '',
  age: undefined,
  bats: 'R',
  throws: 'R',
  isCatcher: false,
  preferredPositions: [],
  secondaryPositions: [],
  active: true
});

export default function RosterScreen() {
  const { team } = useApp();
  const [players, setPlayers] = useState<Player[]>([]);
  const [editing, setEditing] = useState<Player | null>(null);
  const [creating, setCreating] = useState<ReturnType<typeof emptyPlayer> | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [csvText, setCsvText] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!team) return;
    setPlayers(await playersRepo.byTeam(team.id));
  }, [team]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!team) return <div className="p-4">Create a team on the Home screen first.</div>;

  const togglePosition = (list: Position[], pos: Position): Position[] =>
    list.includes(pos) ? list.filter((p) => p !== pos) : [...list, pos];

  const savePlayer = async () => {
    if (creating) {
      if (!creating.firstName.trim() && !creating.lastName.trim()) return;
      const display = creating.displayName.trim() || creating.firstName.trim();
      await playersRepo.create({ ...creating, displayName: display });
      setCreating(null);
    } else if (editing) {
      await playersRepo.update(editing.id, editing);
      setEditing(null);
    }
    await load();
  };

  const exportCsv = () => {
    const csv = rosterToCsv(players);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${team.name.replace(/\W+/g, '_')}_roster.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importCsv = async () => {
    const { rows, errors } = parseRosterCsv(csvText);
    if (rows.length === 0) {
      alert(`No rows imported. ${errors.join('; ')}`);
      return;
    }
    await playersRepo.bulkCreate(rows.map((r) => ({ ...r, teamId: team.id })));
    setImportOpen(false);
    setCsvText('');
    await load();
  };

  const current = editing ?? creating;

  return (
    <div>
      <Header
        title="Roster"
        subtitle={`${players.length} players`}
        right={
          <button className="tap-btn tap-btn-primary tap-btn-sm" onClick={() => setCreating(emptyPlayer(team.id))}>
            + Add
          </button>
        }
      />
      <div className="p-4 space-y-3 pb-24 max-w-2xl mx-auto">
        <div className="flex gap-2">
          <button className="tap-btn tap-btn-neutral tap-btn-sm flex-1" onClick={() => setImportOpen(true)}>
            Import CSV
          </button>
          <button
            className="tap-btn tap-btn-neutral tap-btn-sm flex-1"
            onClick={exportCsv}
            disabled={players.length === 0}
          >
            Export CSV
          </button>
        </div>

        {players.length === 0 ? (
          <EmptyState
            icon="👥"
            title="No players yet"
            description="Add players one-by-one or import a CSV file."
            action={<PrimaryButton onClick={() => setCreating(emptyPlayer(team.id))}>Add a player</PrimaryButton>}
          />
        ) : (
          <ul className="space-y-2">
            {players.map((p) => (
              <li key={p.id}>
                <button className="card w-full text-left" onClick={() => setEditing(p)}>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-ump-bg text-ump-accent font-bold text-xl flex items-center justify-center border border-ump-line">
                      {p.jerseyNumber || '#'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{p.displayName || `${p.firstName} ${p.lastName}`}</div>
                      <div className="text-xs text-ump-dim truncate">
                        {p.preferredPositions.join(', ') || 'No positions'}
                        {p.age != null ? ` · Age ${p.age}` : ''}
                      </div>
                    </div>
                    {!p.active && <span className="chip">Inactive</span>}
                    {p.isCatcher && <span className="chip-ok">C</span>}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Modal
        open={!!current}
        onClose={() => {
          setEditing(null);
          setCreating(null);
        }}
        title={creating ? 'Add player' : 'Edit player'}
        footer={
          <>
            {editing && (
              <button
                className="tap-btn tap-btn-danger tap-btn-sm mr-auto"
                onClick={async () => {
                  if (!confirm('Delete this player?')) return;
                  await playersRepo.remove(editing.id);
                  setEditing(null);
                  await load();
                }}
              >
                Delete
              </button>
            )}
            <button
              className="tap-btn tap-btn-neutral tap-btn-sm"
              onClick={() => {
                setEditing(null);
                setCreating(null);
              }}
            >
              Cancel
            </button>
            <PrimaryButton size="sm" onClick={savePlayer}>
              Save
            </PrimaryButton>
          </>
        }
      >
        {current && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <label>
                <span className="field-label">First name</span>
                <input
                  className="input mt-1"
                  value={current.firstName}
                  onChange={(e) =>
                    creating
                      ? setCreating({ ...current, firstName: e.target.value })
                      : setEditing({ ...(current as Player), firstName: e.target.value })
                  }
                />
              </label>
              <label>
                <span className="field-label">Last name</span>
                <input
                  className="input mt-1"
                  value={current.lastName}
                  onChange={(e) =>
                    creating
                      ? setCreating({ ...current, lastName: e.target.value })
                      : setEditing({ ...(current as Player), lastName: e.target.value })
                  }
                />
              </label>
              <label>
                <span className="field-label">Display name</span>
                <input
                  className="input mt-1"
                  value={current.displayName}
                  onChange={(e) =>
                    creating
                      ? setCreating({ ...current, displayName: e.target.value })
                      : setEditing({ ...(current as Player), displayName: e.target.value })
                  }
                />
              </label>
              <label>
                <span className="field-label">Jersey #</span>
                <input
                  className="input mt-1"
                  value={current.jerseyNumber || ''}
                  onChange={(e) =>
                    creating
                      ? setCreating({ ...current, jerseyNumber: e.target.value })
                      : setEditing({ ...(current as Player), jerseyNumber: e.target.value })
                  }
                />
              </label>
              <label>
                <span className="field-label">Age</span>
                <input
                  type="number"
                  className="input mt-1"
                  value={current.age ?? ''}
                  onChange={(e) => {
                    const v = e.target.value ? Number(e.target.value) : undefined;
                    creating
                      ? setCreating({ ...current, age: v })
                      : setEditing({ ...(current as Player), age: v });
                  }}
                />
              </label>
              <label>
                <span className="field-label">Bats / Throws</span>
                <div className="flex gap-1 mt-1">
                  <select
                    className="input"
                    value={current.bats || 'R'}
                    onChange={(e) => {
                      const v = e.target.value as Player['bats'];
                      creating
                        ? setCreating({ ...current, bats: v })
                        : setEditing({ ...(current as Player), bats: v });
                    }}
                  >
                    <option value="R">R</option>
                    <option value="L">L</option>
                    <option value="S">S</option>
                  </select>
                  <select
                    className="input"
                    value={current.throws || 'R'}
                    onChange={(e) => {
                      const v = e.target.value as Player['throws'];
                      creating
                        ? setCreating({ ...current, throws: v })
                        : setEditing({ ...(current as Player), throws: v });
                    }}
                  >
                    <option value="R">R</option>
                    <option value="L">L</option>
                  </select>
                </div>
              </label>
            </div>

            <div>
              <span className="field-label">Preferred positions</span>
              <div className="grid grid-cols-3 gap-1 mt-1">
                {DEFENSIVE_POSITIONS.map((pos) => {
                  const on = current.preferredPositions.includes(pos);
                  return (
                    <button
                      key={pos}
                      className={`tap-btn tap-btn-sm ${on ? 'tap-btn-success' : 'tap-btn-neutral'}`}
                      onClick={() => {
                        const next = togglePosition(current.preferredPositions, pos);
                        creating
                          ? setCreating({ ...current, preferredPositions: next })
                          : setEditing({ ...(current as Player), preferredPositions: next });
                      }}
                    >
                      {pos}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <span className="field-label">Secondary positions</span>
              <div className="grid grid-cols-3 gap-1 mt-1">
                {DEFENSIVE_POSITIONS.map((pos) => {
                  const on = current.secondaryPositions.includes(pos);
                  return (
                    <button
                      key={pos}
                      className={`tap-btn tap-btn-sm ${on ? 'tap-btn-primary' : 'tap-btn-neutral'}`}
                      onClick={() => {
                        const next = togglePosition(current.secondaryPositions, pos);
                        creating
                          ? setCreating({ ...current, secondaryPositions: next })
                          : setEditing({ ...(current as Player), secondaryPositions: next });
                      }}
                    >
                      {pos}
                    </button>
                  );
                })}
              </div>
            </div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="h-5 w-5"
                checked={!!current.isCatcher}
                onChange={(e) => {
                  creating
                    ? setCreating({ ...current, isCatcher: e.target.checked })
                    : setEditing({ ...(current as Player), isCatcher: e.target.checked });
                }}
              />
              Designated catcher
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="h-5 w-5"
                checked={!!current.active}
                onChange={(e) => {
                  creating
                    ? setCreating({ ...current, active: e.target.checked })
                    : setEditing({ ...(current as Player), active: e.target.checked });
                }}
              />
              Active roster
            </label>
          </div>
        )}
      </Modal>

      <Modal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Import roster CSV"
        footer={
          <>
            <button className="tap-btn tap-btn-neutral tap-btn-sm" onClick={() => setImportOpen(false)}>
              Cancel
            </button>
            <PrimaryButton size="sm" disabled={!csvText.trim()} onClick={importCsv}>
              Import
            </PrimaryButton>
          </>
        }
      >
        <p className="text-xs text-ump-dim">
          Columns: first_name, last_name, display_name, jersey_number, age, bats, throws, is_catcher, preferred_positions
          (pipe-separated), secondary_positions, notes, active
        </p>
        <input
          ref={fileInput}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            file.text().then(setCsvText);
          }}
        />
        <div className="flex gap-2">
          <button
            className="tap-btn tap-btn-neutral tap-btn-sm"
            onClick={() => fileInput.current?.click()}
          >
            Choose file
          </button>
        </div>
        <textarea
          className="input h-40 font-mono text-xs"
          placeholder="Paste CSV here..."
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
        />
      </Modal>
    </div>
  );
}
