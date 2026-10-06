import { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import { lineThroughRect, toNormLine, normPoints, denormPoints, encodeImage, MIDLINE_STYLE } from '../lib/annotation'
import { usePointEditor, distToLine } from '../lib/usePointEditor'

const MAG_SIZE = 150
const MAG_ZOOM = 4

// Perpendicular foot from p3 onto line p1→p2
function cupidFoot(p1, p2, p3) {
  const dx = p2.x - p1.x, dy = p2.y - p1.y
  const len2 = dx * dx + dy * dy || 1
  const t = ((p3.x - p1.x) * dx + (p3.y - p1.y) * dy) / len2
  return { x: p1.x + t * dx, y: p1.y + t * dy }
}

// Orta hattın geçtiği nokta ve yönü (ekran pikselinde)
function midlineGeometry(pts, midlineOnly) {
  if (midlineOnly) return pts.length === 1 ? { o: pts[0], dir: { x: 0, y: 1 } } : null
  if (pts.length < 2) return null
  const [p1, p2] = pts
  const o = pts.length === 3 ? cupidFoot(p1, p2, pts[2]) : { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 }
  return { o, dir: { x: -(p2.y - p1.y), y: p2.x - p1.x } }
}

const clampPt = (p, W, H) => ({ x: Math.max(0, Math.min(W, p.x)), y: Math.max(0, Math.min(H, p.y)) })

// İşaret çizimi (ana kanvas ve büyüteç için ortak; s = çizgi/nokta ölçeği)
function makeDraw(midlineOnly) {
  return (ctx, W, H, pts, active, s = 1) => {
    const g = midlineGeometry(pts, midlineOnly)
    if (!midlineOnly && pts.length >= 2) {
      const [p1, p2] = pts
      ctx.save()
      ctx.setLineDash([5 * s, 4 * s])
      ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y)
      ctx.strokeStyle = 'rgba(59,130,246,0.45)'; ctx.lineWidth = 1.5 * s; ctx.stroke()
      if (pts.length === 3) {
        const foot = cupidFoot(p1, p2, pts[2])
        ctx.setLineDash([4 * s, 3 * s])
        ctx.beginPath(); ctx.moveTo(pts[2].x, pts[2].y); ctx.lineTo(foot.x, foot.y)
        ctx.strokeStyle = 'rgba(251,191,36,0.75)'; ctx.lineWidth = 1 * s; ctx.stroke()
      }
      ctx.restore()
    }
    if (g) {
      const ends = lineThroughRect(g.o, g.dir, W, H)
      if (ends) {
        ctx.beginPath(); ctx.moveTo(ends[0].x, ends[0].y); ctx.lineTo(ends[1].x, ends[1].y)
        ctx.strokeStyle = '#3B82F6'; ctx.lineWidth = 1.5 * s; ctx.stroke()
      }
    }
    const colors = ['#3B82F6', '#3B82F6', '#F59E0B']
    pts.forEach((p, i) => {
      const r = (i === active ? 9 : 7) * s
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
      ctx.fillStyle = midlineOnly ? '#3B82F6' : (colors[i] || '#3B82F6')
      ctx.globalAlpha = i === active ? 0.75 : 1
      ctx.fill(); ctx.globalAlpha = 1
      ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = 2 * s; ctx.stroke()
      if (!midlineOnly) {
        ctx.fillStyle = 'white'; ctx.font = `bold ${11 * s}px sans-serif`
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillText(String(i + 1), p.x, p.y)
      }
    })
  }
}

