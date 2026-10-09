import { useRef, useState, useEffect, useCallback } from 'react'
import { paintLoupe, wheelLoupeZoom, stepLoupeZoom } from './loupe'

const HIT_RADIUS = 16      // nokta yakalama yarıçapı (px)
const LINE_HIT   = 9       // çizgi yakalama mesafesi (px)

/**
 * Kanvas üzerinde nokta işaretleme / sürükleme — akıcı sürüm.
 *
 * Sürükleme sırasında React state'i güncellenmez: noktalar ref'te tutulur ve kanvas
 * requestAnimationFrame ile doğrudan çizilir (ekran tazelemesine senkron, takılmasız).
 * State yalnızca bırakınca güncellenir. Pointer Events + pointer capture sayesinde
 * fare, kalem ve dokunmatik ekranda çalışır; imleç kanvastan çıksa da sürükleme sürer.
 * Ok tuşları seçili noktayı 1 px (Shift: 10 px) kaydırır.
 *
 * opts:
 *  - maxPoints: en fazla nokta sayısı
 *  - replaceWhenFull: dolu iken boş yere tıklamak tek noktayı oraya taşısın (tek noktalı orta hat)
 *  - draw(ctx, W, H, pts, activeIdx): işaret çizimi
 *  - lineHit(p, pts) → bool: imleç çizginin üstünde mi (çizginin kendisinden tutup kaydırma)
 *  - dragLine(startPts, dx, dy) → yeni noktalar
 *  - magnifier: { ref, imgRef, size, zoom, color }
 *  - handle: { hit(p, pts) → bool, start(p, pts) → { move(p), end() } } — ek tutamak (ör. açı döndürme)
 */
