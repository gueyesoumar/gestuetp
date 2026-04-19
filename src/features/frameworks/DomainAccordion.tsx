import { useState } from 'react'
import { Badge } from '../../components/ui/Badge'
import type { Control } from '../../types/database.types'
import type { DomainWithControls } from './useFrameworkDetail'

interface DomainAccordionProps {
  domain: DomainWithControls
  defaultOpen?: boolean
  onSelectControl: (control: Control, domainName: string) => void
}

export function DomainAccordion({ domain, defaultOpen = false, onSelectControl }: DomainAccordionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-mono font-semibold text-forest-700">{domain.code}</span>
          <span className="text-sm font-medium text-gray-900">{domain.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge label={`${domain.controls.length} contr\u00f4les`} variant="gray" />
          <span className="text-gray-400">{open ? '\u25B2' : '\u25BC'}</span>
        </div>
      </button>

      {open && (
        <div className="border-t border-gray-100 px-5 pb-4">
          {domain.description && (
            <p className="py-3 text-sm text-gray-500">{domain.description}</p>
          )}
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                <th className="pb-2 pr-4">Code</th>
                <th className="pb-2 pr-4">Contr&ocirc;le</th>
                <th className="pb-2">Description</th>
              </tr>
            </thead>
            <tbody>
              {domain.controls.map((control) => (
                <tr
                  key={control.id}
                  onClick={() => onSelectControl(control, `${domain.code} — ${domain.name}`)}
                  className="cursor-pointer border-t border-gray-50 hover:bg-forest-50"
                >
                  <td className="py-2 pr-4 text-sm font-mono text-forest-700">{control.code}</td>
                  <td className="py-2 pr-4 text-sm font-medium text-gray-900">{control.name}</td>
                  <td className="py-2 text-sm text-gray-500 line-clamp-1">{control.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
