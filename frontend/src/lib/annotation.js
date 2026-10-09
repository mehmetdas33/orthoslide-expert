// Ortak çizgi/orta hat yardımcıları.
// Çizgiler artık fotoğrafa gömülmez; normalize (0-1) koordinat olarak backend'e
// gönderilir ve slayta düzenlenebilir PowerPoint çizgisi olarak eklenir.

/** o noktasından dir yönünde geçen sonsuz doğruyu [0,W]×[0,H] dikdörtgenine kırp. */
export function lineThroughRect(o, dir, W, H) {
  let t0 = -Infinity, t1 = Infinity
  const clip = (p, q) => {
    if (p === 0) return q >= 0
    const r = q / p
    if (p < 0) t0 = Math.max(t0, r)
    else       t1 = Math.min(t1, r)
    return t0 <= t1
  }
  if (!clip(-dir.x, o.x) || !clip(dir.x, W - o.x) || !clip(-dir.y, o.y) || !clip(dir.y, H - o.y)) return null
  return [
    { x: o.x + t0 * dir.x, y: o.y + t0 * dir.y },
    { x: o.x + t1 * dir.x, y: o.y + t1 * dir.y },
  ]
}

/** Piksel uçlarını (W×H görüntüde) backend'in beklediği normalize çizgiye çevir. */
export function toNormLine(ends, W, H, style = {}) {
  if (!ends) return null
  const r = (v) => Math.round(v * 10000) / 10000
  return { x1: r(ends[0].x / W), y1: r(ends[0].y / H), x2: r(ends[1].x / W), y2: r(ends[1].y / H), ...style }
}

export const normPoints = (pts, W, H) => pts.map(p => ({ x: p.x / W, y: p.y / H }))
export const denormPoints = (pts, W, H) => (pts || []).map(p => ({ x: p.x * W, y: p.y * H }))

/** Canvas üzerindeki fare olayının kanvas piksel koordinatı. */
export function canvasPoint(canvas, e) {
  const rect = canvas.getBoundingClientRect()
  return {
    x: (e.clientX - rect.left) * (canvas.width  / rect.width),
    y: (e.clientY - rect.top)  * (canvas.height / rect.height),
  }
}

/** En yakın noktanın indeksi (radius px içinde), yoksa -1. */
export function hitPoint(points, p, radius = 12) {
  let best = -1, bestD = radius * radius
  points.forEach((q, i) => {
    const d = (q.x - p.x) ** 2 + (q.y - p.y) ** 2
    if (d <= bestD) { bestD = d; best = i }
  })
  return best
}

/** Yüklü <img>'i (döndürülmüş hali dahil) çizgisiz JPEG dosyasına çevir. */
export function encodeImage(img, name) {
  return new Promise((resolve) => {
    const c = document.createElement('canvas')
    c.width = img.naturalWidth; c.height = img.naturalHeight
    c.getContext('2d').drawImage(img, 0, 0)
    c.toBlob(blob => resolve(blob ? new File([blob], name, { type: 'image/jpeg' }) : null), 'image/jpeg', 0.95)
  })
}

export const MIDLINE_STYLE = { color: '#3B82F6', width_pt: 1.25, name: 'Orta Hat' }
export const CEPH_LINE_STYLE = { color: '#888888', width_pt: 1.5, name: 'Sefalometri Çizgisi' }

