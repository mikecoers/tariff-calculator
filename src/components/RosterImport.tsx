import { useState } from 'react';
import Modal from './Modal';
import { haptic } from '@/lib/haptics';

interface ParsedRow {
  firstName: string;
  lastName: string;
  displayName: string;
  jerseyNumber?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onReplace: (rows: ParsedRow[]) => Promise<void> | void;
  onAdd: (rows: ParsedRow[]) => Promise<void> | void;
}

/**
 * Parses rosters pasted as free text. Each non-empty line becomes a
 * player. Recognizes:
 *   "Cooper Coers"
 *   "Cooper Coers #12"
 *   "12 Cooper Coers"
 *   "Coers, Cooper"
 *   "Cooper"   (last name optional)
 */
function parseLines(text: string): ParsedRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  const rows: ParsedRow[] = [];
  for (const raw of lines) {
    // Strip leading jersey numbers or bullets
    let cleaned = raw
      .replace(/^[•*\-–—]+\s*/, '')
      .replace(/^\d+\s*[.)-]?\s*/, (m) => (m.trim().length > 0 ? '' : ''));
    // Extract trailing jersey "#12" or "(12)"
    let jersey: string | undefined;
    const trailing = cleaned.match(/\s+#?(\d{1,3})\s*\)?\s*$/);
    if (trailing) {
      jersey = trailing[1];
      cleaned = cleaned.slice(0, trailing.index).trim();
    }
    // Extract leading jersey "12 Name" format
    const leading = cleaned.match(/^(\d{1,3})\s+/);
    if (leading && !jersey) {
      jersey = leading[1];
      cleaned = cleaned.slice(leading[0].length).trim();
    }
    // "Last, First" support
    let firstName = '';
    let lastName = '';
    if (cleaned.includes(',')) {
      const [last, first] = cleaned.split(',').map((s) => s.trim());
      firstName = first ?? '';
      lastName = last ?? '';
    } else {
      const parts = cleaned.split(/\s+/);
      firstName = parts.shift() ?? '';
      lastName = parts.join(' ');
    }
    if (!firstName && !lastName) continue;
    const display = lastName ? `${firstName} ${lastName[0]}.` : firstName;
    rows.push({ firstName, lastName, displayName: display, jerseyNumber: jersey });
  }
  return rows;
}

export default function RosterImport({ open, onClose, onReplace, onAdd }: Props) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const rows = parseLines(text);

  const run = async (mode: 'replace' | 'add') => {
    if (rows.length === 0) return;
    setBusy(true);
    haptic('medium');
    try {
      if (mode === 'replace') await onReplace(rows);
      else await onAdd(rows);
      setText('');
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Import roster"
      footer={
        <>
          <button className="tap-btn tap-btn-neutral tap-btn-sm" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            className="tap-btn tap-btn-neutral tap-btn-sm"
            disabled={busy || rows.length === 0}
            onClick={() => run('add')}
          >
            Add {rows.length ? `(${rows.length})` : ''}
          </button>
          <button
            className="tap-btn tap-btn-maroon tap-btn-sm"
            disabled={busy || rows.length === 0}
            onClick={() => {
              if (!confirm(`Replace entire roster with ${rows.length} player(s)?`)) return;
              run('replace');
            }}
          >
            Replace
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="rounded-xl border-2 border-phil-maroon/30 bg-phil-blueLight p-3">
          <div className="text-[11px] font-black uppercase tracking-widest text-phil-maroon mb-1">
            📸 From a screenshot on iPhone
          </div>
          <ol className="text-[12px] text-phil-maroonDark leading-snug space-y-0.5 list-decimal list-inside">
            <li>Open the screenshot in Photos.</li>
            <li>Long-press a name → <b>Select All</b> → <b>Copy</b> (iOS Live Text).</li>
            <li>Tap the box below and paste.</li>
          </ol>
        </div>

        <label className="block">
          <div className="text-[11px] font-black uppercase tracking-widest text-phil-maroon mb-1">
            Paste or type names (one per line)
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={10}
            className="input font-mono text-sm"
            placeholder={'Cooper Coers\nAiden Doughty\nArlington Pribble\n...'}
          />
        </label>

        <div className="text-[11px] text-phil-maroon font-semibold">
          Recognized formats: <code>Cooper Coers</code>, <code>12 Cooper Coers</code>,{' '}
          <code>Cooper Coers #12</code>, <code>Coers, Cooper</code>. Empty lines skipped.
        </div>

        {rows.length > 0 && (
          <div className="rounded-xl bg-white border border-phil-blueDeep p-2">
            <div className="text-[11px] font-black uppercase tracking-widest text-phil-maroon mb-1">
              Preview · {rows.length} player{rows.length === 1 ? '' : 's'}
            </div>
            <ul className="text-[12px] grid grid-cols-2 gap-x-3 gap-y-0.5">
              {rows.map((r, i) => (
                <li key={i} className="flex items-center gap-1.5 truncate">
                  <span className="inline-flex h-5 w-5 rounded-full bg-phil-maroon text-phil-cream items-center justify-center text-[10px] font-black shrink-0">
                    {r.jerseyNumber ?? i + 1}
                  </span>
                  <span className="truncate">{r.displayName}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Modal>
  );
}
