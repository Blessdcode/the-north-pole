import { Component, type ReactNode } from 'react'

interface Props {
  fallback: (error: Error) => ReactNode
  children: ReactNode
}

/** Catches failures in the 3D world (e.g. lost GPU context) and shows a graceful fallback. */
export class ExperienceErrorBoundary extends Component<Props, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error) {
    console.error('[NorthPole] The 3D experience failed:', error)
  }

  render() {
    return this.state.error ? this.props.fallback(this.state.error) : this.props.children
  }
}
