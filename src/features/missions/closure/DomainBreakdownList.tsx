import { Badge } from '../../../components/ui/Badge'

interface DomainScore {
  domain_code: string
  domain_name: string
  total: number
  approved: number
  score: number
}

interface DomainBreakdownListProps {
  domainScores: DomainScore[]
}

export function DomainBreakdownList({ domainScores }: DomainBreakdownListProps){
  return (
    <div className="bg-white border border-gray-200 rounded-xl mb-6">
      <div className="px-5 py-3 border-b border-gray-100">
        <h4 className="text-sm font-semibold text-gray-900">Score par domaine</h4>
      </div>
      <div className="divide-y divide-gray-50">
        {domainScores.map((ds) => {
          const color = ds.score >= 80 ? '#27AE60' : ds.score >= 50 ? '#D4A843' : ds.score > 0 ? '#C0392B' : '#E5E7EB'
          return (
            <div key={ds.domain_code} className="flex items-center gap-3 px-5 py-3">
              <span className="w-12 text-xs font-mono font-semibold text-forest-700 shrink-0">{ds.domain_code}</span>
              <span className="flex-1 text-[13px] text-gray-900 truncate">{ds.domain_name}</span>
              <div className="w-32 shrink-0">
                <div className="h-1.5 rounded-full bg-gray-200">
                  <div className="h-1.5 rounded-full transition-all" style={{ width: `${ds.score}%`, background: color }} />
                </div>
              </div>
              <span className="w-12 text-right text-xs font-semibold text-gray-700">{ds.score}%</span>
              <Badge label={`${ds.approved}/${ds.total}`} variant={ds.score === 100 ? 'green' : 'gray'} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
