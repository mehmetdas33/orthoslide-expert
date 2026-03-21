import { useRef, useState, useCallback } from 'react'

export default function ExcelUpload({ onUpload, isLoading }) {
  const [isDragging, setIsDragging] = useState(false)
  const [fileName, setFileName] = useState('')
  const inputRef = useRef(null)

  const handleDrag = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDragIn = useCallback((e) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragOut = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files?.[0]) {
      const file = e.dataTransfer.files[0]
      setFileName(file.name)
      onUpload(file)
    }
  }, [onUpload])

  const handleClick = () => inputRef.current?.click()

  const handleFileChange = (e) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0]
      setFileName(file.name)
      onUpload(file)
    }
  }

  return (
    <div className="glass-card p-5 animate-slide-up">
      <div className="section-title">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
        Sefalometrik Veri (Excel)
      </div>

      <div
        id="excel-dropzone"
        className={`drop-zone flex items-center gap-4 p-5 ${isDragging ? 'active' : ''} ${fileName ? 'has-image' : ''}`}
        onDragEnter={handleDragIn}
        onDragLeave={handleDragOut}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={handleFileChange}
        />

        {isLoading ? (
          <div className="flex items-center gap-3 w-full justify-center py-2">
            <svg className="w-6 h-6 spinner text-ortho-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" opacity="0.2" />
              <path d="M12 2a10 10 0 0 1 10 10" />
            </svg>
            <span className="text-sm text-ortho-400 font-medium">Dosya ayrıştırılıyor...</span>
          </div>
        ) : fileName ? (
          <>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-emerald-400 truncate">{fileName}</p>
              <p className="text-xs text-dark-400 mt-0.5">Dosya başarıyla yüklendi · Değiştirmek için tıklayın</p>
            </div>
          </>
        ) : (
          <>
            <div className="w-12 h-12 rounded-xl bg-ortho-500/10 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-ortho-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-dark-200">Excel dosyasını sürükleyin veya tıklayın</p>
              <p className="text-xs text-dark-500 mt-0.5">.xlsx formatında sefalometrik ölçüm verisi</p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
