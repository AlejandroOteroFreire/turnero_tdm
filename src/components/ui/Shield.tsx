interface ShieldProps {
  size?: number
  className?: string
}

export function Shield({ size = 48, className = '' }: ShieldProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo.jpg"
      width={size}
      height={size}
      alt="Club Jorge Newbery — Tenis de Mesa"
      className={`rounded-full object-cover ${className}`}
    />
  )
}
