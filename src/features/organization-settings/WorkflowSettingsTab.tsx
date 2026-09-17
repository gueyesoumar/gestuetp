import { useEffect, useState } from 'react'
import { Brain, Sparkles } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { readInvokeError } from '../../lib/edgeError'
import { useToast } from '../../hooks/useToast'
import { useAuth } from '../../hooks/useAuth'
import { useCabinetPermissions } from '../../hooks/useCabinetPermissions'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'

/**
 * Onglet Paramètres — flux de travail. Depuis la consolidation RFC 0002, les
 * libellés des acteurs et étapes de revue (chef, associé, rôles client…) se
 * personnalisent dans l'onglet Terminologie (organization_vocab). Cet onglet ne
 * garde que le kill switch de l'analyse IA du cabinet.
 */
export function WorkflowSettingsTab(): JSX.Element {
  const { profile } = useAuth()
  const { canEditOrganization, loading: permLoading } = useCabinetPermissions()
  const toast = useToast()

  const [aiEnabled, setAiEnabled] = useState(true)
  const [aiToggling, setAiToggling] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile?.organization_id) return
    const abort = new AbortController()
    void (async () => {
      const { data } = await supabase
        .from('organizations')
        .select('ai_analysis_enabled')
        .eq('id', profile.organization_id)
        .abortSignal(abort.signal)
        .maybeSingle()
      if (abort.signal.aborted) return
      const o = data as { ai_analysis_enabled: boolean | null } | null
      setAiEnabled(o?.ai_analysis_enabled ?? true)
      setLoading(false)
    })()
    return () => abort.abort()
  }, [profile?.organization_id])

  const toggleAi = async (next: boolean): Promise<void> => {
    if (!canEditOrganization) return
    setAiToggling(true)
    const { data, error } = await supabase.functions.invoke('update-cabinet-settings', {
      body: { ai_analysis_enabled: next },
    })
    setAiToggling(false)
    if (error || data?.error) {
      const msg = await readInvokeError(error, data, 'Mise à jour impossible')
      toast.error(msg)
      return
    }
    setAiEnabled(next)
    toast.success(next ? 'Analyse IA activée' : 'Analyse IA désactivée pour ce cabinet')
  }

  if (loading || permLoading) return <LoadingSpinner />

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-start gap-2.5 rounded-lg bg-forest-50 border border-forest-100 px-3.5 py-2.5">
        <Sparkles size={14} className="mt-0.5 flex-shrink-0 text-gold-600" />
        <span className="text-[12.5px] text-forest-900">
          Les libellés des acteurs et étapes de revue (chef de mission, associé, rôles client…) se personnalisent
          désormais dans l&rsquo;onglet <b>Terminologie</b>.
        </span>
      </div>

      {/* Kill switch IA cabinet */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <header className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
          <Brain size={14} className="text-forest-700" />
          <span className="text-[13px] font-bold text-gray-900">Analyse IA des documents</span>
        </header>
        <div className="p-5 flex items-start gap-4">
          <div className="flex-1">
            <p className="text-[13px] text-gray-700 leading-relaxed">
              {aiEnabled
                ? <>L&rsquo;<b>analyse IA</b> est <b>activ&eacute;e</b> pour ce cabinet. Les documents fournis par les clients sont analys&eacute;s automatiquement (extraction de m&eacute;tadonn&eacute;es&nbsp;: version, signatures, couverture des contr&ocirc;les) et le questionnaire est pr&eacute;-rempli intelligemment.</>
                : <>L&rsquo;<b>analyse IA</b> est <b>d&eacute;sactiv&eacute;e</b>. Aucun document n&rsquo;est envoy&eacute; aux serveurs Anthropic. L&rsquo;extraction de m&eacute;tadonn&eacute;es et le pr&eacute;-remplissage du questionnaire sont indisponibles pour toutes les missions de ce cabinet.</>
              }
            </p>
            <p className="mt-2 text-[11.5px] text-gray-400">
              Utile en cas d&rsquo;exigence de confidentialit&eacute; cabinet ou client. Les documents restent stock&eacute;s sur Supabase, seul le pipeline IA est coup&eacute;.
            </p>
          </div>
          <label className="inline-flex items-center cursor-pointer flex-shrink-0">
            <input
              type="checkbox"
              checked={aiEnabled}
              onChange={(e) => toggleAi(e.target.checked)}
              disabled={!canEditOrganization || aiToggling}
              className="sr-only peer"
            />
            <div className="w-10 h-6 rounded-full bg-gray-300 peer-checked:bg-forest-700 transition-colors relative after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-5 after:h-5 after:bg-white after:rounded-full after:transition-transform peer-checked:after:translate-x-4 peer-disabled:opacity-50"></div>
            <span className="ml-2 text-[12px] font-semibold text-gray-700">{aiEnabled ? 'Activée' : 'Désactivée'}</span>
          </label>
        </div>
      </div>
    </div>
  )
}
