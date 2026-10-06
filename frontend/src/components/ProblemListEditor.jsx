import { useRef, useEffect } from 'react'

/**
 * Diagnosis & Problem List düzenleyici (Slayt 19).
 * Excel'den otomatik doldurulur; kullanıcı maddeleri düzenleyebilir, ekleyip silebilir,
 * sıralayabilir. Slaytta da tek bir madde listesi olarak çıkar → PowerPoint'te düzenlenebilir.
 */
export default function ProblemListEditor({ items, edited, onChange, onReset }) {
  const inputRefs = useRef([])
  const focusIdx  = useRef(null)

  useEffect(() => {
    if (focusIdx.current !== null) {
      inputRefs.current[focusIdx.current]?.focus()
      focusIdx.current = null
    }
  })

  const update = (i, val) => onChange(items.map((t, j) => (j === i ? val : t)))
  const remove = (i) => onChange(items.filter((_, j) => j !== i))
  const insertAfter = (i) => {
    const n = [...items]
    n.splice(i + 1, 0, '')
    focusIdx.current = i + 1
    onChange(n)
  }
  const move = (i, d) => {
    const j = i + d
    if (j < 0 || j >= items.length) return
    const n = [...items]
    ;[n[i], n[j]] = [n[j], n[i]]
    onChange(n)
  }

  const handleKeyDown = (i) => (e) => {
    if (e.key === 'Enter') { e.preventDefault(); insertAfter(i) }
    else if (e.key === 'Backspace' && items[i] === '' && items.length > 1) {
      e.preventDefault()
      focusIdx.current = Math.max(0, i - 1)
      remove(i)
    }
  }

  const iconBtn = 'w-6 h-6 rounded flex items-center justify-center text-[11px] text-dark-400 hover:text-white hover:bg-white/10 disabled:opacity-25 disabled:hover:bg-transparent'

  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <svg className="w-4 h-4 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
          <circle cx="3.5" cy="6" r="1"/><circle cx="3.5" cy="12" r="1"/><circle cx="3.5" cy="18" r="1"/>
        </svg>
        <span className="text-xs font-semibold text-dark-300">Diagnosis &amp; Problem List</span>
        <span className="text-[10px] text-dark-500 ml-1">
          — Slayt 19 · {edited ? 'elle düzenlendi' : 'otomatik (Excel + molar sınıfı)'}
        </span>
        {edited && (
          <button onClick={onReset}
            className="ml-auto text-[10px] text-cyan-300/80 hover:text-cyan-300 border border-cyan-400/20 hover:border-cyan-400/50 rounded px-2 py-0.5">
            Otomatiğe sıfırla
          </button>
        )}
      </div>

      <div className="space-y-1.5">
        {items.map((text, i) => (
          <div key={i} className="flex items-center gap-2 group">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#0BD0D9' }} />
            <input
              ref={el => { inputRefs.current[i] = el }}
              value={text}
              onChange={(e) => update(i, e.target.value)}
              onKeyDown={handleKeyDown(i)}
              placeholder="Yeni madde…"
              className="flex-1 bg-white/5 border border-white/10 focus:border-cyan-400/50 rounded-md px-2.5 py-1.5 text-[13px] text-white/90 outline-none"
            />
            <div className="flex gap-0.5 opacity-40 group-hover:opacity-100 transition-opacity">
              <button className={iconBtn} onClick={() => move(i, -1)} disabled={i === 0} title="Yukarı taşı">↑</button>
              <button className={iconBtn} onClick={() => move(i, 1)} disabled={i === items.length - 1} title="Aşağı taşı">↓</button>
              <button className={iconBtn + ' hover:!text-red-400'} onClick={() => remove(i)} title="Sil">✕</button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 mt-3">
        <button onClick={() => insertAfter(items.length - 1)}
          className="text-[11px] text-cyan-300/80 hover:text-cyan-300 border border-dashed border-cyan-400/30 hover:border-cyan-400/60 rounded-md px-3 py-1">
          + Madde ekle
        </button>
        <span className="text-[10px] text-dark-600">Enter: yeni madde · Slaytta da madde listesi olarak düzenlenebilir</span>
      </div>
    </div>
  )
}
