import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }
  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 16,
          background: '#0b0b14', padding: 24,
        }}>
          <div style={{ color: '#ef4444', fontSize: 15, fontWeight: 700 }}>Bir hata oluştu</div>
          <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, maxWidth: 480, textAlign: 'center', fontFamily: 'monospace', background: 'rgba(255,255,255,0.04)', padding: '10px 16px', borderRadius: 8 }}>
            {this.state.error?.message || 'Bilinmeyen hata'}
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{ padding: '9px 24px', borderRadius: 8, background: '#2563eb', color: 'white', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
          >
            Yeniden Dene
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