export function usePointEditor({ canvasRef, dispW, dispH, maxPoints, replaceWhenFull = false, draw, lineHit, dragLine, magnifier, handle }) {
  const [points, setPointsState] = useState([])
  const [dragging, setDragging]  = useState(false)
  const [hovering, setHovering]  = useState(false)
  const pointsRef  = useRef([])
  const dragRef    = useRef(null)     // { type:'point', idx } | { type:'line', start, startPts }
  const activeRef  = useRef(-1)       // klavyeyle kaydırılacak nokta
  const pointerRef = useRef(null)     // son imleç konumu { x, y, clientX, clientY }
  const rafRef     = useRef(0)
  // Geri çağrılar her render'da güncellenir — olay işleyicileri eski (bayat) sürümü görmesin
  const cbRef = useRef({})
  cbRef.current = { lineHit, dragLine, handle }

  const setPoints = useCallback((pts) => {
    pointsRef.current = pts
    activeRef.current = pts.length - 1
    setPointsState(pts)
  }, [])

  // ── Çizim (rAF) ───────────────────────────────────────────────────────────
  const paint = useCallback(() => {
    rafRef.current = 0
    const canvas = canvasRef.current
    if (!canvas || !dispW || !dispH) return
    const dpr = window.devicePixelRatio || 1
    if (canvas.width !== Math.round(dispW * dpr)) {
      canvas.width  = Math.round(dispW * dpr)
      canvas.height = Math.round(dispH * dpr)
    }
    const ctx = canvas.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, dispW, dispH)
    draw(ctx, dispW, dispH, pointsRef.current, dragRef.current?.type === 'point' ? dragRef.current.idx : -1)

    // Büyüteç (ortak loupe: imlecin üstüne binmez, merkez = imleç pikseli)
    const ptr = pointerRef.current
    const img = magnifier?.imgRef.current
    if (!ptr || !img || !img.naturalWidth) return
    const natPerCss = img.naturalWidth / dispW
    paintLoupe(magnifier.ref.current, {
      img, natX: ptr.x * natPerCss, natY: ptr.y * natPerCss, natPerCss,
      clientX: ptr.clientX, clientY: ptr.clientY,
      overlay: (lc, toLoupe, k) => {
        const [ox, oy] = toLoupe(0, 0)
        const z = k * natPerCss                       // ekran px → büyüteç px
        lc.save(); lc.translate(ox, oy); lc.scale(z, z)
        draw(lc, dispW, dispH, pointsRef.current, -1, 1 / z, true)   // inMag: noktalar içi boş halka
        lc.restore()
      },
    })
  }, [canvasRef, dispW, dispH, draw, magnifier])

  const schedule = useCallback(() => {
    if (!rafRef.current) rafRef.current = requestAnimationFrame(paint)
  }, [paint])

  useEffect(() => { schedule() }, [points, dispW, dispH, schedule])
  useEffect(() => () => cancelAnimationFrame(rafRef.current), [])

  // ── Pointer olayları ──────────────────────────────────────────────────────
  const toLocal = (e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) * (dispW / rect.width)
    const y = (e.clientY - rect.top)  * (dispH / rect.height)
    return { x: Math.max(0, Math.min(dispW, x)), y: Math.max(0, Math.min(dispH, y)), clientX: e.clientX, clientY: e.clientY }
  }

  const hitIndex = (p) => {
    let best = -1, bestD = HIT_RADIUS * HIT_RADIUS
    pointsRef.current.forEach((q, i) => {
      const d = (q.x - p.x) ** 2 + (q.y - p.y) ** 2
      if (d <= bestD) { bestD = d; best = i }
    })
    return best
  }

  const updateCursor = (p) => {
    const c = canvasRef.current
    if (!c) return
    if (dragRef.current) { c.style.cursor = 'grabbing'; return }
    const pts = pointsRef.current
    const { handle, lineHit } = cbRef.current
    if (hitIndex(p) >= 0) c.style.cursor = 'grab'
    else if (handle && handle.hit(p, pts)) c.style.cursor = 'grab'
    else if (pts.length < maxPoints) c.style.cursor = 'crosshair'
    else if (lineHit && lineHit(p, pts, LINE_HIT)) c.style.cursor = 'move'
    else c.style.cursor = (pts.length < maxPoints || replaceWhenFull) ? 'crosshair' : 'default'
  }

  const onPointerDown = useCallback((e) => {
    if (e.button !== undefined && e.button !== 0) return
    e.preventDefault()
    const p = toLocal(e)
    pointerRef.current = p
    const pts = pointsRef.current
    const { handle, lineHit, dragLine } = cbRef.current
    const hit = hitIndex(p)
    if (hit >= 0) {
      dragRef.current = { type: 'point', idx: hit }
    } else if (handle && handle.hit(p, pts)) {
      dragRef.current = { type: 'handle', ctl: handle.start(p, pts) }
    } else if (pts.length < maxPoints) {
      // Nokta eksikken tıklama her zaman yeni nokta ekler (Cupid's bow genelde orta hattın üstündedir)
      pointsRef.current = [...pts, { x: p.x, y: p.y }]
      dragRef.current = { type: 'point', idx: pointsRef.current.length - 1 }   // tıkla-sürükle ile yerleştir
    } else if (lineHit && dragLine && lineHit(p, pts, LINE_HIT)) {
      dragRef.current = { type: 'line', start: p, startPts: pts.map(q => ({ ...q })) }
    } else if (replaceWhenFull) {
      pointsRef.current = [{ x: p.x, y: p.y }]
      dragRef.current = { type: 'point', idx: 0 }
    } else {
      return
    }
    activeRef.current = dragRef.current.type === 'point' ? dragRef.current.idx : activeRef.current
    try { canvasRef.current.setPointerCapture(e.pointerId) } catch { /* yakalama yoksa da sürükleme sürer */ }
    canvasRef.current.focus({ preventScroll: true })
    setDragging(true)
    updateCursor(p)
    schedule()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispW, dispH, maxPoints, replaceWhenFull, schedule])

  const onPointerMove = useCallback((e) => {
    const p = toLocal(e)
    pointerRef.current = p
    const d = dragRef.current
    if (d?.type === 'point') {
      pointsRef.current = pointsRef.current.map((q, i) => (i === d.idx ? { x: p.x, y: p.y } : q))
    } else if (d?.type === 'line') {
      pointsRef.current = cbRef.current.dragLine(d.startPts, p.x - d.start.x, p.y - d.start.y, dispW, dispH)
    } else if (d?.type === 'handle') {
      d.ctl.move(p)
    }
    updateCursor(p)
    schedule()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispW, dispH, schedule])

  const endDrag = useCallback((e) => {
    if (!dragRef.current) return
    if (dragRef.current.type === 'handle') dragRef.current.ctl.end?.()
    dragRef.current = null
    try { canvasRef.current?.releasePointerCapture(e.pointerId) } catch { /* yok say */ }
    setDragging(false)
    setPointsState(pointsRef.current)          // React state'i yalnızca bırakınca güncelle
    schedule()
  }, [canvasRef, schedule])

  const onKeyDown = useCallback((e) => {
    if (e.key === '+' || e.key === '=' || e.key === '-') {
      e.preventDefault(); stepLoupeZoom(e.key === '-' ? -1 : 1); schedule(); return
    }
    const idx = activeRef.current
    const pts = pointsRef.current
    if (idx < 0 || idx >= pts.length) return
    const step = e.shiftKey ? 10 : 1
    const delta = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key]
    if (!delta) return
    e.preventDefault()
    const q = pts[idx]
    const np = { x: Math.max(0, Math.min(dispW, q.x + delta[0])), y: Math.max(0, Math.min(dispH, q.y + delta[1])) }
    setPoints(pts.map((r, i) => (i === idx ? np : r)))
    activeRef.current = idx
    // Büyüteç ince ayar yapılan noktayı takip etsin
    const rect = canvasRef.current?.getBoundingClientRect()
    if (rect) pointerRef.current = { x: np.x, y: np.y, clientX: rect.left + np.x * rect.width / dispW, clientY: rect.top + np.y * rect.height / dispH }
    setHovering(true)
  }, [dispW, dispH, setPoints, schedule, canvasRef])

  const handlers = {
    onPointerDown,
    onPointerMove,
    onPointerUp: endDrag,
    onPointerCancel: endDrag,
    onPointerEnter: () => setHovering(true),
    onPointerLeave: () => { if (!dragRef.current) setHovering(false) },
    onKeyDown,
    onWheel: (e) => { if (wheelLoupeZoom(e)) schedule() },
    tabIndex: 0,
  }

  return { points, setPoints, dragging, showMagnifier: hovering || dragging, handlers, redraw: schedule, pointsRef }
}

/** p noktasının, o'dan dir yönünde geçen sonsuz doğruya uzaklığı */
export function distToLine(p, o, dir) {
  const len = Math.hypot(dir.x, dir.y) || 1
  return Math.abs((p.x - o.x) * dir.y - (p.y - o.y) * dir.x) / len
}
