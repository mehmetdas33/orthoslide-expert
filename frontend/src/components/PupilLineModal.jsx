import { useRef, useState, useEffect, useCallback } from 'react'

const MAG_SIZE = 150
const MAG_ZOOM = 4

// Given pupil points p1,p2 and cupid's bow p3, compute the foot of perpendicular from p3 to the pupil line
function cupidFoot(p1, p2, p3) {
  const dx = p2.x - p1.x, dy = p2.y - p1.y
  const len2 = dx * dx + dy * dy || 1
  const t = ((p3.x - p1.x) * dx + (p3.y - p1.y) * dy) / len2
  return { x: p1.x + t * dx, y: p1.y + t * dy }
}

function drawPreview(ctx, W, H, points) {
  if (points.length >= 2) {
    const [p1, p2] = points
    // Dashed pupil line
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(p1.x, p1.y)
    ctx.lineTo(p2.x, p2.y)
    ctx.strokeStyle = 'rgba(59,130,246,0.4)'
    ctx.lineWidth = 1.5
    ctx.setLineDash([5, 4])
    ctx.stroke()
    ctx.restore()

    if (points.length === 3) {
      const p3 = points[2]
      const foot = cupidFoot(p1, p2, p3)
      const dx = p2.x - p1.x, dy = p2.y - p1.y
      const len = Math.sqrt(dx * dx + dy * dy) || 1
      const px = -dy / len, py = dx / len
      const t = Math.max(W, H) * 2
      // Dashed helper line from p3 to foot
      ctx.save()
      ctx.beginPath()
      ctx.moveTo(p3.x, p3.y)
      ctx.lineTo(foot.x, foot.y)
      ctx.strokeStyle = 'rgba(251,191,36,0.7)'
      ctx.lineWidth = 1
      ctx.setLineDash([4, 3])
      ctx.stroke()
      ctx.restore()
      // Midline through foot, perpendicular to pupil line
      ctx.beginPath()
      ctx.moveTo(foot.x + px * t, foot.y + py * t)
      ctx.lineTo(foot.x - px * t, foot.y - py * t)
      ctx.strokeStyle = '#3B82F6'
      ctx.lineWidth = 0.5
      ctx.stroke()
    }
  }

  // Draw all points
  const labels = ['Sol Göz', 'Sağ Göz', "Cupid's Bow"]
  const colors  = ['#3B82F6', '#3B82F6', '#F59E0B']
  points.forEach((p, i) => {
    ctx.beginPath()
    ctx.arc(p.x, p.y, 7, 0, Math.PI * 2)
    ctx.fillStyle = colors[i] || '#3B82F6'
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.95)'
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.fillStyle = 'white'
    ctx.font = 'bold 11px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(String(i + 1), p.x, p.y)
  })
}

function drawMidlineOnly(ctx, W, H, points, scale) {
  if (points.length < 2) return
  const [p1, p2] = points
  const dx = p2.x - p1.x, dy = p2.y - p1.y
  const len = Math.sqrt(dx * dx + dy * dy) || 1
  const px = -dy / len, py = dx / len
  const t = Math.max(W, H) * 2
  // Midline origin: foot from p3 if available, else midpoint of pupils
  let ox, oy
  if (points.length === 3) {
    const foot = cupidFoot(p1, p2, points[2])
    ox = foot.x; oy = foot.y
  } else {
    ox = (p1.x + p2.x) / 2; oy = (p1.y + p2.y) / 2
  }
  ctx.beginPath()
  ctx.moveTo(ox + px * t, oy + py * t)
  ctx.lineTo(ox - px * t, oy - py * t)
  ctx.strokeStyle = '#3B82F6'
  ctx.lineWidth = 0.75 * scale
  ctx.stroke()
}

