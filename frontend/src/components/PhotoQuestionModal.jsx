import { useRef, useState, useEffect, useCallback } from 'react'

const MM_OPTIONS = ['0', '0.5', '1', '1.5', '2', '2.5', '3', '3.5', '4', '4.5', '5']
const MAG_SIZE   = 140
const MAG_ZOOM   = 4

// FDI tooth layout (left → right on screen)
const UPPER_TEETH = [18,17,16,15,14,13,12,11, 21,22,23,24,25,26,27,28]
const LOWER_TEETH = [48,47,46,45,44,43,42,41, 31,32,33,34,35,36,37,38]

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  card:       '#161b27',
  cardBorder: 'rgba(255,255,255,0.07)',
  sectionBg:  'rgba(59,130,246,0.08)',
  sectionBdr: 'rgba(59,130,246,0.2)',
  active:     'linear-gradient(135deg,#2563EB,#1d4ed8)',
  activeShadow: '0 3px 10px rgba(37,99,235,0.45)',
  inactive:   'rgba(255,255,255,0.06)',
  inactiveBdr:'rgba(255,255,255,0.1)',
  text:       'rgba(255,255,255,0.85)',
  muted:      'rgba(255,255,255,0.35)',
  label:      'rgba(255,255,255,0.5)',
  accent:     '#60A5FA',
  green:      '#4ADE80',
}

const optBtn = (active) => ({
  padding: '8px 20px', borderRadius: 9, fontSize: 13, fontWeight: 700,
  cursor: 'pointer', border: active ? 'none' : `1px solid ${C.inactiveBdr}`,
  background: active ? C.active : C.inactive,
  color: active ? 'white' : C.muted,
  boxShadow: active ? C.activeShadow : 'none',
  transform: active ? 'translateY(-1px)' : 'none',
  transition: 'all 0.15s',
})

const mmBtn = (active) => ({
  padding: '5px 10px', borderRadius: 7, fontSize: 12, fontWeight: 600,
  cursor: 'pointer', border: active ? 'none' : `1px solid ${C.inactiveBdr}`,
  background: active ? C.active : C.inactive,
  color: active ? 'white' : C.muted,
  transition: 'all 0.12s',
  minWidth: 38, textAlign: 'center',
})

