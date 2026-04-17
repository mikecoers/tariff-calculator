import Modal from './Modal';
import { haptic } from '@/lib/haptics';

export type BaseKey = 'first' | 'second' | 'third';
export type BaseAction = 'advance' | 'score' | 'out';

interface Props {
  open: boolean;
  base: BaseKey | null;
  runnerName?: string;
  onClose: () => void;
  onChoose: (action: BaseAction) => void;
}

export default function BaseActionMenu({ open, base, runnerName, onClose, onChoose }: Props) {
  const baseLabel = base === 'first' ? '1st' : base === 'second' ? '2nd' : base === 'third' ? '3rd' : '';
  return (
    <Modal open={open} onClose={onClose} title={`${runnerName ?? 'Runner'} on ${baseLabel}`}>
      <p className="text-xs text-phil-maroon mb-2">Pick what happened to the runner.</p>
      <div className="grid grid-cols-1 gap-2">
        <button
          className="tap-btn tap-btn-primary tap-btn-lg"
          onClick={() => {
            haptic('light');
            onChoose('advance');
          }}
        >
          Advance to {base === 'first' ? '2nd' : base === 'second' ? '3rd' : 'home'}
        </button>
        {base !== 'third' && (
          <button
            className="tap-btn tap-btn-success tap-btn-lg"
            onClick={() => {
              haptic('success');
              onChoose('score');
            }}
          >
            Runner SCORED
          </button>
        )}
        <button
          className="tap-btn tap-btn-danger tap-btn-lg"
          onClick={() => {
            haptic('warning');
            onChoose('out');
          }}
        >
          Runner OUT (pickoff / caught stealing)
        </button>
        <button className="tap-btn tap-btn-neutral tap-btn-sm" onClick={onClose}>
          Cancel
        </button>
      </div>
    </Modal>
  );
}
