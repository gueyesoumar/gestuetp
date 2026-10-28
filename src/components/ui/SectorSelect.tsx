import { useSectors } from '../../hooks/useSectors'

interface SectorSelectProps {
  value: string
  onChange: (value: string) => void
  id?: string
  className?: string
  disabled?: boolean
  placeholder?: string
}

/**
 * Sélecteur de secteur mono-valeur (RFC 0022, Lot 2) alimenté par le référentiel
 * paramétrable (`useSectors`). La valeur reste le LIBELLÉ (clé de rapprochement, Option A).
 * La valeur courante est toujours proposée, même si elle n'est plus dans la liste active
 * (secteur archivé ou hérité d'une autre taxonomie), pour ne jamais la perdre à l'édition.
 */
export function SectorSelect({
  value,
  onChange,
  id,
  className,
  disabled,
  placeholder = 'Sélectionner',
}: SectorSelectProps): JSX.Element {
  const { sectors, loading } = useSectors()
  const known = value === '' || sectors.some((s) => s.label === value)
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled || loading}
      className={className}
    >
      <option value="">{loading ? 'Chargement...' : placeholder}</option>
      {!known && <option value={value}>{value}</option>}
      {sectors.map((s) => (
        <option key={s.id} value={s.label}>{s.label}</option>
      ))}
    </select>
  )
}
