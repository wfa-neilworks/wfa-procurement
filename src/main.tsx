import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { missingEnvVars } from './lib/supabase.ts'

if (missingEnvVars) {
  document.getElementById('root')!.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:sans-serif;background:#f8fafc;">
      <div style="text-align:center;padding:2rem;border:1px solid #e2e8f0;border-radius:12px;background:white;max-width:420px;">
        <h1 style="color:#28363D;font-size:1.25rem;font-weight:700;margin-bottom:0.5rem;">Configuration Error</h1>
        <p style="color:#64748b;font-size:0.9rem;">Supabase environment variables are missing.<br/>Please set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> in your deployment settings.</p>
      </div>
    </div>
  `
} else {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
