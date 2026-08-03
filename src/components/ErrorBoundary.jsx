import { Component } from 'react';

// Catches any render/lifecycle error (including a failed lazy chunk load) so
// the app never dies to a blank screen — the player gets a recoverable screen
// with a Reload button instead.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[app] crashed', error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-dvh flex items-center justify-center px-4 scanlines">
        <div className="w-full max-w-sm bg-panel border-4 border-black p-6 text-center shadow-[8px_8px_0_rgba(0,0,0,0.7)]">
          <p className="font-pixel text-[12px] text-brand mb-3 blink">SYSTEM ERROR</p>
          <p className="font-crt text-fade text-lg mb-4 leading-tight">
            Something glitched off-screen. Hit reload to get back to campus.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="font-pixel text-[11px] uppercase bg-brand text-black border-2 border-black px-4 py-3 cursor-pointer tap"
          >
            ▸ RELOAD
          </button>
        </div>
      </div>
    );
  }
}