export default function PupilLineModal({ file, onConfirm, onCancel, midlineOnly = false, initialPoints = null, initialPh109 = null }) {
  const imgRef       = useRef(null)
  const canvasRef    = useRef(null)
  const magCanvasRef = useRef(null)
  const [imgSrc, setImgSrc]   = useState(null)
  const [dispW, setDispW]     = useState(0)
  const [dispH, setDispH]     = useState(0)
  const [ph109, setPh109]     = useState(initialPh109)
  const [rotated, setRotated] = useState(false)
  const initApplied = useRef(false)
  const [saving, setSaving]   = useState(false)

  const draw = useMemo(() => makeDraw(midlineOnly), [midlineOnly])
  // Çizginin kendisinden tutup kaydırma
  const lineHit = useCallback((p, pts, tol) => {
    const g = midlineGeometry(pts, midlineOnly)
    return !!g && distToLine(p, g.o, g.dir) <= tol
  }, [midlineOnly])
  const dragLine = useCallback((start, dx, dy, W, H) => {
    if (midlineOnly) return start.map(q => clampPt({ x: q.x + dx, y: q.y + dy }, W, H))
    // 3 nokta: Cupid's bow'u kaydır (orta hat paralel kayar); 2 nokta: ikisini birlikte
    if (start.length === 3) return [start[0], start[1], clampPt({ x: start[2].x + dx, y: start[2].y + dy }, W, H)]
    return start.map(q => clampPt({ x: q.x + dx, y: q.y + dy }, W, H))
  }, [midlineOnly])
  const magnifier = useMemo(() => ({ ref: magCanvasRef, imgRef, size: MAG_SIZE, zoom: MAG_ZOOM, color: 'rgba(59,130,246,0.9)' }), [])

  const { points, setPoints, showMagnifier, handlers } = usePointEditor({
    canvasRef, dispW, dispH,
    maxPoints: midlineOnly ? 1 : 3,
    replaceWhenFull: midlineOnly,
    draw, lineHit, dragLine, magnifier,
  })

  useEffect(() => {
    let cancelled = false
    const reader = new FileReader()
    reader.onload = (e) => { if (!cancelled) setImgSrc(e.target.result) }
    reader.readAsDataURL(file)
    return () => { cancelled = true }
  }, [file])

  const handleLoad = (e) => {
    const img  = e.currentTarget
    const maxW = Math.min(window.innerWidth  * 0.80, 860)
    const maxH = window.innerHeight * 0.50
    const s    = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight, 1)
    const w = Math.round(img.naturalWidth  * s), h = Math.round(img.naturalHeight * s)
    setDispW(w)
    setDispH(h)
    // Daha önce işaretlenmiş noktalarla aç (yeniden düzenleme)
    if (!initApplied.current && initialPoints?.length) {
      initApplied.current = true
      setPoints(denormPoints(initialPoints, w, h))
    }
  }

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
    setRotated(true)
    setDispW(0); setDispH(0)
    initApplied.current = true
    setPoints([])
  }, [setPoints])

  const handleConfirm = useCallback(async () => {
    const img = imgRef.current
    if (!img || !dispW || saving) return
    setSaving(true)
    // Çizgi fotoğrafa gömülmez: temiz görüntü + normalize çizgi → slaytta düzenlenebilir çizgi
    const g = midlineGeometry(points, midlineOnly)
    const line = g ? toNormLine(lineThroughRect(g.o, g.dir, dispW, dispH), dispW, dispH, MIDLINE_STYLE) : null
    const base = file.name.replace(/\.[^.]+$/, '')
    const cleanFile = rotated ? await encodeImage(img, base + '.jpg') : file
    if (!cleanFile) { setSaving(false); return }
    onConfirm({
      file: cleanFile,
      ph109,
      line,
      points: normPoints(points, dispW, dispH),
      midlineX: g ? g.o.x / dispW : null,
    })
  }, [points, file, dispW, dispH, ph109, onConfirm, saving, midlineOnly, rotated])

  // Derived — after all useCallback hooks
  const loaded = dispW > 0 && dispH > 0
  const hint = midlineOnly
    ? (points.length === 0 ? 'Orta hattı işaretlemek için fotoğrafa tıklayın' : '✓ Çizgiyi tutup kaydırın · ince ayar: ← → (Shift ile 10 px)')
    : (points.length === 0 ? '1. Sol göz bebeğine tıklayın' :
       points.length === 1 ? '2. Sağ göz bebeğine tıklayın' :
       points.length === 2 ? "3. Cupid's bow noktasına tıklayın" :
                             "✓ Noktaları veya çizgiyi sürükleyin · ince ayar: ok tuşları (Shift ile 10 px)")


  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(4px)', padding: 16,
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, maxWidth: '100%' }}>

        {/* Header */}
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: 'white', fontWeight: 700, fontSize: 14, margin: 0 }}>
            {midlineOnly ? 'Cephe Gülmeyen — Orta Hat' : 'Cephe Gülen — Orta Hat & Gülüş Analizi'}
          </p>
          <p style={{
            color: points.length === 3 ? '#4ADE80' : points.length === 2 ? '#F59E0B' : '#60A5FA',
            fontSize: 12, marginTop: 4, fontWeight: 500,
          }}>{hint}</p>
        </div>

        {/* Image + canvas */}
        <div style={{
          position: 'relative', borderRadius: 14, overflow: 'hidden',
          boxShadow: '0 12px 40px rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.1)',
          width: loaded ? dispW : 400, height: loaded ? dispH : 280, background: '#0d0d0d',
        }}>
          {!loaded && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#555', fontSize: 13 }}>{imgSrc ? 'Ölçülüyor…' : 'Yükleniyor…'}</span>
            </div>
          )}
          {imgSrc && (
            <img ref={imgRef} src={imgSrc} onLoad={handleLoad} alt=""
              style={{ display: 'block', width: loaded ? dispW : 0, height: loaded ? dispH : 0 }} />
          )}
          {loaded && (
            <canvas ref={canvasRef} {...handlers}
              style={{
                position: 'absolute', top: 0, left: 0, width: dispW, height: dispH,
                cursor: 'crosshair', touchAction: 'none', outline: 'none',
              }} />
          )}
        </div>

        {/* Gülüş Hattı — only for full pupil-line mode */}
        {!midlineOnly && <div style={{
          background: '#111827', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 12, padding: '14px 20px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
          width: loaded ? Math.max(dispW, 320) : 320,
        }}>
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Gülüş Hattı
          </p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
            {['High', 'Normal to High', 'Normal', 'Normal to Low', 'Low'].map(opt => (
              <button key={opt} onClick={() => setPh109(prev => prev === opt ? null : opt)}
                style={{
                  padding: '7px 14px', borderRadius: 9, fontSize: 12, fontWeight: 700,
                  cursor: 'pointer', border: 'none', transition: 'all 0.15s',
                  background: ph109 === opt ? 'linear-gradient(135deg,#2563EB,#1d4ed8)' : 'rgba(255,255,255,0.06)',
                  color: ph109 === opt ? 'white' : 'rgba(255,255,255,0.45)',
                  boxShadow: ph109 === opt ? '0 4px 12px rgba(37,99,235,0.4)' : 'none',
                  transform: ph109 === opt ? 'translateY(-1px)' : 'none',
                  whiteSpace: 'nowrap',
                }}>{opt}</button>
            ))}
          </div>
          {!ph109 && (
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.25)', fontSize: 10 }}>
              İsteğe bağlı — seçmeden de kaydedebilirsiniz
            </p>
          )}
        </div>}

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button onClick={() => setPoints([])} disabled={points.length === 0}
            style={{
              padding: '9px 18px', borderRadius: 9, fontSize: 12, fontWeight: 600,
              cursor: points.length === 0 ? 'not-allowed' : 'pointer',
              background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}>Sıfırla</button>
          <button onClick={handleRotate}
            style={{
              padding: '9px 18px', borderRadius: 9, fontSize: 12, fontWeight: 600,
              cursor: 'pointer', background: 'rgba(255,255,255,0.05)',
              color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.1)',
            }}>↻ Döndür</button>
          <button onClick={onCancel}
            style={{
              padding: '9px 18px', borderRadius: 9, fontSize: 13, fontWeight: 600,
              cursor: 'pointer', background: 'rgba(255,255,255,0.05)',
              color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.1)',
            }}>İptal</button>
          <button onClick={handleConfirm} disabled={saving || !loaded}
            style={{
              padding: '9px 28px', borderRadius: 9, fontSize: 13, fontWeight: 700,
              cursor: saving || !loaded ? 'not-allowed' : 'pointer', border: 'none',
              background: 'linear-gradient(135deg,#2563EB,#1d4ed8)',
              color: 'white', opacity: saving || !loaded ? 0.6 : 1,
              boxShadow: '0 4px 14px rgba(37,99,235,0.4)',
            }}>{saving ? 'Kaydediliyor…' : 'Kaydet'}</button>
        </div>

      </div>

      {/* Magnifier */}
      {loaded && (
        <canvas ref={magCanvasRef} style={{
          position: 'fixed', left: -9999, top: 0, display: showMagnifier ? 'block' : 'none',
          width: MAG_SIZE, height: MAG_SIZE, borderRadius: '50%',
          pointerEvents: 'none', zIndex: 100, boxShadow: '0 4px 20px rgba(0,0,0,0.8)',
        }} />
      )}
    </div>
  )
}
