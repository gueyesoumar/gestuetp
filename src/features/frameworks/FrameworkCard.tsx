import { Link } from 'react-router-dom'
import type { Framework } from '../../types/database.types'

const iconStyles: Record<string, { abbr: string; bg: string; text: string }> = {
  'iso-27001': { abbr: 'ISO', bg: 'bg-forest-100 text-forest-700', text: '' },
  'nist-csf': { abbr: 'NIST', bg: 'bg-blue-100 text-blue-700', text: '' },
  'cobit-2019': { abbr: 'COB', bg: 'bg-gold-200 text-gold-600', text: '' },
  'itil-v4': { abbr: 'ITIL', bg: 'bg-indigo-100 text-indigo-700', text: '' },
  'audit-si': { abbr: 'G\u00eb', bg: 'bg-forest-900 text-gold-500', text: '' },
  'due-diligence-tech': { abbr: 'G\u00eb', bg: 'bg-forest-900 text-gold-500', text: '' },
  'maturite-digitale': { abbr: 'G\u00eb', bg: 'bg-forest-900 text-gold-500', text: '' },
}

interface FrameworkCardProps {
  framework: Framework
}

export function FrameworkCard({ framework }: FrameworkCardProps) {
  const icon = iconStyles[framework.slug] ?? { abbr: framework.name.substring(0, 3).toUpperCase(), bg: 'bg-gray-100 text-gray-600', text: '' }
  const isGestu = framework.publisher === 'G\u00ebstu'

  return (
    <Link
      to={`/referentiels/${framework.slug}`}
      className="flex flex-col rounded-xl border border-gray-200 bg-white p-5 transition-all hover:shadow-md hover:border-forest-300"
    >
      <div className="flex items-start justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-[10px] text-[12px] font-extrabold ${icon.bg}`}>
          {icon.abbr}
        </div>
        <div className="flex gap-1.5">
          {isGestu && (
            <span className="rounded-full bg-gold-200 px-2 py-0.5 text-[10px] font-semibold text-gold-600">
              G&euml;stu
            </span>
          )}
          {framework.version && (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">
              v{framework.version}
            </span>
          )}
        </div>
      </div>

      <h3 className="mt-3 text-[14px] font-bold text-gray-900">{framework.name}</h3>
      <p className="mt-0.5 text-[11px] text-gray-300">{framework.publisher}</p>

      {framework.description && (
        <p className="mt-2 text-[12px] text-gray-500 line-clamp-2 leading-relaxed flex-1">{framework.description}</p>
      )}
    </Link>
  )
}
