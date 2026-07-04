import { StrictMode, Component } from 'react'
import type { ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { missingEnvVars } from './lib/supabase.ts'

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  render() {
    if (this.state.error) {
      const err = this.state.error as Error
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', background: '#f8fafc' }}>
          <div style={{ textAlign: 'center', padding: '2rem', border: '1px solid #e2e8f0', borderRadius: '12px', background: 'white', maxWidth: '480px' }}>
            <h1 style={{ color: '#dc2626', fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Application Error</h1>
            <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '1rem' }}>Something went wrong loading the app.</p>
            <pre style={{ background: '#f1f5f9', padding: '1rem', borderRadius: '8px', fontSize: '0.75rem', textAlign: 'left', overflowX: 'auto', color: '#334155' }}>
              {err.message}
            </pre>
            <button onClick={() => window.location.reload()} style={{ marginTop: '1rem', padding: '0.5rem 1.5rem', background: '#28363D', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.875rem' }}>
              Reload
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

if (missingEnvVars) {
  document.getElementById('root')!.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:sans-serif;background:#f8fafc;">
      <div style="text-align:center;padding:2rem;border:1px solid #e2e8f0;border-radius:12px;background:white;max-width:420px;">
        <h1 style="color:#28363D;font-size:1.25rem;font-weight:700;margin-bottom:0.5rem;">Configuration Error</h1>
        <p style="color:#64748b;font-size:0.9rem;">Supabase environment variables are missing.<br/>Please set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> in your Vercel environment variables.</p>
      </div>
    </div>
  `
} else {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  )
}
