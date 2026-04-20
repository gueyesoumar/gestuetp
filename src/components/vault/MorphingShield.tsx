/**
 * MorphingShield — animated shield logo that cycles through product colors.
 * Displays product name label synced with color transition.
 */

import { useState, useEffect } from 'react'

interface ProductDef {
  name: string
  color: string
}

const PRODUCTS: ProductDef[] = [
  { name: 'Comply', color: '#40916C' },
  { name: 'Risk', color: '#DC2626' },
  { name: 'Policy', color: '#7B68EE' },
  { name: 'Awareness', color: '#E67E22' },
  { name: 'Data Privacy', color: '#3B82F6' },
  { name: 'Quality', color: '#0891B2' },
]

const CYCLE_MS = 3000

interface MorphingShieldProps {
  size?: number
}

export function MorphingShield({ size = 64 }: MorphingShieldProps): JSX.Element {
  const [index, setIndex] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false)
      // Fade out, then switch color + fade in
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % PRODUCTS.length)
        setVisible(true)
      }, 400)
    }, CYCLE_MS)
    return () => clearInterval(interval)
  }, [])

  const product = PRODUCTS[index]
  const h = Math.round(size * 1.2)

  return (
    <div className="flex flex-col items-center gap-3">
      <style>{`
        @keyframes shieldScan {
          0%, 100% { top: 20%; opacity: 0; }
          10% { opacity: 1; }
          50% { top: 75%; opacity: 1; }
          60% { opacity: 0; }
        }
      `}</style>
      <div className="relative">
        <svg
          width={size}
          height={h}
          viewBox="0 0 44 52"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ transition: 'filter 0.4s ease' }}
        >
          {/* Shield body */}
          <path
            d="M22 3L4 11V23C4 36.5 22 48 22 48C22 48 40 36.5 40 23V11L22 3Z"
            fill="transparent"
            stroke={product.color}
            strokeWidth="1.2"
            style={{ transition: 'stroke 0.8s ease' }}
          />
          {/* Fingerprint arcs */}
          <path d="M22 16C18 16 15 19 15 23" stroke={product.color} strokeWidth="1.8" strokeLinecap="round" style={{ transition: 'stroke 0.8s ease' }} />
          <path d="M22 13C16 13 12 17.5 12 23.5" stroke={product.color} strokeWidth="1.8" strokeLinecap="round" opacity="0.5" style={{ transition: 'stroke 0.8s ease' }} />
          <path d="M22 19C20 19 18 20.5 18 23.5V29" stroke={product.color} strokeWidth="1.8" strokeLinecap="round" style={{ transition: 'stroke 0.8s ease' }} />
          <path d="M22 16C26 16 29 19 29 23V27" stroke={product.color} strokeWidth="1.8" strokeLinecap="round" style={{ transition: 'stroke 0.8s ease' }} />
          <path d="M22 13C28 13 32 17.5 32 23.5V25" stroke={product.color} strokeWidth="1.8" strokeLinecap="round" opacity="0.5" style={{ transition: 'stroke 0.8s ease' }} />
          <path d="M22 23V33" stroke={product.color} strokeWidth="1.8" strokeLinecap="round" style={{ transition: 'stroke 0.8s ease' }} />
          <path d="M26 23V31" stroke={product.color} strokeWidth="1.8" strokeLinecap="round" opacity="0.5" style={{ transition: 'stroke 0.8s ease' }} />
        </svg>
        {/* Scan line */}
        <div
          className="absolute h-[2px]"
          style={{
            left: '20%',
            right: '20%',
            top: '20%',
            background: `linear-gradient(90deg, transparent, ${product.color}, transparent)`,
            boxShadow: `0 0 10px ${product.color}60`,
            animation: 'shieldScan 2.5s ease-in-out infinite',
            transition: 'background 0.8s ease, box-shadow 0.8s ease',
          }}
        />
      </div>
      {/* Product name label */}
      <span
        className="text-[11px] font-semibold uppercase tracking-[3px]"
        style={{
          color: product.color,
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.4s ease, color 0.8s ease',
        }}
      >
        {product.name}
      </span>
    </div>
  )
}
