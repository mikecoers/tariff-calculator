interface Props {
  size?: number;
  className?: string;
  withOutline?: boolean;
  /** Overlay a slot/jersey number in the center */
  number?: number | string;
}

/**
 * Retro-style Phillies 'P' mark — powder blue circle, maroon 'P',
 * white baseball nested in the loop. Not the official logo, but
 * captures the classic 1970s feel.
 */
export default function PhilliesLogo({ size = 32, className = '', withOutline = true, number }: Props) {
  return (
    <span
      className={`inline-flex items-center justify-center relative shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
        {/* Outer circle */}
        <circle
          cx="50"
          cy="50"
          r="48"
          fill="#a4c8e1"
          stroke={withOutline ? '#ffffff' : 'none'}
          strokeWidth={withOutline ? 2 : 0}
        />
        {/* Inner ring */}
        <circle cx="50" cy="50" r="45" fill="none" stroke="#6d1a33" strokeWidth="1.5" opacity="0.6" />

        {/* P stem */}
        <rect x="26" y="18" width="13" height="65" rx="1.5" fill="#6d1a33" />

        {/* P loop (outer) */}
        <path
          d="M 39 18 L 58 18 Q 78 18 78 38 Q 78 58 58 58 L 39 58 Z"
          fill="#6d1a33"
        />
        {/* P loop (inner cutout) */}
        <circle cx="58" cy="38" r="11" fill="#a4c8e1" />

        {/* Baseball inside the loop */}
        <circle cx="58" cy="38" r="7.5" fill="#fff5e8" stroke="#6d1a33" strokeWidth="0.6" />
        <path
          d="M 53 33.5 Q 58 38 53 42.5"
          stroke="#b91c1c"
          strokeWidth="0.9"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M 63 33.5 Q 58 38 63 42.5"
          stroke="#b91c1c"
          strokeWidth="0.9"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
      {number != null && (
        <span
          className="absolute font-black text-phil-cream leading-none pointer-events-none"
          style={{
            bottom: Math.max(2, size * 0.08),
            fontSize: Math.max(8, size * 0.32),
            textShadow: '0 1px 2px rgba(0,0,0,0.55)'
          }}
        >
          {number}
        </span>
      )}
    </span>
  );
}
