import { useRef, useState, useCallback } from 'react'
import axios from 'axios'

const API_BASE = (import.meta.env.VITE_API_URL || '') + '/api'

export default function XlsConverter({ onUpload }) {
  const [isDragging, setIsDragging]   = useState(false)
  const [status, setStatus]           = useState(null) // null | 'loading' | 'done' | 'error'
  const [message, setMessage]         = useState('')
  const inputRef                      = useRef(null)

  const convert = useCallback(async (file) => {
    if (!file) return
    if (!file.name.match(/\.xlsx?$/i)) {
      setStatus('error')
      setMessage('Sadece .xls veya .xlsx dosyası seçin')
      return
    }

    setStatus('loading')
    setMessage(file.name)

    const fd = new FormData()
    fd.append('file', file)

    try {
      const res = await axios.post(`${API_BASE}/convert-xls`, fd, { responseType: 'blob' })

      // Sunucu hata döndürdüyse (JSON blob içinde) oku
      const contentType = res.headers['content-type'] || ''
      if (contentType.includes('application/json')) {
        const text = await res.data.text()
        const json = JSON.parse(text)
        throw new Error(json.error || 'Sunucu hatası')
      }

      const outName = file.name.replace(/\.xls$/i, '') + '.xlsx'
      const xlsxFile = new File([res.data], outName, {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })

      setStatus('done')
      setMessage(`${outName} yüklendi, işleniyor…`)

      // Direkt sisteme yükle — indirme yok
      if (onUpload) onUpload(xlsxFile)
    } catch (err) {
      // Axios hata yanıtı blob olarak geliyor; içeriğini oku
      let msg = err.message
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text()
          const json = JSON.parse(text)
          msg = json.error || msg
        } catch (_) { /* ignore */ }
      }
      setStatus('error')
      setMessage(msg)
    }
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) convert(file)
  }, [convert])

  const handleChange = (e) => {
    const file = e.target.files?.[0]
    if (file) convert(file)
    e.target.value = ''
  }

  return (
    <div className="glass-card p-4 animate-slide-up">
      <div className="section-title mb-3">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 3v12M7 8l5-5 5 5"/>
          <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/>
        </svg>
        XLS → XLSX Dönüştürücü
      </div>

      <div
        className={`drop-zone flex items-center gap-3 px-4 py-3 cursor-pointer
          ${isDragging ? 'active' : ''}
          ${status === 'done' ? 'has-image' : ''}`}
        onDragEnter={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={(e) => { e.preventDefault(); setIsDragging(false) }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xls,.xlsx"
          className="hidden"
          onChange={handleChange}
        />

        {status === 'loading' ? (
          <>
            <svg className="w-5 h-5 spinner text-ortho-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" opacity="0.2"/>
              <path d="M12 2a10 10 0 0 1 10 10"/>
            </svg>
            <span className="text-sm text-dark-300 truncate">{message} dönüştürülüyor…</span>
          </>
        ) : status === 'done' ? (
          <>
            <svg className="w-5 h-5 text-emerald-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            <span className="text-sm text-emerald-400 truncate">{message}</span>
            <span className="text-xs text-dark-500 ml-auto flex-shrink-0">Tekrar için tıklayın</span>
          </>
        ) : status === 'error' ? (
          <>
            <svg className="w-5 h-5 text-red-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span className="text-sm text-red-400 truncate">{message}</span>
            <span className="text-xs text-dark-500 ml-auto flex-shrink-0">Tekrar deneyin</span>
          </>
        ) : (
          <>
            <svg className="w-5 h-5 text-ortho-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="12" y1="18" x2="12" y2="12"/>
              <line x1="9" y1="15" x2="12" y2="12"/>
              <line x1="15" y1="15" x2="12" y2="12"/>
            </svg>
            <div>
              <p className="text-sm font-medium text-dark-200">.xls dosyası sürükleyin veya tıklayın</p>
              <p className="text-xs text-dark-500 mt-0.5">Otomatik olarak .xlsx formatına dönüştürülür ve indirilir</p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
