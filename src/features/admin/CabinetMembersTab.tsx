import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Search } from 'lucide-react'
import { useCabinetMembersAll, type CabinetMember } from './useCabinetMembersAll'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { ErrorAlert } from '../../components/ui/ErrorAlert'

interface Props {
  cabinetId: string
}

export function CabinetMembersTab({ cabinetId }: Props) {
  const { members, loading, error } = useCabinetMembersAll(cabinetId)
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return members
    return members.filter((m) =>
      m.email.toLowerCase().includes(q) ||
      m.first_name.toLowerCase().includes(q) ||
      m.last_name.toLowerCase().includes(q),
    )
  }, [members, search])

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorAlert message={error} />

  const activeCount = members.filter((m) => m.is_active).length
  const inactiveCount = members.length - activeCount

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filtrer par nom ou email…"
            className="pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-[12.5px] w-72 bg-page-bg"
          />
        </div>
        <span className="text-[11px] bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-semibold">{activeCount} actifs</span>
        {inactiveCount > 0 && <span className="text-[11px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-semibold">{inactiveCount} inactifs</span>}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl px-6 py-12 text-center text-[12.5px] text-gray-300">
          Aucun membre ne correspond.
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-page-bg text-[10.5px] uppercase tracking-wider text-gray-300 font-semibold">
                <th className="text-left px-4 py-3 border-b border-gray-200">Membre</th>
                <th className="text-left px-4 py-3 border-b border-gray-200">Rôles</th>
                <th className="text-left px-4 py-3 border-b border-gray-200">Dernière connexion</th>
                <th className="text-left px-4 py-3 border-b border-gray-200">Statut</th>
                <th className="px-4 py-3 border-b border-gray-200" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => <Row key={m.id} member={m} />)}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Row({ member }: { member: CabinetMember }) {
  return (
    <tr className="hover:bg-page-bg">
      <td className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-forest-100 text-forest-700 flex items-center justify-center font-extrabold text-[11px]">
            {member.first_name.charAt(0)}{member.last_name.charAt(0)}
          </div>
          <div>
            <div className="font-semibold text-gray-900 text-[13px]">{member.first_name} {member.last_name}{member.is_platform_owner && <span className="ml-1.5 text-[9px] uppercase tracking-wider font-bold bg-gold-50 text-gold-600 px-1.5 py-0.5 rounded">Owner</span>}</div>
            <div className="text-[11px] text-gray-300">{member.email}{member.job_title && ` · ${member.job_title}`}</div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 border-b border-gray-100">
        {member.platform_roles.length === 0 ? (
          <span className="text-[11px] text-gray-300">—</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {member.platform_roles.map((r) => (
              <span key={r} className="text-[10.5px] bg-gold-50 text-gold-600 px-1.5 py-0.5 rounded font-semibold">{r}</span>
            ))}
          </div>
        )}
      </td>
      <td className="px-4 py-3 border-b border-gray-100 text-[11.5px] text-gray-500">{formatRelative(member.last_sign_in_at)}</td>
      <td className="px-4 py-3 border-b border-gray-100">
        {member.is_active
          ? <span className="text-[11px] bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-semibold">Actif</span>
          : <span className="text-[11px] bg-red-50 text-red-700 px-2 py-0.5 rounded-full font-semibold">Désactivé</span>}
      </td>
      <td className="px-4 py-3 border-b border-gray-100 text-right">
        <Link to={`/admin/utilisateurs/${member.id}`} className="text-forest-700 text-[12px] font-semibold hover:text-forest-900">Inspecter &rarr;</Link>
      </td>
    </tr>
  )
}

function formatRelative(iso: string | null): string {
  if (!iso) return 'jamais'
  const ms = Date.now() - new Date(iso).getTime()
  const min = Math.floor(ms / 60_000)
  if (min < 60) return `il y a ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `il y a ${h} h`
  const d = Math.floor(h / 24)
  if (d < 30) return `il y a ${d} j`
  return new Date(iso).toLocaleDateString('fr-FR')
}
