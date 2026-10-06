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

// Ortalama yetişkin pupiller arası mesafe (mm) — fotoğrafta ölçek yokken mm tahmini için
const MEAN_IPD_MM = 63

/**
 * Orta hat geometrisi (ekran pikselinde).
 * Literatürdeki standart: yüz orta hattı bipupiller hatta DİK ve pupillerin ORTASINDAN geçer.
 *  - Pupiller (1–2) → hattın yönü + konumu (anchor = 'pupil', önerilen)
 *  - Cupid's bow (3, isteğe bağlı) → kontrol noktası; sapması ölçülür.
 *    anchor = 'cupid' seçilirse hat aynı yönde ama Cupid's bow'dan geçer.
 */
function midlineGeometry(pts, anchor, angleDeg = 0) {
  if (pts.length < 2) return null
  const [p1, p2] = pts
  const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 }
  const o = anchor === 'cupid' && pts.length === 3 ? cupidFoot(p1, p2, pts[2]) : mid
  // Bipupiller hatta dik birim vektör, aşağı doğru
  let bx = -(p2.y - p1.y), by = p2.x - p1.x
  const bl = Math.hypot(bx, by) || 1
  bx /= bl; by /= bl
  if (by < 0) { bx = -bx; by = -by }
  // Kullanıcının verdiği açı düzeltmesi (dikten sapma, saat yönü +)
  const a = angleDeg * Math.PI / 180
  const dir = { x: bx * Math.cos(a) - by * Math.sin(a), y: bx * Math.sin(a) + by * Math.cos(a) }
  return { o, mid, dir, base: { x: bx, y: by } }
}

/** Döndürme tutamacının yeri: çizginin alt ucuna yakın */
function rotateHandlePos(g, W, H) {
  const ends = lineThroughRect(g.o, g.dir, W, H)
  if (!ends) return null
  const e = ends[0].y > ends[1].y ? ends[0] : ends[1]
  return { x: g.o.x + (e.x - g.o.x) * 0.82, y: g.o.y + (e.y - g.o.y) * 0.82 }
}

const MAX_ANGLE = 30
const smallBtn = {
  padding: '4px 9px', borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: 'pointer',
  background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.1)',
}

/** Analiz: bipupiller hattın eğimi ve Cupid's bow'un pupil orta hattından sapması. */
function midlineAnalysis(pts, angleDeg = 0) {
  if (pts.length < 2) return null
  const [p1, p2] = pts[0].x <= pts[1].x ? [pts[0], pts[1]] : [pts[1], pts[0]]
  const ipdPx = Math.hypot(p2.x - p1.x, p2.y - p1.y) || 1
  // Görüntüde sağ taraf aşağıdaysa pozitif
  const tiltDeg = Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI
  let cupidMm = null
  if (pts.length === 3) {
    // Cupid's bow'un pupil orta hattına (açı düzeltmesi dahil) dik uzaklığı; görüntüde sağa +
    const g = midlineGeometry(pts, 'pupil', angleDeg)
    const n = { x: g.dir.y, y: -g.dir.x }   // aşağı yönün sağ normali = görüntüde sağ
    const dist = (pts[2].x - g.o.x) * n.x + (pts[2].y - g.o.y) * n.y
    cupidMm = dist / ipdPx * MEAN_IPD_MM
  }
  return { tiltDeg, cupidMm }
}

const clampPt = (p, W, H) => ({ x: Math.max(0, Math.min(W, p.x)), y: Math.max(0, Math.min(H, p.y)) })