const inputStyle = {
  background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.inactiveBdr}`,
  borderRadius: 8, color: C.text, fontSize: 14, padding: '9px 12px',
  outline: 'none', width: '100%', boxSizing: 'border-box',
}

// ── Teeth helpers ──────────────────────────────────────────────────────────────
function formatTeeth(teeth, format) {
  if (!teeth || teeth.length === 0) {
    return format === 'missing' ? 'All teeth are present' : ''
  }
  const sorted = [...teeth].sort((a, b) => a - b)
  const tStr   = sorted.join(', ')
  const single = sorted.length === 1
  switch (format) {
    case 'missing':     return `${tStr} ${single ? 'is' : 'are'} missing`
    case 'rct':         return `${tStr} ${single ? 'has' : 'have'} RCT`
    case 'crown':       return `${tStr} ${single ? 'has' : 'have'} crown/bridge`
    case 'restoration': return `${tStr} ${single ? 'has' : 'have'} restoration`
    case 'impacted':    return `${tStr} ${single ? 'is' : 'are'} impacted`
    default:            return tStr
  }
}

// ── Teeth picker ──────────────────────────────────────────────────────────────
function TeethPicker({ selected, onChange }) {
  const toggle = (n) =>
    onChange(selected.includes(n) ? selected.filter(x => x !== n) : [...selected, n])

  const toothBtn = (n) => {
    const active = selected.includes(n)
    return (
      <button key={n} onClick={() => toggle(n)} style={{
        width: 34, height: 32, borderRadius: 5, fontSize: 10, fontWeight: 700,
        cursor: 'pointer', border: active ? 'none' : `1px solid ${C.inactiveBdr}`,
        background: active ? C.active : C.inactive,
        color: active ? 'white' : C.muted,
        transition: 'all 0.12s', flexShrink: 0, padding: 0,
      }}>{n}</button>
    )
  }

  const midSep = { width: 1, background: 'rgba(255,255,255,0.2)', margin: '0 3px', flexShrink: 0 }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, overflowX: 'auto' }}>
      <div style={{ display: 'flex', gap: 2, alignItems: 'stretch', minWidth: 'max-content' }}>
        {UPPER_TEETH.slice(0, 8).map(toothBtn)}
        <div style={midSep} />
        {UPPER_TEETH.slice(8).map(toothBtn)}
      </div>
      <div style={{ display: 'flex', gap: 2, alignItems: 'stretch', minWidth: 'max-content' }}>
        {LOWER_TEETH.slice(0, 8).map(toothBtn)}
        <div style={midSep} />
        {LOWER_TEETH.slice(8).map(toothBtn)}
      </div>
    </div>
  )
}

function TeethQuestion({ q, teethSelections, setTeethSelection }) {
  const selected = teethSelections[q.placeholder] || []
  const preview  = formatTeeth(selected, q.format)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: C.label }}>
          {q.label}
        </span>
        {q.optional && <span style={{ fontSize: 10, color: C.muted }}>(isteğe bağlı)</span>}
        {selected.length > 0 && <span style={{ fontSize: 10, color: C.green, fontWeight: 700 }}>✓ {selected.length} diş</span>}
      </div>
      <TeethPicker selected={selected} onChange={(next) => setTeethSelection(q.placeholder, next)} />
      {preview && (
        <p style={{ margin: 0, color: C.accent, fontSize: 11, fontStyle: 'italic', paddingLeft: 2 }}>→ {preview}</p>
      )}
    </div>
  )
}

// ── Midline question ──────────────────────────────────────────────────────────
function MidlineQuestion({ q, midlineStates, setMidlineStates }) {
  const state = midlineStates[q.placeholder] || {}
  const mm    = state.mm
  const dir   = state.dir

  const setMm = (val) => setMidlineStates(prev => ({
    ...prev,
    [q.placeholder]: { mm: val, dir: val === '0' ? null : prev[q.placeholder]?.dir },
  }))
  const setDir = (val) => setMidlineStates(prev => ({
    ...prev,
    [q.placeholder]: { ...prev[q.placeholder], dir: val },
  }))

  let preview = ''
  if (mm === '0') preview = `${q.prefix} midline is on with the face`
  else if (mm && dir) preview = `${q.prefix} midline is shifted ${mm} mm to ${dir}`
  const answered = mm === '0' || (mm && dir)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: C.label }}>
          {q.label}
        </span>
        {answered && <span style={{ fontSize: 10, color: C.green, fontWeight: 700 }}>✓</span>}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
        {MM_OPTIONS.map(v => (
          <button key={v} onClick={() => setMm(v)} style={mmBtn(mm === v)}>{v}</button>
        ))}
      </div>
      {mm && mm !== '0' && (
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setDir('right')} style={optBtn(dir === 'right')}>← Sağ</button>
          <button onClick={() => setDir('left')}  style={optBtn(dir === 'left')}>Sol →</button>
        </div>
      )}
      {preview && (
        <p style={{ margin: 0, color: C.accent, fontSize: 11, fontStyle: 'italic', paddingLeft: 2 }}>{preview}</p>
      )}
    </div>
  )
}

// ── Number group ──────────────────────────────────────────────────────────────
function NumberGroup({ items, answers, setAnswer }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(items.length, 3)}, 1fr)`, gap: 10 }}>
      {items.map(q => (
        <div key={q.placeholder} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: C.label }}>
            {q.label}
          </span>
          <input type="text" inputMode="text"
            value={answers[q.placeholder] || ''}
            onChange={e => setAnswer(q.placeholder, e.target.value)}
            placeholder="—" style={inputStyle}
          />
        </div>
      ))}
    </div>
  )
}

