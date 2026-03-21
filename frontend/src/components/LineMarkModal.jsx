import { useRef, useState, useEffect, useCallback } from 'react'

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

function drawPreview(ctx, W, H, points) {
  if (points.length === 2) {
    const ends = lineEndpoints(points[0], points[1], W, H)
    if (ends.length === 2) {
      ctx.save()
      ctx.beginPath()
      ctx.moveTo(ends[0].x, ends[0].y)
      ctx.lineTo(ends[1].x, ends[1].y)
      ctx.strokeStyle = 'rgba(156,163,175,0.85)'
      ctx.lineWidth = 1.5
      ctx.stroke()
      ctx.restore()
    }
  }
  points.forEach((p, i) => {
    ctx.beginPath()
    ctx.arc(p.x, p.y, 6, 0, Math.PI * 2)
    ctx.fillStyle = '#6B7280'
    ctx.fill()
    ctx.strokeStyle = 'white'
    ctx.lineWidth = 1.5
    ctx.stroke()
    ctx.fillStyle = 'white'
    ctx.font = 'bold 10px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(String(i + 1), p.x, p.y)
  })
}

function drawLineOnly(ctx, W, H, p1, p2) {
  const ends = lineEndpoints(p1, p2, W, H)
  if (ends.length !== 2) return
  ctx.beginPath()
  ctx.moveTo(ends[0].x, ends[0].y)
  ctx.lineTo(ends[1].x, ends[1].y)
  ctx.strokeStyle = '#888888'
  ctx.lineWidth = 2
  ctx.stroke()
}

export default function LineMarkModal({ file, onConfirm, onCancel }) {
  const imgRef    = useRef(null)
  const canvasRef = useRef(null)
  const magRef    = useRef(null)
  const [imgSrc, setImgSrc]   = useState(null)
  const [dispW, setDispW]     = useState(0)
  const [dispH, setDispH]     = useState(0)
  const [points, setPoints]   = useState([])
  const [mousePos, setMousePos] = useState(null)
  const [saving, setSaving]   = useState(false)

  useEffect(() => {
    const reader = new FileReader()
    reader.onload = (e) => setImgSrc(e.target.result)
    reader.readAsDataURL(file)
  }, [file])

  const handleLoad = (e) => {
    const img  = e.currentTarget
    const maxW = Math.min(window.innerWidth * 0.84, 940)
    const maxH = window.innerHeight * 0.62
    const s    = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight, 1)
    setDispW(Math.round(img.naturalWidth  * s))
    setDispH(Math.round(img.naturalHeight * s))
  }

  const loaded = dispW > 0 && dispH > 0

  // Annotation canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !dispW || !dispH) return
    canvas.width  = dispW
    canvas.height = dispH
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, dispW, dispH)
    drawPreview(ctx, dispW, dispH, points)
  }, [points, dispW, dispH])

  // Magnifier
  useEffect(() => {
    const magCanvas = magRef.current
    const img = imgRef.current
    if (!magCanvas || !img || !mousePos || !dispW || !dispH) return
    const sX = img.naturalWidth  / dispW
    const sY = img.naturalHeight / dispH
    magCanvas.width  = MAG_SIZE
    magCanvas.height = MAG_SIZE
    const ctx = magCanvas.getContext('2d')
    const srcW = (MAG_SIZE / MAG_ZOOM) * sX
    const srcH = (MAG_SIZE / MAG_ZOOM) * sY
    const srcX = Math.max(0, Math.min(mousePos.cx * sX - srcW / 2, img.naturalWidth  - srcW))
    const srcY = Math.max(0, Math.min(mousePos.cy * sY - srcH / 2, img.naturalHeight - srcH))
    ctx.save()
    ctx.beginPath()
    ctx.arc(MAG_SIZE / 2, MAG_SIZE / 2, MAG_SIZE / 2, 0, Math.PI * 2)
    ctx.clip()
    ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, MAG_SIZE, MAG_SIZE)
    ctx.strokeStyle = 'rgba(156,163,175,0.7)'
    ctx.lineWidth = 0.8
    ctx.beginPath()
    ctx.moveTo(MAG_SIZE / 2, MAG_SIZE / 2 - 8); ctx.lineTo(MAG_SIZE / 2, MAG_SIZE / 2 + 8)
    ctx.moveTo(MAG_SIZE / 2 - 8, MAG_SIZE / 2); ctx.lineTo(MAG_SIZE / 2 + 8, MAG_SIZE / 2)
    ctx.stroke()
    ctx.restore()
    ctx.beginPath()
    ctx.arc(MAG_SIZE / 2, MAG_SIZE / 2, MAG_SIZE / 2 - 1, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(156,163,175,0.6)'
    ctx.lineWidth = 2
    ctx.stroke()
  }, [mousePos, dispW, dispH])

  const handleCanvasClick = (e) => {
    if (points.length >= 2) return
    const canvas = canvasRef.current
    const rect   = canvas.getBoundingClientRect()
    const x = (e.clientX - rect.left) * (canvas.width  / rect.width)
    const y = (e.clientY - rect.top)  * (canvas.height / rect.height)
    setPoints(prev => [...prev, { x, y }])
  }

  const handleMouseMove = useCallback((e) => {
    if (points.length >= 2) { setMousePos(null); return }
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    setMousePos({
      cx: (e.clientX - rect.left) * (canvas.width  / rect.width),
      cy: (e.clientY - rect.top)  * (canvas.height / rect.height),
      clientX: e.clientX, clientY: e.clientY,
    })
  }, [points.length])

  const handleMouseLeave = useCallback(() => setMousePos(null), [])

  const handleConfirm = useCallback(() => {
    if (points.length < 2 || saving) return
    setSaving(true)
    const img = imgRef.current
    if (!img) return
    const natW = img.naturalWidth, natH = img.naturalHeight
    const sX   = natW / dispW, sY = natH / dispH
    const p1nat = { x: points[0].x * sX, y: points[0].y * sY }
    const p2nat = { x: points[1].x * sX, y: points[1].y * sY }

    // Cropped photo + grey line overlay
    const fc = document.createElement('canvas')
    fc.width  = natW; fc.height = natH
    const ctx = fc.getContext('2d')
    ctx.drawImage(img, 0, 0, natW, natH)
    drawLineOnly(ctx, natW, natH, p1nat, p2nat)

    fc.toBlob(blob => {
      if (!blob) { setSaving(false); return }
      onConfirm(new File([blob], file.name.replace(/\.[^.]+$/, '') + '_line.jpg', { type: 'image/jpeg' }))
    }, 'image/jpeg', 0.95)
  }, [points, file, dispW, dispH, onConfirm, saving])

  const hint = points.length === 0 ? 'Birinci noktayı işaretleyin'
             : points.length === 1 ? 'İkinci noktayı işaretleyin'
             :                       '✓ Çizgi hazır — onaylayın'

  const magLeft = mousePos ? mousePos.clientX + 20 : 0
  const magTop  = mousePos ? mousePos.clientY - MAG_SIZE - 10 : 0

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
            <canvas ref={canvasRef} onClick={handleCanvasClick}
              onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}
              style={{
                position: 'absolute', top: 0, left: 0, width: dispW, height: dispH,
                cursor: points.length < 2 ? 'crosshair' : 'default',
              }} />
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button onClick={() => { setPoints([]); setMousePos(null) }} disabled={points.length === 0}
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