export default function PupilLineModal({ file, onConfirm, onCancel }) {
  const imgRef    = useRef(null)
  const canvasRef = useRef(null)
  const magCanvasRef = useRef(null)
  const [points, setPoints] = useState([])
  const [imgSrc, setImgSrc] = useState(null)
  const [dispW, setDispW]   = useState(0)
  const [dispH, setDispH]   = useState(0)
  const [ph109, setPh109]   = useState(null)
  const [saving, setSaving] = useState(false)
  const [mousePos, setMousePos] = useState(null)

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
    setDispW(Math.round(img.naturalWidth  * s))
    setDispH(Math.round(img.naturalHeight * s))
  }

  // Redraw annotation canvas when points/size change
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !dispW || !dispH) return
    canvas.width  = dispW
    canvas.height = dispH
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, dispW, dispH)
    drawPreview(ctx, dispW, dispH, points)
  }, [points, dispW, dispH])

  // Draw magnifier
  useEffect(() => {
    const magCanvas = magCanvasRef.current
    const img = imgRef.current
    if (!magCanvas || !img || !mousePos || !dispW || !dispH) return

    const sX = img.naturalWidth / dispW
    const sY = img.naturalHeight / dispH

    magCanvas.width  = MAG_SIZE
    magCanvas.height = MAG_SIZE
    const ctx = magCanvas.getContext('2d')

    const srcW = (MAG_SIZE / MAG_ZOOM) * sX
    const srcH = (MAG_SIZE / MAG_ZOOM) * sY
    const srcX = Math.max(0, Math.min(mousePos.cx * sX - srcW / 2, img.naturalWidth  - srcW))
    const srcY = Math.max(0, Math.min(mousePos.cy * sY - srcH / 2, img.naturalHeight - srcH))

    // Circular clip
    ctx.save()
    ctx.beginPath()
    ctx.arc(MAG_SIZE / 2, MAG_SIZE / 2, MAG_SIZE / 2, 0, Math.PI * 2)
    ctx.clip()
    ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, MAG_SIZE, MAG_SIZE)

    // Crosshair
    ctx.strokeStyle = 'rgba(59,130,246,0.9)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(MAG_SIZE / 2, MAG_SIZE / 2 - 10)
    ctx.lineTo(MAG_SIZE / 2, MAG_SIZE / 2 + 10)
    ctx.moveTo(MAG_SIZE / 2 - 10, MAG_SIZE / 2)
    ctx.lineTo(MAG_SIZE / 2 + 10, MAG_SIZE / 2)
    ctx.stroke()
    ctx.restore()

    // Border ring
    ctx.beginPath()
    ctx.arc(MAG_SIZE / 2, MAG_SIZE / 2, MAG_SIZE / 2 - 1, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(59,130,246,0.7)'
    ctx.lineWidth = 2
    ctx.stroke()
  }, [mousePos, dispW, dispH])

  const handleCanvasClick = (e) => {
    if (points.length >= 3) return
    const canvas = canvasRef.current
    const rect   = canvas.getBoundingClientRect()
    const x = (e.clientX - rect.left) * (canvas.width  / rect.width)
    const y = (e.clientY - rect.top)  * (canvas.height / rect.height)
    setPoints(prev => [...prev, { x, y }])
  }

  const handleMouseMove = useCallback((e) => {
    if (points.length >= 3) { setMousePos(null); return }
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const cx = (e.clientX - rect.left) * (canvas.width  / rect.width)
    const cy = (e.clientY - rect.top)  * (canvas.height / rect.height)
    setMousePos({ cx, cy, clientX: e.clientX, clientY: e.clientY })
  }, [points.length])

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
    setPoints([])
    setMousePos(null)
  }, [])

  // ph109 is optional — confirm works with just the image loaded
  const handleConfirm = useCallback(() => {
    const img = imgRef.current
    if (!img || !dispW || saving) return
    setSaving(true)
    const natW = img.naturalWidth, natH = img.naturalHeight
    const sX = natW / dispW,       sY = natH / dispH
    const fc  = document.createElement('canvas')
    fc.width  = natW
    fc.height = natH
    const ctx = fc.getContext('2d')
    ctx.drawImage(img, 0, 0, natW, natH)
    if (points.length >= 2) {
      drawMidlineOnly(ctx, natW, natH, points.map(p => ({ x: p.x * sX, y: p.y * sY })), (sX + sY) / 2)
    }
    let midlineFraction = null
    if (points.length === 3) {
      const foot = cupidFoot(points[0], points[1], points[2])
      midlineFraction = foot.x / dispW
    } else if (points.length === 2) {
      midlineFraction = (points[0].x + points[1].x) / 2 / dispW
    }
    fc.toBlob(blob => {
      if (!blob) { setSaving(false); return }
      const ext  = points.length >= 2 ? '_midline.jpg' : '.jpg'
      const name = file.name.replace(/\.[^.]+$/, '') + ext
      onConfirm(new File([blob], name, { type: 'image/jpeg' }), ph109, file, midlineFraction)
    }, 'image/jpeg', 0.95)
  }, [points, file, dispW, dispH, ph109, onConfirm, saving])

  const loaded = dispW > 0 && dispH > 0

  const hint =
    points.length === 0 ? '1. Sol göz bebeğine tıklayın' :
    points.length === 1 ? '2. Sağ göz bebeğine tıklayın' :
    points.length === 2 ? "3. Cupid's bow noktasına tıklayın" :
                          "✓ Orta hat hazır (Cupid's bow'dan dik)"

  // Magnifier position: offset from cursor so it doesn't cover the click area
  const magLeft = mousePos ? mousePos.clientX + 20 : 0
  const magTop  = mousePos ? mousePos.clientY - MAG_SIZE - 10 : 0

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(4px)', padding: 16,
    }}>
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 14, maxWidth: '100%',
      }}>

        {/* Header */}
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: 'white', fontWeight: 700, fontSize: 14, letterSpacing: '0.02em', margin: 0 }}>
            Cephe Gülen — Orta Hat & Gülüş Analizi
          </p>
          <p style={{
            color: points.length === 3 ? '#4ADE80' : points.length === 2 ? '#F59E0B' : '#60A5FA',
            fontSize: 12, marginTop: 4, fontWeight: 500,
          }}>
            {hint}
          </p>
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
            <canvas ref={canvasRef} onClick={handleCanvasClick}
              onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}
              style={{
                position: 'absolute', top: 0, left: 0, width: dispW, height: dispH,
                cursor: points.length < 3 ? 'crosshair' : 'default',
              }} />
          )}
        </div>

        {/* Gülüş Hattı question */}
        <div style={{
          background: '#111827', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 12, padding: '14px 20px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
          width: loaded ? Math.max(dispW, 320) : 320,
        }}>
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Gülüş Hattı
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            {['High', 'Normal to High', 'Normal', 'Normal to Low', 'Low'].map(opt => (
              <button key={opt} onClick={() => setPh109(prev => prev === opt ? null : opt)}
                style={{
                  padding: '8px 24px', borderRadius: 9, fontSize: 13, fontWeight: 700,
                  cursor: 'pointer', border: 'none', transition: 'all 0.15s',
                  background: ph109 === opt
                    ? 'linear-gradient(135deg, #2563EB, #1d4ed8)'
                    : 'rgba(255,255,255,0.06)',
                  color: ph109 === opt ? 'white' : 'rgba(255,255,255,0.45)',
                  boxShadow: ph109 === opt ? '0 4px 12px rgba(37,99,235,0.4)' : 'none',
                  transform: ph109 === opt ? 'translateY(-1px)' : 'none',
                }}>
                {opt}
              </button>
            ))}
          </div>
          {!ph109 && (
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.25)', fontSize: 10 }}>
              İsteğe bağlı — seçmeden de kaydedebilirsiniz
            </p>
          )}
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button onClick={() => setPoints([])} disabled={points.length === 0}
            style={{
              padding: '9px 18px', borderRadius: 9, fontSize: 12, fontWeight: 600,
              cursor: points.length === 0 ? 'not-allowed' : 'pointer',
              background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)',
              border: '1px solid rgba(255,255,255,0.08)', opacity: points.length === 0 ? 0.35 : 1,
            }}>
            Sıfırla
          </button>
          <button onClick={handleRotate} disabled={!loaded}
            title="90° saat yönünde döndür"
            style={{
              padding: '9px 14px', borderRadius: 9, fontSize: 15, fontWeight: 600,
              cursor: loaded ? 'pointer' : 'not-allowed',
              background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.55)',
              border: '1px solid rgba(255,255,255,0.08)', opacity: loaded ? 1 : 0.35,
            }}>
            ↻
          </button>
          <button onClick={onCancel}
            style={{
              padding: '9px 18px', borderRadius: 9, fontSize: 12, fontWeight: 600,
              cursor: 'pointer', background: 'rgba(255,255,255,0.05)',
              color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.08)',
            }}>
            İptal
          </button>
          <button onClick={handleConfirm} disabled={!loaded || saving}
            style={{
              padding: '9px 28px', borderRadius: 9, fontSize: 13, fontWeight: 700,
              cursor: loaded && !saving ? 'pointer' : 'not-allowed', border: 'none',
              background: loaded ? 'linear-gradient(135deg, #2563EB, #1d4ed8)' : '#1e3a8a',
              color: 'white', opacity: loaded ? 1 : 0.45,
              boxShadow: loaded ? '0 4px 16px rgba(37,99,235,0.45)' : 'none',
              transform: loaded ? 'translateY(-1px)' : 'none',
            }}>
            {saving ? 'Kaydediliyor…' : 'Onayla & Kaydet'}
          </button>
        </div>

      </div>

      {/* Magnifier lens — fixed, follows cursor */}
      {mousePos && loaded && (
        <canvas
          ref={magCanvasRef}
          style={{
            position: 'fixed',
            left: magLeft,
            top: Math.max(10, magTop),
            width: MAG_SIZE,
            height: MAG_SIZE,
            borderRadius: '50%',
            pointerEvents: 'none',
            zIndex: 100,
            boxShadow: '0 4px 20px rgba(0,0,0,0.8)',
          }}
        />
      )}
    </div>
  )
}