// İşaret çizimi (ana kanvas ve büyüteç için ortak; s = çizgi/nokta ölçeği)
function makeDraw(anchor, angleRef) {
  return (ctx, W, H, pts, active, s = 1) => {
    const g = midlineGeometry(pts, anchor, angleRef.current)
    if (pts.length >= 2) {
      const [p1, p2] = pts
      ctx.save()
      ctx.setLineDash([5 * s, 4 * s])
      ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y)
      ctx.strokeStyle = 'rgba(59,130,246,0.45)'; ctx.lineWidth = 1.5 * s; ctx.stroke()
      if (pts.length === 3) {
        // Cupid's bow → orta hat arası sapma (bipupiller hatta paralel)
        const off = { x: pts[2].x - g.o.x, y: pts[2].y - g.o.y }
        const len = Math.hypot(g.dir.x, g.dir.y) || 1
        const t = (off.x * g.dir.x + off.y * g.dir.y) / len
        const onLine = { x: g.o.x + g.dir.x / len * t, y: g.o.y + g.dir.y / len * t }
        ctx.setLineDash([4 * s, 3 * s])
        ctx.beginPath(); ctx.moveTo(pts[2].x, pts[2].y); ctx.lineTo(onLine.x, onLine.y)
        ctx.strokeStyle = 'rgba(251,191,36,0.85)'; ctx.lineWidth = 1.5 * s; ctx.stroke()
        // Cupid's bow seçiliyse pupil orta hattını referans olarak kesikli göster
        if (anchor === 'cupid') {
          const ref = lineThroughRect(g.mid, g.dir, W, H)   // aynı açıyla, pupil ortasından
          if (ref) {
            ctx.beginPath(); ctx.moveTo(ref[0].x, ref[0].y); ctx.lineTo(ref[1].x, ref[1].y)
            ctx.strokeStyle = 'rgba(59,130,246,0.5)'; ctx.lineWidth = 1 * s; ctx.stroke()
          }
        }
      }
      ctx.restore()
    }
    if (g) {
      const ends = lineThroughRect(g.o, g.dir, W, H)
      if (ends) {
        ctx.beginPath(); ctx.moveTo(ends[0].x, ends[0].y); ctx.lineTo(ends[1].x, ends[1].y)
        ctx.strokeStyle = '#3B82F6'; ctx.lineWidth = 1.5 * s; ctx.stroke()
      }
      // Açı değiştirilmişse "tam dik" referansı ince kesikli göster
      if (Math.abs(angleRef.current) >= 0.05) {
        const perp = lineThroughRect(g.o, g.base, W, H)
        if (perp) {
          ctx.save(); ctx.setLineDash([2 * s, 4 * s])
          ctx.beginPath(); ctx.moveTo(perp[0].x, perp[0].y); ctx.lineTo(perp[1].x, perp[1].y)
          ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1 * s; ctx.stroke()
          ctx.restore()
        }
      }
      // Döndürme tutamacı
      const h = rotateHandlePos(g, W, H)
      if (h) {
        ctx.beginPath(); ctx.arc(h.x, h.y, 8 * s, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.fill()
        ctx.strokeStyle = '#3B82F6'; ctx.lineWidth = 2 * s; ctx.stroke()
        ctx.beginPath(); ctx.arc(h.x, h.y, 4 * s, -Math.PI * 0.9, Math.PI * 0.4)
        ctx.strokeStyle = '#2563EB'; ctx.lineWidth = 1.5 * s; ctx.stroke()
      }
    }
    const colors = ['#3B82F6', '#3B82F6', '#F59E0B']
    pts.forEach((p, i) => {
      const r = (i === active ? 9 : 7) * s
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
      ctx.fillStyle = colors[i] || '#3B82F6'
      ctx.globalAlpha = i === active ? 0.75 : 1
      ctx.fill(); ctx.globalAlpha = 1
      ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = 2 * s; ctx.stroke()
      ctx.fillStyle = 'white'; ctx.font = `bold ${11 * s}px sans-serif`
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText(String(i + 1), p.x, p.y)
    })
  }
}

