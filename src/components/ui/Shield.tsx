// Escudo del Club Jorge Newbery — verde con banda diagonal blanca
interface ShieldProps {
  size?: number
  className?: string
}

export function Shield({ size = 48, className = '' }: ShieldProps) {
  return (
    <svg
      width={size}
      height={size * 1.2}
      viewBox="0 0 100 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Escudo Club Jorge Newbery"
    >
      {/* Forma del escudo */}
      <path
        d="M50 4 L96 22 L96 70 C96 95 50 116 50 116 C50 116 4 95 4 70 L4 22 Z"
        fill="#1E7A34"
        stroke="#155C27"
        strokeWidth="2"
      />
      {/* Banda diagonal blanca */}
      <path
        d="M50 4 L96 22 L96 70 C96 95 50 116 50 116 C50 116 4 95 4 70 L4 22 Z"
        fill="url(#diagonal)"
        clipPath="url(#shield-clip)"
      />
      <defs>
        <clipPath id="shield-clip">
          <path d="M50 4 L96 22 L96 70 C96 95 50 116 50 116 C50 116 4 95 4 70 L4 22 Z" />
        </clipPath>
        <linearGradient id="diagonal" x1="0" y1="0" x2="1" y2="1" gradientUnits="objectBoundingBox">
          <stop offset="0%"   stopColor="transparent" />
          <stop offset="38%"  stopColor="transparent" />
          <stop offset="38%"  stopColor="white" />
          <stop offset="62%"  stopColor="white" />
          <stop offset="62%"  stopColor="transparent" />
          <stop offset="100%" stopColor="transparent" />
        </linearGradient>
      </defs>
      {/* Texto TDM */}
      <text
        x="50"
        y="75"
        textAnchor="middle"
        fill="white"
        fontSize="18"
        fontWeight="bold"
        fontFamily="system-ui, sans-serif"
        style={{ paintOrder: 'stroke' }}
        stroke="#1E7A34"
        strokeWidth="3"
      >
        TDM
      </text>
    </svg>
  )
}
