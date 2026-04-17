import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: ReactNode;
}

export default function Header({ title, subtitle, onBack, right }: HeaderProps) {
  const nav = useNavigate();
  const back = onBack ?? (() => nav(-1));
  return (
    <header className="px-4 pt-2 pb-3 flex items-center gap-3 border-b border-ump-line bg-ump-bg">
      <button
        onClick={back}
        className="tap-btn tap-btn-neutral tap-btn-sm"
        aria-label="Back"
      >
        ←
      </button>
      <div className="flex-1 min-w-0">
        <h1 className="text-xl font-bold leading-tight truncate">{title}</h1>
        {subtitle && <p className="text-xs text-ump-dim truncate">{subtitle}</p>}
      </div>
      {right}
    </header>
  );
}
