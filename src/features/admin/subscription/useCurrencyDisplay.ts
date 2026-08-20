import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { formatMoney, type Currency } from '../../../lib/money'

const KEY = 'gestu.subscription.currency'

/**
 * Devise d'affichage de la console (RFC 0006). Base = FCFA ; préférence par
 * utilisateur (localStorage). Récupère le taux EUR↔USD via l'edge fx-rate
 * (cache 24 h serveur) ; repli sur 1.08 si indisponible.
 */
export function useCurrencyDisplay(): {
  currency: Currency
  setCurrency: (c: Currency) => void
  format: (xof: number) => string
} {
  const [currency, setCurrencyState] = useState<Currency>(() => {
    const s = typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null
    return s === 'EUR' || s === 'USD' || s === 'XOF' ? s : 'XOF'
  })
  const [eurUsd, setEurUsd] = useState(1.08)

  useEffect(() => {
    let active = true
    void (async () => {
      const { data, error } = await supabase.functions.invoke('fx-rate')
      if (!active || error) return
      const d = data as { eur_usd?: number }
      if (typeof d?.eur_usd === 'number' && d.eur_usd > 0) setEurUsd(d.eur_usd)
    })()
    return () => { active = false }
  }, [])

  const setCurrency = useCallback((c: Currency) => {
    setCurrencyState(c)
    try { localStorage.setItem(KEY, c) } catch { /* stockage indisponible */ }
  }, [])

  const format = useCallback((xof: number) => formatMoney(xof, currency, eurUsd), [currency, eurUsd])
  return { currency, setCurrency, format }
}