// ── Bolton question ────────────────────────────────────────────────────────────
// ph126 = 6-tooth Maksilla value, ph127 = 12-tooth Maksilla value
// ph128 = 6-tooth Mandibula value, ph129 = 12-tooth Mandibula value
function BoltonSection({ title, mPh, dPh, answers, setAnswer }) {
  const mVal = answers[mPh] || ''
  const dVal = answers[dPh] || ''

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.inactiveBdr}`,
      borderRadius: 10, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: C.accent }}>
        {title}
      </span>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 160 }}>
          <span style={{ fontSize: 11, color: C.label, whiteSpace: 'nowrap', minWidth: 70 }}>Maksilla:</span>
          <input type="text"
            value={mVal}
            onChange={e => setAnswer(mPh, e.target.value)}
            placeholder="değer…"
            style={{ ...inputStyle, maxWidth: 120 }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 160 }}>
          <span style={{ fontSize: 11, color: C.label, whiteSpace: 'nowrap', minWidth: 70 }}>Mandibula:</span>
          <input type="text"
            value={dVal}
            onChange={e => setAnswer(dPh, e.target.value)}
            placeholder="değer…"
            style={{ ...inputStyle, maxWidth: 120 }}
          />
        </div>
      </div>
    </div>
  )
}

function BoltonQuestion({ answers, setAnswer }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: C.label }}>
          Bolton Analizi
        </span>
        <span style={{ fontSize: 10, color: C.muted }}>(isteğe bağlı)</span>
      </div>
      <BoltonSection title="6 Diş"  mPh="ph126" dPh="ph128" answers={answers} setAnswer={setAnswer} />
      <BoltonSection title="12 Diş" mPh="ph127" dPh="ph129" answers={answers} setAnswer={setAnswer} />
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function PhotoQuestionModal({ file, questions, onConfirm, onCancel, showMidlineMark, referenceImage, referenceLabel, refMidlineX }) {
  const imgRef    = useRef(null)
  const refImgRef = useRef(null)
  const magRef    = useRef(null)
  const [imgSrc, setImgSrc]               = useState(null)
  const [refSrc, setRefSrc]               = useState(null)
  const [dispW, setDispW]                 = useState(0)
  const [dispH, setDispH]                 = useState(0)
  const [simpleAnswers, setSimpleAnswers] = useState({})
  const [midlineStates, setMidlineStates] = useState({})
  const [teethSelections, setTeethSelections] = useState({})
  const [mousePos, setMousePos]           = useState(null)  // { cx, cy, clientX, clientY, src:'main'|'ref' }
  const [midlineX, setMidlineX]           = useState(null)  // null = not set, number = fraction 0-1

  // Load main image
  useEffect(() => {
    let cancelled = false
    const reader = new FileReader()
    reader.onload = (e) => { if (!cancelled) setImgSrc(e.target.result) }
    reader.readAsDataURL(file)
    return () => { cancelled = true }
  }, [file])

  // Load reference image (frontal_smile for intraoral_frontal)
  useEffect(() => {
    if (!referenceImage) { setRefSrc(null); return }
    let cancelled = false
    const reader = new FileReader()
    reader.onload = (e) => { if (!cancelled) setRefSrc(e.target.result) }
    reader.readAsDataURL(referenceImage)
    return () => { cancelled = true }
  }, [referenceImage])

  const handleLoad = (e) => {
    const img  = e.currentTarget
    const nonHdr = questions.filter(q => q.type !== 'header').length
    const maxH = window.innerHeight * (nonHdr > 5 ? 0.28 : 0.42)
    const maxW = Math.min(window.innerWidth * (refSrc ? 0.44 : 0.68), 520)
    const s    = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight, 1)
    setDispW(Math.round(img.naturalWidth  * s))
    setDispH(Math.round(img.naturalHeight * s))
  }

  // Magnifier
  useEffect(() => {
    const magCanvas = magRef.current
    if (!magCanvas || !mousePos) return
    const isRef = mousePos.src === 'ref'
    const img   = isRef ? refImgRef.current : imgRef.current
    if (!img) return
    const rect  = img.getBoundingClientRect()
    const dW    = rect.width, dH = rect.height
    if (!dW || !dH) return
    const sX = img.naturalWidth  / dW
    const sY = img.naturalHeight / dH
    magCanvas.width  = MAG_SIZE
    magCanvas.height = MAG_SIZE
    const ctx = magCanvas.getContext('2d')
    const srcW = (MAG_SIZE / MAG_ZOOM) * sX
    const srcH = (MAG_SIZE / MAG_ZOOM) * sY
    const srcX = Math.max(0, Math.min(mousePos.cx * sX - srcW / 2, img.naturalWidth  - srcW))
    const srcY = Math.max(0, Math.min(mousePos.cy * sY - srcH / 2, img.naturalHeight - srcH))
    /* dW, dH used above only for guard — sX/sY carry the scale */
    ctx.save()
    ctx.beginPath()
    ctx.arc(MAG_SIZE / 2, MAG_SIZE / 2, MAG_SIZE / 2, 0, Math.PI * 2)
    ctx.clip()
    ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, MAG_SIZE, MAG_SIZE)
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'
    ctx.lineWidth = 0.8
    ctx.beginPath()
    ctx.moveTo(MAG_SIZE / 2, MAG_SIZE / 2 - 8); ctx.lineTo(MAG_SIZE / 2, MAG_SIZE / 2 + 8)
    ctx.moveTo(MAG_SIZE / 2 - 8, MAG_SIZE / 2); ctx.lineTo(MAG_SIZE / 2 + 8, MAG_SIZE / 2)
    ctx.stroke()
    ctx.restore()
    ctx.beginPath()
    ctx.arc(MAG_SIZE / 2, MAG_SIZE / 2, MAG_SIZE / 2 - 1, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(96,165,250,0.6)'
    ctx.lineWidth = 2
    ctx.stroke()
  }, [mousePos])

  const makeMouseMove = useCallback((src) => (e) => {
    const img = src === 'ref' ? refImgRef.current : imgRef.current
    if (!img) return
    const rect = img.getBoundingClientRect()
    setMousePos({ cx: e.clientX - rect.left, cy: e.clientY - rect.top, clientX: e.clientX, clientY: e.clientY, src })
  }, [])

  const handleMouseLeave = useCallback(() => setMousePos(null), [])

  const handleRotate = useCallback(() => {
    const img = imgRef.current
    if (!img) return
    const rc = document.createElement('canvas')
    rc.width  = img.naturalHeight
    rc.height = img.naturalWidth
    const rctx = rc.getContext('2d')
    rctx.translate(rc.width / 2, rc.height / 2)
    rctx.rotate(Math.PI / 2)
    rctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2)
    setImgSrc(rc.toDataURL('image/jpeg', 0.95))
    setDispW(0); setDispH(0)
    setMousePos(null)
  }, [])

  const setAnswer = (ph, val) => setSimpleAnswers(prev => ({ ...prev, [ph]: val }))
  const setTeethSelection = (ph, teeth) => setTeethSelections(prev => ({ ...prev, [ph]: teeth }))

  const confirmWithBurn = useCallback((answers) => {
    // Compute loaded inline — avoids any const TDZ risk in dep array
    if (showMidlineMark && midlineX !== null && imgRef.current && dispW > 0 && dispH > 0) {
      const img = imgRef.current
      const natW = img.naturalWidth, natH = img.naturalHeight
      const fc = document.createElement('canvas')
      fc.width = natW; fc.height = natH
      const ctx = fc.getContext('2d')
      ctx.drawImage(img, 0, 0, natW, natH)
      ctx.beginPath()
      ctx.moveTo(midlineX * natW, 0)
      ctx.lineTo(midlineX * natW, natH)
      ctx.strokeStyle = '#3B82F6'
      ctx.lineWidth = Math.max(1.5, natW / dispW * 1.5)
      ctx.stroke()
      fc.toBlob(blob => {
        const burnedFile = new File([blob], file.name.replace(/\.[^.]+$/, '') + '_midline.jpg', { type: 'image/jpeg' })
        onConfirm(answers, burnedFile)
      }, 'image/jpeg', 0.95)
    } else {
      onConfirm(answers, null)
    }
  }, [showMidlineMark, midlineX, imgRef, dispW, dispH, file, onConfirm])

  // `loaded` only used in JSX — defined AFTER all useCallback calls (no TDZ risk)
  const loaded = dispW > 0 && dispH > 0

  const buildAllAnswers = () => {
    const all = { ...simpleAnswers }
    questions.filter(q => q.type === 'midline').forEach(q => {
      const st = midlineStates[q.placeholder] || {}
      if (st.mm === '0')        all[q.placeholder] = `${q.prefix} midline is on with the face`
      else if (st.mm && st.dir) all[q.placeholder] = `${q.prefix} midline is shifted ${st.mm} mm to ${st.dir}`
    })
    questions.filter(q => q.type === 'teeth').forEach(q => {
      const text = formatTeeth(teethSelections[q.placeholder] || [], q.format)
      if (text) all[q.placeholder] = text
    })
    return all
  }

  const isAnswered = (q) => {
    if (q.type === 'header' || q.optional) return true
    if (q.type === 'midline') {
      const st = midlineStates[q.placeholder] || {}
      return st.mm === '0' || (!!st.mm && !!st.dir)
    }
    if (q.type === 'teeth') return true  // empty = "All teeth are present" is valid
    return String(simpleAnswers[q.placeholder] || '').trim() !== ''
  }

  const allDone = questions.every(isAnswered)
  const total   = questions.filter(q => q.type !== 'header' && !q.optional).length
  const done    = questions.filter(q => q.type !== 'header' && !q.optional && isAnswered(q)).length
  const pct     = total ? Math.round((done / total) * 100) : 100

  const magLeft = mousePos ? mousePos.clientX + 18 : 0
  const magTop  = mousePos ? mousePos.clientY - MAG_SIZE - 12 : 0

  const renderQuestions = () => {
    const out = []
    let i = 0
    while (i < questions.length) {
      const q = questions[i]
      if (q.type === 'header') {
        out.push(
          <div key={`hdr-${i}`} style={{ background: C.sectionBg, border: `1px solid ${C.sectionBdr}`, borderRadius: 8, padding: '7px 14px' }}>
            <p style={{ margin: 0, color: C.accent, fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase' }}>{q.label}</p>
          </div>
        )
        i++
      } else if (q.type === 'number') {
        const group = []
        while (i < questions.length && questions[i].type === 'number' && group.length < 3) group.push(questions[i++])
        out.push(<NumberGroup key={`ng-${i}`} items={group} answers={simpleAnswers} setAnswer={setAnswer} />)
      } else if (q.type === 'midline') {
        out.push(<MidlineQuestion key={q.placeholder} q={q} midlineStates={midlineStates} setMidlineStates={setMidlineStates} />)
        i++
      } else if (q.type === 'bolton') {
        out.push(<BoltonQuestion key="bolton" answers={simpleAnswers} setAnswer={setAnswer} />)
        i++
      } else if (q.type === 'teeth') {
        out.push(<TeethQuestion key={q.placeholder} q={q} teethSelections={teethSelections} setTeethSelection={setTeethSelection} />)
        i++
      } else if (q.type === 'buttons') {
        const answered = !!simpleAnswers[q.placeholder]
        out.push(
          <div key={q.placeholder} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: C.label }}>{q.label}</span>
              {answered && <span style={{ fontSize: 10, color: C.green, fontWeight: 700 }}>✓</span>}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {q.options.map(opt => (
                <button key={opt}
                  onClick={() => setAnswer(q.placeholder, simpleAnswers[q.placeholder] === opt ? '' : opt)}
                  style={optBtn(simpleAnswers[q.placeholder] === opt)}>{opt}</button>
              ))}
            </div>
          </div>
        )
        i++
      } else if (q.type === 'text') {
        out.push(
          <div key={q.placeholder} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: C.label }}>{q.label}</span>
            <input type="text" value={simpleAnswers[q.placeholder] || ''}
              onChange={e => setAnswer(q.placeholder, e.target.value)}
              placeholder="değer girin…" style={inputStyle} />
          </div>
        )
        i++
      } else {
        i++
      }
    }
    return out
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(4px)',
      padding: '16px', overflowY: 'auto',
    }}>
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 14, maxWidth: 720, width: '100%', margin: 'auto', paddingBottom: 20,
      }}>

        {/* Image area — reference + main side by side */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', justifyContent: 'center', width: '100%' }}>

          {/* Reference image */}
          {refSrc && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 9, color: C.muted, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                {referenceLabel || 'Referans'}
              </span>
              <div style={{
                borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)',
                background: '#0d0d0d', width: loaded ? dispW : 200, height: loaded ? dispH : 200,
                cursor: 'crosshair', position: 'relative',
              }}
                onMouseMove={(e) => makeMouseMove('ref')(e)}
                onMouseLeave={handleMouseLeave}
              >
                <img ref={refImgRef} src={refSrc} alt="referans"
                  style={{ display: 'block', width: '100%', height: '100%', objectFit: 'contain' }} />
                {refMidlineX !== null && refMidlineX !== undefined && (
                  <div style={{
                    position: 'absolute', top: 0, left: `${refMidlineX * 100}%`, width: 2, height: '100%',
                    background: 'rgba(59,130,246,0.85)', pointerEvents: 'none',
                    boxShadow: '0 0 6px rgba(59,130,246,0.7)',
                    transform: 'translateX(-1px)',
                  }} />
                )}
              </div>
            </div>
          )}

          {/* Main image with midline + rotate + magnifier */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            {showMidlineMark && loaded && (
              <div style={{ textAlign: 'center', marginBottom: 4, fontSize: 10, color: 'rgba(96,165,250,0.7)', fontWeight: 600 }}>
                {midlineX === null ? 'Orta hattı işaretlemek için fotoğrafa tıklayın' : 'Orta hat işaretlendi — yeniden konumlandırmak için tekrar tıklayın'}
              </div>
            )}
            <div style={{
              borderRadius: 14, overflow: 'hidden',
              boxShadow: '0 12px 40px rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.1)',
              width: loaded ? dispW : 360, height: loaded ? dispH : 220,
              background: '#0d0d0d', display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative',
              cursor: showMidlineMark && loaded ? 'crosshair' : undefined,
            }}
              onMouseMove={loaded ? makeMouseMove('main') : undefined}
              onMouseLeave={loaded ? handleMouseLeave : undefined}
              onClick={showMidlineMark && loaded ? (e) => {
                const rect = e.currentTarget.getBoundingClientRect()
                setMidlineX((e.clientX - rect.left) / rect.width)
              } : undefined}
            >
              {!imgSrc && <span style={{ color: '#444', fontSize: 13 }}>Yükleniyor…</span>}
              {imgSrc && (
                <img ref={imgRef} src={imgSrc} onLoad={handleLoad} alt=""
                  style={{ display: 'block', width: loaded ? dispW : 0, height: loaded ? dispH : 0 }} />
              )}
              {/* Vertical midline guide — only at clicked position */}
              {showMidlineMark && loaded && midlineX !== null && (
                <div style={{
                  position: 'absolute', top: 0, left: `${midlineX * 100}%`, width: 1, height: '100%',
                  background: 'rgba(59,130,246,0.75)', pointerEvents: 'none',
                  boxShadow: '0 0 8px rgba(59,130,246,0.6)',
                  transform: 'translateX(-0.5px)',
                }} />
              )}
            </div>

            {/* Rotate button */}
            {loaded && (
              <button onClick={handleRotate} title="90° döndür" style={{
                position: 'absolute', top: 8, right: 8,
                width: 30, height: 30, borderRadius: 7, fontSize: 15,
                cursor: 'pointer', border: '1px solid rgba(255,255,255,0.15)',
                background: 'rgba(0,0,0,0.6)', color: 'rgba(255,255,255,0.7)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backdropFilter: 'blur(4px)', padding: 0,
              }}>↻</button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {total > 0 && (
          <div style={{ width: '100%', maxWidth: 560 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <span style={{ color: C.muted, fontSize: 10, fontWeight: 600 }}>İlerleme</span>
              <span style={{ color: pct === 100 ? C.green : C.accent, fontSize: 10, fontWeight: 700, transition: 'color 0.3s ease' }}>{done}/{total}</span>
            </div>
            <div style={{ height: 3, background: 'rgba(255,255,255,0.07)', borderRadius: 99 }}>
              <div style={{
                height: '100%', borderRadius: 99,
                transition: 'width 0.35s cubic-bezier(0.4,0,0.2,1), background 0.35s ease',
                width: `${pct}%`, background: pct === 100 ? '#4ADE80' : '#3B82F6',
              }} />
            </div>
          </div>
        )}

        {/* Question panel */}
        <div style={{
          width: '100%', background: C.card, borderRadius: 14,
          border: `1px solid ${C.cardBorder}`, padding: '18px 20px',
          display: 'flex', flexDirection: 'column', gap: 16,
        }}>
          {renderQuestions()}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button onClick={onCancel} style={{
            padding: '9px 22px', borderRadius: 9, fontSize: 13, fontWeight: 600,
            cursor: 'pointer', background: 'rgba(255,255,255,0.05)',
            color: 'rgba(255,255,255,0.45)', border: `1px solid ${C.inactiveBdr}`,
          }}>İptal</button>
          <button onClick={() => confirmWithBurn({})} style={{
            padding: '9px 22px', borderRadius: 9, fontSize: 13, fontWeight: 600,
            cursor: 'pointer', background: 'rgba(255,255,255,0.05)',
            color: 'rgba(255,165,0,0.7)', border: '1px solid rgba(255,165,0,0.25)',
          }} title="Fotoğrafı kaydet, analiz alanlarını boş bırak">Pas Geç</button>
          <button onClick={() => confirmWithBurn(buildAllAnswers())} style={{
            padding: '9px 28px', borderRadius: 9, fontSize: 13, fontWeight: 700,
            cursor: 'pointer', border: 'none',
            background: allDone ? C.active : 'rgba(37,99,235,0.6)',
            color: 'white',
            boxShadow: allDone ? C.activeShadow : 'none',
            transform: allDone ? 'translateY(-1px)' : 'none',
          }}>Onayla {allDone ? '✓' : ''}</button>
        </div>

      </div>

      {/* Magnifier */}
      {mousePos && loaded && (
        <canvas ref={magRef} style={{
          position: 'fixed', left: magLeft, top: Math.max(10, magTop),
          width: MAG_SIZE, height: MAG_SIZE, borderRadius: '50%',
          pointerEvents: 'none', zIndex: 100, boxShadow: '0 4px 20px rgba(0,0,0,0.8)',
        }} />
      )}
    </div>
  )
}
