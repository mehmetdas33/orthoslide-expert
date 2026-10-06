import { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import { toNormLine, normPoints, denormPoints, CEPH_LINE_STYLE } from '../lib/annotation'
import { usePointEditor, distToLine } from '../lib/usePointEditor'

const MAG_SIZE = 150
const MAG_ZOOM = 4

/** Compute where line through p1,p2 intersects image rect [0,W]×[0,H].
 *  Returns exactly 2 points (clamped to edges). */
function lineEndpoints(p1, p2, W, H) {
  const eps = 0.001
  if (Math.abs(p2.x - p1.x) < eps) {
    return [{ x: p1.x, y: 0 }, { x: p1.x, y: H }]
  }
  const m = (p2.y - p1.y) / (p2.x - p1.x)
  const b = p1.y - m * p1.x

  const candidates = []
  const push = (x, y) => {
    x = Math.round(x * 100) / 100
    y = Math.round(y * 100) / 100
    if (x >= -eps && x <= W + eps && y >= -eps && y <= H + eps) {
      const cx = Math.max(0, Math.min(W, x))
      const cy = Math.max(0, Math.min(H, y))
      if (!candidates.some(c => Math.abs(c.x - cx) < 1 && Math.abs(c.y - cy) < 1))
        candidates.push({ x: cx, y: cy })
    }
  }
  push(0, b)           // left edge
  push(W, m * W + b)   // right edge
  push(-b / m, 0)      // top edge
  push((H - b) / m, H) // bottom edge
  return candidates.slice(0, 2)
}

function drawPreview(ctx, W, H, points, active = -1, s = 1, inMag = false) {
  if (points.length === 2) {
    const ends = lineEndpoints(points[0], points[1], W, H)
    if (ends.length === 2) {
      ctx.beginPath()
      ctx.moveTo(ends[0].x, ends[0].y)
      ctx.lineTo(ends[1].x, ends[1].y)
      ctx.strokeStyle = 'rgba(156,163,175,0.85)'
      ctx.lineWidth = 1.5 * s
      ctx.stroke()
    }
  }
  if (inMag) {
    // Büyüteçte işaretli yeri kapatmamak için yalnızca ince halka
    points.forEach(p => {
      ctx.beginPath(); ctx.arc(p.x, p.y, 6 * s, 0, Math.PI * 2)
      ctx.strokeStyle = '#E5E7EB'; ctx.lineWidth = 1.5 * s; ctx.stroke()
    })
    return
  }
  points.forEach((p, i) => {
    ctx.beginPath()
    ctx.arc(p.x, p.y, (i === active ? 8 : 6) * s, 0, Math.PI * 2)
    ctx.fillStyle = '#6B7280'
    ctx.fill()
    ctx.strokeStyle = 'white'
    ctx.lineWidth = 1.5 * s
    ctx.stroke()
    ctx.fillStyle = 'white'
    ctx.font = `bold ${10 * s}px sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(String(i + 1), p.x, p.y)
  })
}

const clampPt = (p, W, H) => ({ x: Math.max(0, Math.min(W, p.x)), y: Math.max(0, Math.min(H, p.y)) })
const lineHit = (p, pts, tol) =>
  pts.length === 2 && distToLine(p, pts[0], { x: pts[1].x - pts[0].x, y: pts[1].y - pts[0].y }) <= tol
const dragLine = (start, dx, dy, W, H) => start.map(q => clampPt({ x: q.x + dx, y: q.y + dy }, W, H))

export default function LineMarkModal({ file, onConfirm, onCancel, initialPoints = null }) {
  const imgRef    = useRef(null)
  const canvasRef = useRef(null)
  const magRef    = useRef(null)
  const [imgSrc, setImgSrc]   = useState(null)
  const [dispW, setDispW]     = useState(0)
  const [dispH, setDispH]     = useState(0)
  const [saving, setSaving]   = useState(false)

  const magnifier = useMemo(() => ({ ref: magRef, imgRef, size: MAG_SIZE, zoom: MAG_ZOOM, color: '#38BDF8' }), [])
  const { points, setPoints, showMagnifier, handlers } = usePointEditor({
    canvasRef, dispW, dispH, maxPoints: 2,
    draw: drawPreview, lineHit, dragLine, magnifier,
  })

  useEffect(() => {
    // Nesne URL'si: base64'e çevirmekten çok daha hızlı açılır
    const url = URL.createObjectURL(file)
    setImgSrc(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const handleLoad = (e) => {
    const img  = e.currentTarget
    const maxW = Math.min(window.innerWidth * 0.84, 940)
    const maxH = window.innerHeight * 0.62
    const s    = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight, 1)
    const w = Math.round(img.naturalWidth  * s), h = Math.round(img.naturalHeight * s)
    setDispW(w)
    setDispH(h)
    if (initialPoints?.length === 2) setPoints(denormPoints(initialPoints, w, h))
  }

  const loaded = dispW > 0 && dispH > 0

  const handleConfirm = useCallback(() => {
    if (points.length < 2 || saving) return
    // Çizgi gömülmez — slayta düzenlenebilir çizgi olarak eklenir
    const ends = lineEndpoints(points[0], points[1], dispW, dispH)
    if (ends.length !== 2) return
    setSaving(true)
    onConfirm({
      file,
      line: toNormLine(ends, dispW, dispH, CEPH_LINE_STYLE),
      points: normPoints(points, dispW, dispH),
    })
  }, [points, file, dispW, dispH, onConfirm, saving])

  const hint = points.length === 0 ? 'Birinci noktayı işaretleyin'
             : points.length === 1 ? 'İkinci noktayı işaretleyin'
             :                       '✓ Noktaları veya çizgiyi sürükleyin · ince ayar: ok tuşları — sonra onaylayın'


  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 65,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.93)', backdropFilter: 'blur(4px)', padding: 16,
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>

        <div style={{ textAlign: 'center' }}>
          <p style={{ color: 'white', fontWeight: 700, fontSize: 14, margin: 0 }}>
            Sefalometri — Çizgi İşareti (Slayt 15)
          </p>
          <p style={{ color: points.length === 2 ? '#9CA3AF' : '#60A5FA', fontSize: 12, marginTop: 4, fontWeight: 500 }}>
            {hint}
          </p>
        </div>

        <div style={{
          position: 'relative', borderRadius: 12, overflow: 'hidden',
          boxShadow: '0 12px 40px rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.08)',
          width: loaded ? dispW : 500, height: loaded ? dispH : 300, background: '#0d0d0d',
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

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button onClick={() => setPoints([])} disabled={points.length === 0}
            style={{
              padding: '9px 18px', borderRadius: 9, fontSize: 12, fontWeight: 600,
              cursor: points.length === 0 ? 'not-allowed' : 'pointer',
              background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)',
              border: '1px solid rgba(255,255,255,0.08)', opacity: points.length === 0 ? 0.35 : 1,
            }}>Sıfırla</button>
          <button onClick={onCancel} style={{
            padding: '9px 18px', borderRadius: 9, fontSize: 12, fontWeight: 600,
            cursor: 'pointer', background: 'rgba(255,255,255,0.05)',
            color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.08)',
          }}>Atla</button>
          <button onClick={handleConfirm} disabled={points.length < 2 || saving}
            style={{
              padding: '9px 28px', borderRadius: 9, fontSize: 13, fontWeight: 700,
              cursor: (points.length === 2 && !saving) ? 'pointer' : 'not-allowed', border: 'none',
              background: 'linear-gradient(135deg,#4B5563,#374151)',
              color: 'white', opacity: (points.length === 2 && !saving) ? 1 : 0.45,
              boxShadow: '0 3px 10px rgba(0,0,0,0.5)',
            }}>
            {saving ? 'Oluşturuluyor…' : 'Onayla ✓'}
          </button>
        </div>

      </div>

      {loaded && (
        <canvas ref={magRef} style={{
          position: 'fixed', left: -9999, top: 0, display: showMagnifier ? 'block' : 'none',
          width: MAG_SIZE, height: MAG_SIZE, borderRadius: '50%',
          pointerEvents: 'none', zIndex: 100, boxShadow: '0 4px 20px rgba(0,0,0,0.8)',
        }} />
      )}
    </div>
  )
}
