// Ortak büyüteç (loupe) — tüm işaretleme pencereleri bunu kullanır.
//
// İlkeler:
//  - Merkez = imlecin altındaki doğal piksel (kenarda kırpma/kaydırma yok)
//  - Büyüteç imlecin/parmağın üstüne ASLA binmez: sağ üst tercih edilir, sığmazsa
//    sola / alta geçer
//  - Yakınlaştırma 2×–8× (tekerlek veya + / −), tercih hatırlanır
//  - Kenardan kenara ince kılavuz çizgileri + boşluklu merkez, her zeminde görünür

export const LOUPE_SIZE = 190
const ZOOM_MIN = 2, ZOOM_MAX = 8, ZOOM_KEY = 'orthoslide.loupeZoom'
const GAP = 28           // imleç ile büyüteç kenarı arası boşluk
const MARGIN = 8         // pencere kenarı payı

let zoom = (() => {
  try {
    const z = parseFloat(localStorage.getItem(ZOOM_KEY))
    return z >= ZOOM_MIN && z <= ZOOM_MAX ? z : 3
  } catch { return 3 }
})()

export const getLoupeZoom = () => zoom

/** Yakınlaştırmayı değiştir (delta > 0 büyüt). Yeni değeri döndürür. */
export function stepLoupeZoom(delta) {
  const steps = [2, 2.5, 3, 4, 5, 6, 8]
  let i = steps.findIndex(s => s >= zoom - 1e-6)
  if (i < 0) i = steps.length - 1
  i = Math.max(0, Math.min(steps.length - 1, i + (delta > 0 ? 1 : -1)))
  zoom = steps[i]
  try { localStorage.setItem(ZOOM_KEY, String(zoom)) } catch { /* yok say */ }
  return zoom
}

/** Tekerlek olayından yakınlaştırma; değiştiyse true */
export function wheelLoupeZoom(e) {
  if (!e.deltaY) return false
  const before = zoom
  stepLoupeZoom(e.deltaY < 0 ? 1 : -1)
  return zoom !== before
}

/** Büyüteci imlecin üstüne binmeyecek şekilde yerleştir */
function place(el, clientX, clientY, size) {
  const vw = window.innerWidth, vh = window.innerHeight
  let left = clientX + GAP
  if (left + size > vw - MARGIN) left = clientX - GAP - size          // sağa sığmıyor → sol
  let top = clientY - GAP - size
  if (top < MARGIN) top = clientY + GAP                                  // yukarı sığmıyor → alt
  if (top + size > vh - MARGIN) top = Math.max(MARGIN, vh - MARGIN - size)
  left = Math.max(MARGIN, Math.min(vw - MARGIN - size, left))
  el.style.left = `${Math.round(left)}px`
  el.style.top = `${Math.round(top)}px`
}

function crosshair(ctx, size, color) {
  const c = size / 2, gap = 7
  const lines = () => {
    ctx.beginPath()
    ctx.moveTo(c, 0); ctx.lineTo(c, c - gap); ctx.moveTo(c, c + gap); ctx.lineTo(c, size)
    ctx.moveTo(0, c); ctx.lineTo(c - gap, c); ctx.moveTo(c + gap, c); ctx.lineTo(size, c)
  }
  ctx.save()
  lines(); ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.lineWidth = 3; ctx.stroke()
  lines(); ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.stroke()
  // merkez: 1 px parlak nokta, koyu halka
  ctx.beginPath(); ctx.arc(c, c, 2.2, 0, Math.PI * 2); ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fill()
  ctx.beginPath(); ctx.arc(c, c, 1, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill()
  ctx.restore()
}

/**
 * Büyüteci çiz ve yerleştir.
 *  el          : <canvas> (position: fixed)
 *  img         : kaynak <img> (doğal çözünürlük kullanılır)
 *  natX, natY  : merkezdeki doğal piksel
 *  natPerCss   : ekrandaki 1 css px kaç doğal piksel (görüntü ölçeği)
 *  clientX/Y   : imleç (yerleşim için)
 *  overlay(ctx, toLoupe, k) : işaret/çizgi çizimi; toLoupe(natX, natY) → [x, y], k = doğal px → büyüteç px
 */
export function paintLoupe(el, { img, natX, natY, natPerCss, clientX, clientY, overlay, color = '#38BDF8' }) {
  if (!el || !img || !img.naturalWidth) return
  const size = LOUPE_SIZE
  const dpr = window.devicePixelRatio || 1
  if (el.width !== size * dpr) { el.width = size * dpr; el.height = size * dpr }
  place(el, clientX, clientY, size)
  const ctx = el.getContext('2d')
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, size, size)
  const srcW = (size / zoom) * natPerCss          // büyüteçte görünen doğal genişlik
  const k = size / srcW
  const sx = natX - srcW / 2, sy = natY - srcW / 2
  const toLoupe = (x, y) => [(x - sx) * k, (y - sy) * k]
  ctx.save()
  ctx.beginPath(); ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2); ctx.clip()
  ctx.fillStyle = '#0b0b0b'; ctx.fillRect(0, 0, size, size)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, sx, sy, srcW, srcW, 0, 0, size, size)
  overlay?.(ctx, toLoupe, k)
  crosshair(ctx, size, color)
  ctx.restore()
  // çerçeve + yakınlaştırma etiketi
  ctx.beginPath(); ctx.arc(size / 2, size / 2, size / 2 - 1.5, 0, Math.PI * 2)
  ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.stroke()
  const label = `${zoom}×`
  ctx.font = 'bold 11px system-ui, sans-serif'
  const tw = ctx.measureText(label).width + 12
  ctx.fillStyle = 'rgba(0,0,0,0.7)'
  ctx.beginPath(); ctx.roundRect?.(size / 2 - tw / 2, size - 26, tw, 17, 8); ctx.fill()
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText(label, size / 2, size - 17.5)
}

export const loupeStyle = (visible) => ({
  position: 'fixed', left: -9999, top: 0, display: visible ? 'block' : 'none',
  width: LOUPE_SIZE, height: LOUPE_SIZE, borderRadius: '50%',
  pointerEvents: 'none', zIndex: 100, boxShadow: '0 6px 24px rgba(0,0,0,0.75)',
})
