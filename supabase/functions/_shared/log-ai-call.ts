// Helper pour logguer les appels Anthropic dans ai_calls_log.
// Sécurité : un échec d'écriture ne casse JAMAIS la réponse principale.
//
// Prix Anthropic (USD per 1M tokens) au 2026-04-26 — mettre à jour ici
// si Anthropic ajuste ses tarifs. Sources tarifaires officielles.

interface ModelPrice { input_per_million_usd: number; output_per_million_usd: number }

const PRICING: Record<string, ModelPrice> = {
  // Sonnet 4 / 4.5 — tarifs Sonnet
  'claude-sonnet-4-20250514': { input_per_million_usd: 3, output_per_million_usd: 15 },
  'claude-sonnet-4-5': { input_per_million_usd: 3, output_per_million_usd: 15 },
  'claude-sonnet-4-6': { input_per_million_usd: 3, output_per_million_usd: 15 },
  // Haiku 4.5 — tarifs Haiku
  'claude-haiku-4-5-20251001': { input_per_million_usd: 1, output_per_million_usd: 5 },
  // Opus 4 — tarifs Opus
  'claude-opus-4': { input_per_million_usd: 15, output_per_million_usd: 75 },
  'claude-opus-4-7': { input_per_million_usd: 15, output_per_million_usd: 75 },
}

const FALLBACK_PRICE: ModelPrice = { input_per_million_usd: 3, output_per_million_usd: 15 }

export interface LogAiCallParams {
  function_name: string
  model: string | null
  input_tokens: number | null
  output_tokens: number | null
  success: boolean
  error_message?: string | null
  organization_id?: string | null
  mission_id?: string | null
  user_id?: string | null
  duration_ms: number
  // deno-lint-ignore no-explicit-any
  admin: any  // ReturnType<typeof createClient> with service-role
}

export function estimateCostUsd(model: string | null, inputTokens: number | null, outputTokens: number | null): number {
  const price = (model ? PRICING[model] : null) ?? FALLBACK_PRICE
  const inputCost = ((inputTokens ?? 0) / 1_000_000) * price.input_per_million_usd
  const outputCost = ((outputTokens ?? 0) / 1_000_000) * price.output_per_million_usd
  return Math.round((inputCost + outputCost) * 1_000_000) / 1_000_000
}

export async function logAiCall(params: LogAiCallParams): Promise<void> {
  try {
    const cost = estimateCostUsd(params.model, params.input_tokens, params.output_tokens)
    const truncated = params.error_message?.slice(0, 500) ?? null

    // deno-lint-ignore no-explicit-any
    const { error } = await (params.admin.from('ai_calls_log') as any).insert({
      function_name: params.function_name,
      model: params.model,
      input_tokens: params.input_tokens,
      output_tokens: params.output_tokens,
      cost_estimate_usd: cost,
      success: params.success,
      error_message: truncated,
      organization_id: params.organization_id ?? null,
      mission_id: params.mission_id ?? null,
      user_id: params.user_id ?? null,
      duration_ms: params.duration_ms,
    })

    if (error) {
      console.error('[log-ai-call] insert failed (non-blocking):', error.message)
    }
  } catch (err) {
    // Ne JAMAIS interrompre le flux principal
    const message = err instanceof Error ? err.message : 'unknown'
    console.error('[log-ai-call] threw (non-blocking):', message)
  }
}
