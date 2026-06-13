import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

/**
 * Garde-fou global : capture les erreurs de rendu React et affiche un repli
 * a la charte plutot qu'un ecran blanc. L'erreur est loggee en console
 * (jamais expose le detail technique a l'utilisateur).
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('ErrorBoundary:', error.message, info.componentStack)
  }

  private handleReload = (): void => {
    window.location.reload()
  }

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAF8] px-6">
        <div className="max-w-md text-center">
          <div className="w-14 h-14 rounded-2xl bg-forest-50 border border-forest-100 mx-auto mb-4 flex items-center justify-center">
            <span className="text-2xl text-forest-700">&#9888;</span>
          </div>
          <h1 className="text-lg font-bold text-gray-900 mb-1">Une erreur est survenue</h1>
          <p className="text-sm text-gray-500 leading-relaxed mb-5">
            L&rsquo;application a rencontr&eacute; un probl&egrave;me inattendu. Vous pouvez recharger la
            page&nbsp;; si cela persiste, signalez-le depuis le centre d&rsquo;aide.
          </p>
          <button
            onClick={this.handleReload}
            className="px-5 py-2.5 bg-forest-700 text-white rounded-lg text-sm font-semibold hover:bg-forest-900 transition-colors"
          >
            Recharger la page
          </button>
        </div>
      </div>
    )
  }
}
