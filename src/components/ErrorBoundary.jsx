import { Component } from 'react';

// Catches any render/lifecycle error (including a failed lazy chunk load) so
// the app never dies to a blank screen — the player gets a recoverable screen
// with a Reload button instead.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    this.setState({ info });
    console.error('[app] crashed', error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    const message =
      (this.state.error instanceof Error && this.state.error.message) ||
      String(this.state.error || '');

    return (
      <div className="min-h-dvh flex items-center justify-center px-4 scanlines">
        <div className="w-full max-w-sm bg-panel border-4 border-black p-6 text-center shadow-[8px_8px_0_rgba(0,0,0,0.7)]">
          <p className="font-pixel text-[12px] text-brand mb-3 blink">SYSTEM ERROR</p>
          <p className="font-crt text-fade text-lg mb-4 leading-tight">
            Something glitched off-screen. Try continuing — if it happens again, screenshot this
            screen so it can be fixed.
          </p>
          {message && (
            <p className="font-crt text-[13px] text-danger/90 mb-2 break-words leading-tight bg-black/40 border-2 border-line p-2">
              {message}
            </p>
          )}
          {this.state.info?.componentStack && (
            <p className="font-crt text-[11px] text-fade/80 mb-4 break-words leading-tight text-left bg-black/40 border-2 border-line p-2 max-h-40 overflow-auto">
              {this.state.info.componentStack}
            </p>
          )}
          <div className="flex flex-col gap-2">
            <button
              onClick={() => this.setState({ error: null, info: null })}
              className="font-pixel text-[11px] uppercase bg-brand text-black border-2 border-black px-4 py-3 cursor-pointer tap"
            >
              ▸ TRY TO CONTINUE
            </button>
            <button
              onClick={() => window.location.reload()}
              className="font-pixel text-[11px] uppercase bg-panel-2 text-cream border-2 border-line px-4 py-3 cursor-pointer tap"
            >
              ▸ RELOAD
            </button>
          </div>
        </div>
      </div>
    );
  }
}
