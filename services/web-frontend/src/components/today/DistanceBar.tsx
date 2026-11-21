/** 100 = trigger is at the price, 50 = one typical day (ATR) away, 0 = two or more days away. */
export function barPosition(distancePct: number, atrPct: number): number {
  if (!(atrPct > 0)) return 0
  const pos = 100 - (Math.abs(distancePct) / atrPct) * 50
  return Math.max(0, Math.min(100, pos))
}

interface DistanceBarProps {
  distancePct: number
  atrPct: number
}

export function DistanceBar({ distancePct, atrPct }: DistanceBarProps) {
  const pos = barPosition(distancePct, atrPct)
  const label = `Trigger is ${Math.abs(distancePct).toFixed(1)}% away`
  return (
    <svg width="96" height="10" viewBox="0 0 96 10" role="img" aria-label={label}>
      <title>{label}</title>
      <rect x="0" y="3" width="96" height="4" rx="2" fill="currentColor" opacity="0.15" />
      <rect x="0" y="3" width={(96 * pos) / 100} height="4" rx="2" fill="#B7791F" />
      <line x1="48" y1="0" x2="48" y2="10" stroke="currentColor" opacity="0.4" strokeWidth="1" />
    </svg>
  )
}
