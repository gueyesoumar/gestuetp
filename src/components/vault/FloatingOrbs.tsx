/**
 * FloatingOrbs — CSS-animated blurred circles for ambient effect.
 */

interface Orb {
  color: string
  size: number
  top: string
  left: string
  delay: string
  duration: string
}

const ORBS: Orb[] = [
  { color: 'rgba(212, 168, 67, 0.06)', size: 300, top: '10%', left: '15%', delay: '0s', duration: '8s' },
  { color: 'rgba(64, 145, 108, 0.05)', size: 250, top: '60%', left: '70%', delay: '2s', duration: '10s' },
  { color: 'rgba(212, 168, 67, 0.04)', size: 200, top: '30%', left: '80%', delay: '4s', duration: '12s' },
  { color: 'rgba(64, 145, 108, 0.03)', size: 350, top: '70%', left: '20%', delay: '1s', duration: '9s' },
]

export function FloatingOrbs(): JSX.Element {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {ORBS.map((orb, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: orb.size,
            height: orb.size,
            top: orb.top,
            left: orb.left,
            background: orb.color,
            filter: 'blur(80px)',
            animation: `floatOrb ${orb.duration} ease-in-out infinite`,
            animationDelay: orb.delay,
          }}
        />
      ))}
    </div>
  )
}
