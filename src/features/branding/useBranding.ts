import { useContext } from 'react'
import { BrandingContext } from './BrandingContext'
import type { BrandingState } from './BrandingContext'

export function useBranding(): BrandingState {
  return useContext(BrandingContext)
}