export default function PupilLineModal({ file, onConfirm, onCancel, midlineOnly = false, initialPoints = null, initialPh109 = null, initialAnchor = 'pupil', initialAngle = 0 }) {
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
  // Orta hattın geçtiği referans: 'pupil' (pupillerin ortası, önerilen) | 'cupid'
  const [anchor, setAnchor]   = useState(initialAnchor === 'cupid' ? 'cupid' : 'pupil')

  // Orta hattın dikten açı sapması (°). Sürüklerken ref üzerinden canlı, bırakınca state'e yazılır
  const [angle, setAngleState] = useState(Number(initialAngle) || 0)
  const angleRef = useRef(Number(initialAngle) || 0)
  const redrawRef = useRef(() => {})
  const setAngle = useCallback((v) => {
    const a = Math.max(-MAX_ANGLE, Math.min(MAX_ANGLE, Math.round(v * 10) / 10))
    angleRef.current = a
    setAngleState(a)
    redrawRef.current()
  }, [])

  const draw = useMemo(() => makeDraw(anchor, angleRef), [anchor])
  // Çizginin kendisinden tutup kaydırma
  const lineHit = useCallback((p, pts, tol) => {
    const g = midlineGeometry(pts, anchor, angleRef.current)
    return !!g && distToLine(p, g.o, g.dir) <= tol
  }, [anchor])

  // Döndürme tutamacı: tutup sürükleyince orta hat kendi noktası etrafında döner
  const rotateHandle = useMemo(() => ({
    hit: (p, pts) => {
      const g = midlineGeometry(pts, anchor, angleRef.current)
      const h = g && rotateHandlePos(g, dispW, dispH)
      return !!h && Math.hypot(p.x - h.x, p.y - h.y) <= 14
    },
    start: (p, pts) => {
      const g0 = midlineGeometry(pts, anchor, 0)
      const baseAng = Math.atan2(g0.base.y, g0.base.x)
      return {
        move: (q) => {
          const v = { x: q.x - g0.o.x, y: q.y - g0.o.y }
          if (Math.hypot(v.x, v.y) < 10) return
          let d = (Math.atan2(v.y, v.x) - baseAng) * 180 / Math.PI
          d = ((d + 540) % 360) - 180
          angleRef.current = Math.max(-MAX_ANGLE, Math.min(MAX_ANGLE, Math.round(d * 10) / 10))
        },
        end: () => setAngleState(angleRef.current),
      }
    },
  }), [anchor, dispW, dispH])
  const dragLine = useCallback((start, dx, dy, W, H) => {
    // Cupid's bow referansında Cupid's bow'u, pupil referansında iki pupili birlikte kaydır
    if (anchor === 'cupid' && start.length === 3) return [start[0], start[1], clampPt({ x: start[2].x + dx, y: start[2].y + dy }, W, H)]
    return start.map((q, i) => (i < 2 ? clampPt({ x: q.x + dx, y: q.y + dy }, W, H) : q))
  }, [anchor])
  const magnifier = useMemo(() => ({ ref: magCanvasRef, imgRef, size: MAG_SIZE, zoom: MAG_ZOOM, color: 'rgba(59,130,246,0.9)' }), [])

  const { points, setPoints, showMagnifier, handlers, redraw } = usePointEditor({
    canvasRef, dispW, dispH,
    maxPoints: 3,
    draw, lineHit, dragLine, magnifier, handle: rotateHandle,
  })
  redrawRef.current = redraw
  useEffect(() => { redraw() }, [anchor, redraw])

  useEffect(() => {
    // Nesne URL'si: base64'e çevirmekten çok daha hızlı açılır
    const url = URL.createObjectURL(file)
    setImgSrc(url)
    return () => URL.revokeObjectURL(url)
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
    if (!initApplied.current && initialPoints?.length >= 2) {
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
    const g = midlineGeometry(points, anchor, angleRef.current)
    const line = g ? toNormLine(lineThroughRect(g.o, g.dir, dispW, dispH), dispW, dispH, MIDLINE_STYLE) : null
    const base = file.name.replace(/\.[^.]+$/, '')
    const cleanFile = rotated ? await encodeImage(img, base + '.jpg') : file
    if (!cleanFile) { setSaving(false); return }
    onConfirm({
      file: cleanFile,
      ph109,
      line,
      points: normPoints(points, dispW, dispH),
      anchor,
      angle: angleRef.current,
      midlineX: g ? g.o.x / dispW : null,
    })
  }, [points, file, dispW, dispH, ph109, onConfirm, saving, anchor, angle, rotated])

  // Derived — after all useCallback hooks
  const loaded = dispW > 0 && dispH > 0
  const analysis = midlineAnalysis(points, angle)
  const hint = points.length === 0 ? '1. Hastanın sağ göz bebeğine tıklayın (görüntüde solda)'
             : points.length === 1 ? '2. Diğer göz bebeğine tıklayın'
             : points.length === 2 ? "✓ Orta hat hazır (pupillerin ortasından, bipupiller hatta dik) · İsteğe bağlı 3. nokta: Cupid's bow — sapmayı ölçer"
             :                       '✓ Noktaları veya çizgiyi sürükleyin · ince ayar: ok tuşları (Shift ile 10 px)'


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

        {/* Orta hat analizi: baş eğimi + Cupid's bow sapması, referans seçimi */}
        {loaded && (
          <div style={{
            background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12,
            padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center',
            width: loaded ? Math.max(dispW, 320) : 320, boxSizing: 'border-box',
          }}>
            <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', justifyContent: 'center', fontSize: 12, minHeight: 18 }}>
              {!analysis && (
                <span style={{ color: 'rgba(255,255,255,0.35)' }}>İki göz bebeğini işaretleyince baş eğimi ve orta hat burada görünür</span>
              )}
              {analysis && <span style={{ color: 'rgba(255,255,255,0.55)' }}>
                Bipupiller hat eğimi:{' '}
                <b style={{ color: Math.abs(analysis.tiltDeg) > 2 ? '#F59E0B' : '#4ADE80' }}>
                  {Math.abs(analysis.tiltDeg).toFixed(1)}°
                  {Math.abs(analysis.tiltDeg) >= 0.1 ? (analysis.tiltDeg > 0 ? ' (görüntüde sağ taraf aşağıda)' : ' (görüntüde sol taraf aşağıda)') : ''}
                </b>
              </span>}
              {analysis && analysis.cupidMm !== null && (
                <span style={{ color: 'rgba(255,255,255,0.55)' }}>
                  Cupid's bow sapması:{' '}
                  <b style={{ color: Math.abs(analysis.cupidMm) > 2 ? '#F59E0B' : '#4ADE80' }}>
                    {Math.abs(analysis.cupidMm) < 0.25 ? 'orta hatta'
                      : `≈${Math.abs(analysis.cupidMm).toFixed(1)} mm hastanın ${analysis.cupidMm > 0 ? 'soluna' : 'sağına'}`}
                  </b>
                </span>
              )}
            </div>
            {(
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center',
                opacity: points.length === 3 ? 1 : 0.35, pointerEvents: points.length === 3 ? 'auto' : 'none' }}>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Orta hat geçsin:</span>
                {[['pupil', 'Pupillerin ortasından (önerilen)'], ['cupid', "Cupid's bow'dan"]].map(([k, label]) => (
                  <button key={k} onClick={() => setAnchor(k)} style={{
                    padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none',
                    background: anchor === k ? 'linear-gradient(135deg,#2563EB,#1d4ed8)' : 'rgba(255,255,255,0.06)',
                    color: anchor === k ? 'white' : 'rgba(255,255,255,0.5)',
                  }}>{label}</button>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Orta hat açısı</span>
              <input type="range" min={-MAX_ANGLE} max={MAX_ANGLE} step={0.1} value={angle} disabled={!analysis}
                onChange={(e) => setAngle(parseFloat(e.target.value))}
                style={{ width: 180, accentColor: '#3B82F6' }} />
              <span style={{ color: Math.abs(angle) >= 0.05 ? '#F59E0B' : '#4ADE80', fontSize: 12, fontWeight: 700, minWidth: 92 }}>
                {Math.abs(angle) < 0.05 ? 'Tam dik' : `Dikten ${angle > 0 ? '+' : '−'}${Math.abs(angle).toFixed(1)}°`}
              </span>
              <button onClick={() => setAngle(angle - 0.5)} style={smallBtn}>−0.5°</button>
              <button onClick={() => setAngle(angle + 0.5)} style={smallBtn}>+0.5°</button>
              <button onClick={() => setAngle(0)} disabled={Math.abs(angle) < 0.05}
                style={{ ...smallBtn, opacity: Math.abs(angle) < 0.05 ? 0.35 : 1 }}>Dik'e sıfırla</button>
            </div>
            <span style={{ color: 'rgba(255,255,255,0.28)', fontSize: 10, textAlign: 'center' }}>
              Varsayılan: bipupiller hatta dik (baş eğikse de doğru yönde kalır). Açıyı çizginin altındaki ◯ tutamaçla veya kaydırıcıyla değiştirebilirsiniz. mm değerleri ortalama pupiller arası mesafe ({MEAN_IPD_MM} mm) kabulüyle tahminidir.
            </span>
          </div>
        )}

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
