import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeftRight, Check, LayoutGrid } from 'lucide-react'
import shieldSvg from '../../assets/logo-shield.svg'

/** Bouton « Changer d'espace » dans la banniere admin : console / cabinet / hub. */
export function SpaceSwitcher(): JSX.Element {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  return (
    <div className="relative ml-auto">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 bg-forest-900 text-white px-3 py-1 rounded-full text-[11.5px] font-bold hover:bg-forest-700"
      >
        <ArrowLeftRight size={12} /> Changer d&apos;espace
      </button>
      {open && (
        <>
          <button className="fixed inset-0 z-10 cursor-default" aria-hidden onClick={() => setOpen(false)} />
          <div className="absolute z-20 right-0 mt-2 w-64 bg-white text-gray-700 rounded-xl shadow-2xl border border-gray-100 overflow-hidden p-1.5">
            <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-gold-200/40">
              <div className="w-7 h-7 rounded-lg bg-forest-900 flex items-center justify-center"><img src={shieldSvg} alt="" width={15} height={18} /></div>
              <div className="flex-1"><div className="text-[12.5px] font-bold text-forest-900">Console super-admin</div><div className="text-[10.5px] text-gray-500">Espace actuel</div></div>
              <Check size={15} className="text-forest-700" />
            </div>
            <button onClick={() => navigate('/')} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left hover:bg-forest-50">
              <div className="w-7 h-7 rounded-lg bg-forest-100 text-forest-700 flex items-center justify-center text-[13px] font-bold">C</div>
              <div><div className="text-[12.5px] font-semibold text-gray-900">G&euml;stu Comply</div><div className="text-[10.5px] text-gray-500">Missions, clients, r&eacute;f&eacute;rentiels&hellip;</div></div>
            </button>
            <button onClick={() => navigate('/hub')} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-gray-500 hover:bg-gray-50">
              <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center"><LayoutGrid size={15} /></div>
              <div className="text-[12.5px] font-medium">Tous les produits (hub)</div>
            </button>
          </div>
        </>
      )}
    </div>
  )
}
