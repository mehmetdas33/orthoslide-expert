import { useRef, useState, useEffect, useCallback } from 'react'

const HS = 10 // handle half-size

export default function CropModal({ file, onConfirm, onCancel }) {
  const imgRef    = useRef(null)
  const canvasRef = useRef(null)
  const dragRef   = useRef(null)
  const [imgSrc, setImgSrc] = useState(null)
  const [dispW, setDispW]   = useState(0)
  const [dispH, setDispH]   = useState(0)
  const [crop, setCrop]     = useState({ x1: 0, y1: 0, x2: 0, y2: 0 })

  useEffect(() => {
    const reader = new FileReader()
    reader.onload = (e) => setImgSrc(e.target.result)
    reader.readAsDataURL(file)
  }, [file])

  const handleLoad = (e) => {
    const img  = e.currentTarget
    const maxW = Math.min(window.innerWidth * 0.88, 980)
    const maxH = window.innerHeight * 0.72
    const s    = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight, 1)
    const w    = Math.round(img.naturalWidth  * s)
    const h    = Math.round(img.naturalHeight * s)
    setDispW(w); setDispH(h)
    setCrop({ x1: Math.round(w * 0.05), y1: Math.round(h * 0.05),
              x2: Math.round(w * 0.95), y2: Math.round(h * 0.95) })
  }

  const loaded = dispW > 0 && dispH > 0

  // Draw crop overlay
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !loaded) return
    canvas.width  = dispW
    canvas.height = dispH
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, dispW, dispH)

    const { x1, y1, x2, y2 } = crop
    const cw = x2 - x1, ch = y2 - y1

    // Dark mask outside crop
    ctx.fillStyle = 'rgba(0,0,0,0.55)'
    ctx.fillRect(0, 0, dispW, dispH)
    ctx.clearRect(x1, y1, cw, ch)

    // Border
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'
    ctx.lineWidth = 1.5
    ctx.strokeRect(x1, y1, cw, ch)

    // Rule-of-thirds
    ctx.strokeStyle = 'rgba(255,255,255,0.2)'
    ctx.lineWidth = 0.5
    ctx.beginPath()
    ;[1/3, 2/3].forEach(f => {
      ctx.moveTo(x1 + cw * f, y1); ctx.lineTo(x1 + cw * f, y2)
      ctx.moveTo(x1, y1 + ch * f); ctx.lineTo(x2, y1 + ch * f)
    })
    ctx.stroke()

    // Corner handles
    ctx.fillStyle = 'white'
    ;[[x1, y1], [x2 - HS*2, y1], [x1, y2 - HS*2], [x2 - HS*2, y2 - HS*2]].forEach(([hx, hy]) => {
      ctx.fillRect(hx, hy, HS * 2, HS * 2)
    })
  }, [crop, dispW, dispH, loaded])

  const hitTest = useCallback((x, y, c) => {
    const pad = HS + 5
    if (Math.abs(x - c.x1) <= pad && Math.abs(y - c.y1) <= pad) return 'tl'
    if (Math.abs(x - c.x2) <= pad && Math.abs(y - c.y1) <= pad) return 'tr'
    if (Math.abs(x - c.x1) <= pad && Math.abs(y - c.y2) <= pad) return 'bl'
    if (Math.abs(x - c.x2) <= pad && Math.abs(y - c.y2) <= pad) return 'br'
    if (x >= c.x1 && x <= c.x2 && y >= c.y1 && y <= c.y2)       return 'move'
    return null
  }, [])

  const getCoords = (e, rect, scaleX, scaleY) => ({
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top)  * scaleY,
  })

  const handleMouseDown = (e) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect   = canvas.getBoundingClientRect()
    const scaleX = canvas.width  / rect.width
    const scaleY = canvas.height / rect.height
    const { x, y } = getCoords(e, rect, scaleX, scaleY)
    const type = hitTest(x, y, crop)
    if (!type) return
    dragRef.current = { type, startX: x, startY: y, startCrop: { ...crop }, rect, scaleX, scaleY }
  }

  const handleMouseMove = useCallback((e) => {
    if (!dragRef.current) return
    const { type, startX, startY, startCrop, rect, scaleX, scaleY } = dragRef.current
    const { x, y } = getCoords(e, rect, scaleX, scaleY)
    const dx = x - startX, dy = y - startY
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(v)))
    const MIN = 30
    setCrop(() => {
      const { x1, y1, x2, y2 } = startCrop
      switch (type) {
        case 'move': {
          const nw = x2 - x1, nh = y2 - y1
          const nx1 = clamp(x1 + dx, 0, dispW - nw)
          const ny1 = clamp(y1 + dy, 0, dispH - nh)
          return { x1: nx1, y1: ny1, x2: nx1 + nw, y2: ny1 + nh }
        }
        case 'tl': return { x1: clamp(x1+dx, 0, x2-MIN), y1: clamp(y1+dy, 0, y2-MIN), x2, y2 }
        case 'tr': return { x1, y1: clamp(y1+dy, 0, y2-MIN), x2: clamp(x2+dx, x1+MIN, dispW), y2 }
        case 'bl': return { x1: clamp(x1+dx, 0, x2-MIN), y1, x2, y2: clamp(y2+dy, y1+MIN, dispH) }
        case 'br': return { x1, y1, x2: clamp(x2+dx, x1+MIN, dispW), y2: clamp(y2+dy, y1+MIN, dispH) }
        default:   return { x1, y1, x2, y2 }
      }
    })
  }, [dispW, dispH])

  const handleMouseUp = useCallback(() => { dragRef.current = null }, [])

  const updateCursor = (e) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect   = canvas.getBoundingClientRect()
    const scaleX = canvas.width  / rect.width
    const scaleY = canvas.height / rect.height
    const { x, y } = getCoords(e, rect, scaleX, scaleY)
    const type = hitTest(x, y, crop)
    const cursors = { tl: 'nw-resize', tr: 'ne-resize', bl: 'sw-resize', br: 'se-resize', move: 'move' }
    canvas.style.cursor = cursors[type] || 'default'
  }

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [handleMouseMove, handleMouseUp])

  const handleConfirm = () => {
    const img = imgRef.current
    if (!img) return
    const { x1, y1, x2, y2 } = crop
    const sX = img.naturalWidth  / dispW
    const sY = img.naturalHeight / dispH
    const srcX = Math.round(x1 * sX), srcY = Math.round(y1 * sY)
    const srcW = Math.round((x2 - x1) * sX), srcH = Math.round((y2 - y1) * sY)
    const fc   = document.createElement('canvas')
    fc.width   = srcW; fc.height = srcH
    fc.getContext('2d').drawImage(img, srcX, srcY, srcW, srcH, 0, 0, srcW, srcH)
    const cropName = file.name.replace(/\.[^.]+$/, '') + '_crop.jpg'
    fc.toBlob(blob => {
      onConfirm(file, new File([blob], cropName, { type: 'image/jpeg' }))
    }, 'image/jpeg', 0.95)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 60,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.93)', backdropFilter: 'blur(4px)',
      padding: 16, overflowY: 'auto',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: 'white', fontSize: 15, fontWeight: 700, margin: 0 }}>Sefalometri Kırpma</p>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 4 }}>
            Köşe tutamaçları ile alanı ayarlayın · kutuyu taşımak için içine sürükleyin
          </p>
        </div>

        <div style={{
          position: 'relative', borderRadius: 12, overflow: 'hidden',
          boxShadow: '0 12px 40px rgba(0,0,0,0.8)',
          width: loaded ? dispW : 500, height: loaded ? dispH : 300,
          background: '#111', flexShrink: 0,
        }}>
          {!imgSrc && <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555', fontSize: 13 }}>Yükleniyor…</span>}
          {imgSrc && (
            <img ref={imgRef} src={imgSrc} onLoad={handleLoad} alt=""
              style={{ display: 'block', width: loaded ? dispW : 0, height: loaded ? dispH : 0 }} />
          )}
          {loaded && (
            <canvas ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={updateCursor}
              style={{ position: 'absolute', top: 0, left: 0, width: dispW, height: dispH }} />
          )}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancel} style={{
            padding: '9px 22px', borderRadius: 9, fontSize: 13, fontWeight: 600,
            cursor: 'pointer', background: 'rgba(255,255,255,0.05)',
            color: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.1)',
          }}>İptal</button>
          <button onClick={handleConfirm} disabled={!loaded} style={{
            padding: '9px 28px', borderRadius: 9, fontSize: 13, fontWeight: 700,
            cursor: loaded ? 'pointer' : 'not-allowed', border: 'none',
            background: 'linear-gradient(135deg,#2563EB,#1d4ed8)',
            color: 'white', opacity: loaded ? 1 : 0.5,
            boxShadow: '0 3px 10px rgba(37,99,235,0.45)',
          }}>Kırp & Kaydet ✓</button>
        </div>
      </div>
    </div>
  )
}
