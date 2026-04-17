import { ReactNode } from 'react';

type Tone = 'default' | 'ok' | 'warn' | 'crit' | 'info';

export default function Chip({ tone = 'default', children }: { tone?: Tone; children: ReactNode }) {
  const cls =
    tone === 'ok'
      ? 'chip-ok'
      : tone === 'warn'
      ? 'chip-warn'
      : tone === 'crit'
      ? 'chip-crit'
      : tone === 'info'
      ? 'chip-info'
      : 'chip';
  return <span className={cls}>{children}</span>;
}
