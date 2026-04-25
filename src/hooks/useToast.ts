import { toast as sonner } from 'sonner'

type ToastOpts = {
  description?: string
  duration?: number
  action?: { label: string; onClick: () => void }
}

type PromiseMessages<T> = {
  loading: string
  success: string | ((data: T) => string)
  error: string
}

/**
 * Gestu toast wrapper.
 *
 * Imposes the platform's UX rules on top of sonner:
 * - Error messages shown to the user are always generic — the technical
 *   detail (Supabase error, stack, etc.) is logged to console only. This
 *   prevents leaking internal schema info (CLAUDE.md §3).
 * - Default durations follow BRAND.md toast spec.
 */
export function useToast() {
  return {
    success: (title: string, opts?: ToastOpts) =>
      sonner.success(title, { duration: 4000, ...opts }),

    error: (title: string, err?: unknown) => {
      if (err !== undefined) {
        console.error('[toast]', err)
      }
      sonner.error(title, { duration: 6000 })
    },

    info: (title: string, opts?: ToastOpts) =>
      sonner.info(title, { duration: 4000, ...opts }),

    warn: (title: string, opts?: ToastOpts) =>
      sonner.warning(title, { duration: 5000, ...opts }),

    promise: <T>(p: Promise<T>, m: PromiseMessages<T>) =>
      sonner.promise(p, m),

    dismiss: (id?: string | number) => sonner.dismiss(id),
  }
}
