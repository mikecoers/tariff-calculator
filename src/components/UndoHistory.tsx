import { useEffect, useState } from 'react';
import Modal from './Modal';
import { gameEventsRepo } from '@/db/repositories';
import type { GameEvent } from '@/types';

interface Props {
  open: boolean;
  gameId: string | undefined;
  onClose: () => void;
  onUndoTo: (eventId: string) => void;
  onUndoOne: () => void;
}

export default function UndoHistory({ open, gameId, onClose, onUndoTo, onUndoOne }: Props) {
  const [events, setEvents] = useState<GameEvent[]>([]);

  useEffect(() => {
    if (!open || !gameId) return;
    void (async () => {
      const all = await gameEventsRepo.forGame(gameId);
      const recent = all.filter((e) => e.type !== 'half_inning_change').slice(-8).reverse();
      setEvents(recent);
    })();
  }, [open, gameId]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Recent plays · undo"
      footer={
        <>
          <button className="tap-btn tap-btn-neutral tap-btn-sm" onClick={onClose}>
            Close
          </button>
          <button
            className="tap-btn tap-btn-primary tap-btn-sm"
            onClick={() => {
              onUndoOne();
              onClose();
            }}
          >
            Undo last
          </button>
        </>
      }
    >
      {events.length === 0 ? (
        <div className="text-sm text-phil-maroon/70">Nothing to undo yet.</div>
      ) : (
        <ul className="divide-y divide-ump-line">
          {events.map((e, idx) => (
            <li key={e.id} className="py-2 flex items-center gap-2">
              <span className="chip-info w-10 justify-center">#{events.length - idx}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm truncate">{labelFor(e)}</div>
                <div className="text-[10px] text-phil-maroon/70">
                  Inn {e.inning} {e.halfInning === 'top' ? '▲' : '▼'} · {new Date(e.timestamp).toLocaleTimeString()}
                </div>
              </div>
              <button
                className="tap-btn tap-btn-danger tap-btn-sm"
                onClick={() => {
                  onUndoTo(e.id);
                  onClose();
                }}
              >
                Roll back to here
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

function labelFor(e: GameEvent): string {
  const payload = e.payload as any;
  if (e.type === 'at_bat') {
    if (payload?.type === 'runner_advance') return `Runner advanced from ${payload.from}`;
    if (payload?.type === 'runner_scored') return `Runner scored from ${payload.from}`;
    if (payload?.type === 'runner_out') return `Runner out at ${payload.from}`;
    if (payload?.pitchResult) return `Pitch: ${payload.pitchResult}`;
    if (payload?.result) return `${payload.result}${payload.runs ? ` (+${payload.runs}R)` : ''}`;
    return 'At bat';
  }
  if (e.type === 'pitching_change') return 'Pitching change';
  if (e.type === 'defensive_change') return 'Defense rotation';
  if (e.type === 'game_end') return 'Game ended';
  return e.type;
}
