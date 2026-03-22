import { useRef, useState, useCallback, useEffect } from 'react'

// ── Slot definitions  (key must match IMAGE_SLOT_MAP in pptx_engine.py) ──────
const IMAGE_SLOTS = [
  // Kapak
  { key: 'cover',             label: 'Kapak',          slideInfo: 'Slayt 1 · 3/4 Gülen', group: 'Kapak' },
  // Ekstraoral
  { key: 'frontal',           label: 'Cephe',          slideInfo: 'Slayt 3',    group: 'Ekstraoral' },
  { key: 'frontal_smile',     label: 'Cephe Gülen',    slideInfo: 'Slayt 4',    group: 'Ekstraoral' },
  { key: 'profile',           label: 'Profil',         slideInfo: 'Slayt 5 Sol',group: 'Ekstraoral' },
  { key: 'profile_smile',     label: 'Profil Gülen',   slideInfo: 'Slayt 5 Sağ',group: 'Ekstraoral' },
  { key: 'three_quarter',     label: '3/4 Gülmeyen',   slideInfo: 'Slayt 23 SA',group: 'Ekstraoral' },
  // İntraoral
  { key: 'intraoral_frontal', label: 'Int. Cephe',     slideInfo: 'Slayt 6',    group: 'İntraoral' },
  { key: 'intraoral_right',   label: 'Int. Sağ',       slideInfo: 'Slayt 8',    group: 'İntraoral' },
  { key: 'intraoral_left',    label: 'Int. Sol',       slideInfo: 'Slayt 9',    group: 'İntraoral' },
  // Oklüzal
  { key: 'upper_occlusal',    label: 'Üst Oklüzal',    slideInfo: 'Slayt 11 Ü', group: 'Oklüzal' },
  { key: 'lower_occlusal',    label: 'Alt Oklüzal',    slideInfo: 'Slayt 11 A', group: 'Oklüzal' },
  // Radyografi
  { key: 'panoramic',         label: 'Panoramik',      slideInfo: 'Slayt 10',   group: 'Radyografi' },
  { key: 'cephalometric',     label: 'Sefalometri(Çizili)', slideInfo: 'S12-17',     group: 'Radyografi' },
  { key: 'ceph_raw',          label: 'Sefalometri(Ham)',    slideInfo: 'Slayt 18',   group: 'Radyografi' },
  { key: 'wrist',             label: 'El-Bilek',       slideInfo: 'Slayt 19',   group: 'Radyografi' },
  { key: 'pa_film',           label: 'PA Film',         slideInfo: 'Slayt 23',   group: 'Radyografi' },
]

const GROUP_STYLE = {
  'Kapak':      'bg-rose-500/20 text-rose-300',
  'Ekstraoral': 'bg-violet-500/20 text-violet-300',
  'İntraoral':  'bg-sky-500/20 text-sky-300',
  'Oklüzal':    'bg-amber-500/20 text-amber-300',
  'Radyografi': 'bg-emerald-500/20 text-emerald-300',
}
const GROUP_BORDER = {
  'Kapak':      'border-rose-500/30',
  'Ekstraoral': 'border-violet-500/30',
  'İntraoral':  'border-sky-500/30',
  'Oklüzal':    'border-amber-500/30',
  'Radyografi': 'border-emerald-500/30',
}

// ── Slot ghost illustrations ──────────────────────────────────────────────────
const G = { // shorthand fill/stroke helpers
  face: { fill: 'currentColor', fillOpacity: 0.09, stroke: 'currentColor', strokeOpacity: 0.3, strokeWidth: 1.5 },
  hair: { fill: 'currentColor', fillOpacity: 0.15 },
  feat: { fill: 'currentColor', fillOpacity: 0.2 },
  line: { fill: 'none', stroke: 'currentColor', strokeOpacity: 0.25, strokeWidth: 1.5 },
  dim:  { fill: 'none', stroke: 'currentColor', strokeOpacity: 0.15, strokeWidth: 1 },
}

const SLOT_GHOST = {
  frontal: (
    <svg viewBox="0 0 80 108" className="w-full h-full">
      {/* Shoulders */}
      <path d="M2 108 Q4 82 24 76 Q30 73 33 71 L33 68 L47 68 L47 71 Q50 73 56 76 Q76 82 78 108Z" {...G.face}/>
      {/* Neck */}
      <path d="M33 58 Q32 64 33 68 L47 68 Q48 64 47 58Z" {...G.face}/>
      {/* Face — oval, narrower jaw */}
      <path d="M40 6 Q58 6 63 26 Q66 42 62 54 Q58 64 40 66 Q22 64 18 54 Q14 42 17 26 Q22 6 40 6Z" {...G.face}/>
      {/* Hair — pulled back tight, small bun top */}
      <ellipse cx="40" cy="5" rx="7" ry="4.5" {...G.hair}/>
      <path d="M17 26 Q15 14 22 9 Q30 4 40 4 Q50 4 58 9 Q65 14 63 26 Q59 8 40 7 Q21 8 17 26Z" {...G.hair}/>
      {/* Hairline wisps */}
      <path d="M21 18 Q23 13 26 12" fill="none" stroke="currentColor" strokeOpacity="0.12" strokeWidth="1"/>
      <path d="M59 18 Q57 13 54 12" fill="none" stroke="currentColor" strokeOpacity="0.12" strokeWidth="1"/>
      {/* Ear L */}
      <path d="M17 32 Q11 33 11 39 Q11 45 17 46 Q17 44 14 39 Q14 35 17 34Z" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeOpacity="0.18" strokeWidth="1"/>
      {/* Ear R */}
      <path d="M63 32 Q69 33 69 39 Q69 45 63 46 Q63 44 66 39 Q66 35 63 34Z" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeOpacity="0.18" strokeWidth="1"/>
      {/* Brow L — arched */}
      <path d="M23 27 Q29 23 35 25" fill="none" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1.4" strokeLinecap="round"/>
      {/* Brow R */}
      <path d="M45 25 Q51 23 57 27" fill="none" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1.4" strokeLinecap="round"/>
      {/* Eye L — almond */}
      <path d="M23 33 Q26 30 30 31 Q34 30 37 33 Q34 36 30 36 Q26 36 23 33Z" fill="currentColor" fillOpacity="0.13" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1"/>
      <circle cx="30" cy="33" r="2" fill="currentColor" fillOpacity="0.18"/>
      {/* Eye R */}
      <path d="M43 33 Q46 30 50 31 Q54 30 57 33 Q54 36 50 36 Q46 36 43 33Z" fill="currentColor" fillOpacity="0.13" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1"/>
      <circle cx="50" cy="33" r="2" fill="currentColor" fillOpacity="0.18"/>
      {/* Nose bridge + tip */}
      <path d="M40 36 L39 44 Q37 48 38 50 Q40 52 42 50 Q43 48 41 44 L40 36" fill="none" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1.1" strokeLinecap="round"/>
      {/* Nostrils */}
      <path d="M36 50 Q37 52 39 51" fill="none" stroke="currentColor" strokeOpacity="0.18" strokeWidth="1"/>
      <path d="M44 50 Q43 52 41 51" fill="none" stroke="currentColor" strokeOpacity="0.18" strokeWidth="1"/>
      {/* Philtrum */}
      <path d="M38 52 Q40 54 42 52" fill="none" stroke="currentColor" strokeOpacity="0.12" strokeWidth="0.8"/>
      {/* Upper lip */}
      <path d="M32 56 Q36 54 40 55 Q44 54 48 56" fill="none" stroke="currentColor" strokeOpacity="0.28" strokeWidth="1.2" strokeLinecap="round"/>
      {/* Lower lip */}
      <path d="M32 56 Q36 60 40 60 Q44 60 48 56" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeOpacity="0.22" strokeWidth="1"/>
      {/* Chin dimple */}
      <path d="M38 63 Q40 65 42 63" fill="none" stroke="currentColor" strokeOpacity="0.1" strokeWidth="0.8"/>
    </svg>
  ),
  frontal_smile: (
    <svg viewBox="0 0 80 108" className="w-full h-full">
      {/* Shoulders */}
      <path d="M2 108 Q4 82 24 76 Q30 73 33 71 L33 68 L47 68 L47 71 Q50 73 56 76 Q76 82 78 108Z" {...G.face}/>
      {/* Neck */}
      <path d="M33 58 Q32 64 33 68 L47 68 Q48 64 47 58Z" {...G.face}/>
      {/* Face */}
      <path d="M40 6 Q58 6 63 26 Q66 42 62 54 Q58 64 40 66 Q22 64 18 54 Q14 42 17 26 Q22 6 40 6Z" {...G.face}/>
      {/* Hair — topuz */}
      <ellipse cx="40" cy="5" rx="7" ry="4.5" {...G.hair}/>
      <path d="M17 26 Q15 14 22 9 Q30 4 40 4 Q50 4 58 9 Q65 14 63 26 Q59 8 40 7 Q21 8 17 26Z" {...G.hair}/>
      {/* Ear L */}
      <path d="M17 32 Q11 33 11 39 Q11 45 17 46 Q17 44 14 39 Q14 35 17 34Z" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeOpacity="0.18" strokeWidth="1"/>
      {/* Ear R */}
      <path d="M63 32 Q69 33 69 39 Q69 45 63 46 Q63 44 66 39 Q66 35 63 34Z" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeOpacity="0.18" strokeWidth="1"/>
      {/* Brows — slightly raised (happy) */}
      <path d="M22 25 Q28 20 35 23" fill="none" stroke="currentColor" strokeOpacity="0.38" strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M45 23 Q52 20 58 25" fill="none" stroke="currentColor" strokeOpacity="0.38" strokeWidth="1.4" strokeLinecap="round"/>
      {/* Eyes — narrowed from smile */}
      <path d="M23 33 Q26 30 30 31 Q34 30 37 33 Q34 35 30 35 Q26 35 23 33Z" fill="currentColor" fillOpacity="0.13" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1"/>
      <circle cx="30" cy="32" r="2" fill="currentColor" fillOpacity="0.18"/>
      <path d="M43 33 Q46 30 50 31 Q54 30 57 33 Q54 35 50 35 Q46 35 43 33Z" fill="currentColor" fillOpacity="0.13" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1"/>
      <circle cx="50" cy="32" r="2" fill="currentColor" fillOpacity="0.18"/>
      {/* Cheeks raised */}
      <ellipse cx="24" cy="43" rx="5" ry="3" fill="currentColor" fillOpacity="0.06"/>
      <ellipse cx="56" cy="43" rx="5" ry="3" fill="currentColor" fillOpacity="0.06"/>
      {/* Nose */}
      <path d="M40 36 L39 44 Q37 48 38 50 Q40 52 42 50 Q43 48 41 44 L40 36" fill="none" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1.1" strokeLinecap="round"/>
      {/* BIG open smile — very distinct */}
      <path d="M27 54 Q33 50 40 51 Q47 50 53 54 Q50 64 40 65 Q30 64 27 54Z" fill="currentColor" fillOpacity="0.14" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1.4"/>
      {/* Teeth — large & clear */}
      <rect x="28" y="54" width="24" height="8" rx="2" fill="currentColor" fillOpacity="0.28" stroke="currentColor" strokeOpacity="0.15" strokeWidth="0.5"/>
      <line x1="40" y1="54" x2="40" y2="62" stroke="currentColor" strokeOpacity="0.22" strokeWidth="0.8"/>
      <line x1="34" y1="54" x2="34" y2="62" stroke="currentColor" strokeOpacity="0.15" strokeWidth="0.7"/>
      <line x1="46" y1="54" x2="46" y2="62" stroke="currentColor" strokeOpacity="0.15" strokeWidth="0.7"/>
      <line x1="29" y1="54" x2="29" y2="62" stroke="currentColor" strokeOpacity="0.1" strokeWidth="0.6"/>
      <line x1="51" y1="54" x2="51" y2="62" stroke="currentColor" strokeOpacity="0.1" strokeWidth="0.6"/>
      {/* Midline guide */}
      <line x1="40" y1="66" x2="40" y2="76" stroke="#60a5fa" strokeOpacity="0.28" strokeWidth="1" strokeDasharray="2 2"/>
    </svg>
  ),
  profile: (
    <svg viewBox="0 0 80 100" className="w-full h-full">
      {/* Torso/shoulder */}
      <path d="M20 100 Q20 75 36 68 L36 64 Q26 58 22 44 Q18 28 28 14 Q36 5 50 8 Q64 12 66 28 Q68 44 58 54 Q50 60 44 62 L44 68 Q58 74 58 100" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1.5"/>
      {/* Forehead bump */}
      <path d="M28 14 Q32 6 44 6 Q52 6 56 14" fill="currentColor" fillOpacity="0.14"/>
      {/* Nose protrusion */}
      <path d="M66 28 Q74 32 72 40 Q70 46 66 46" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1.5"/>
      {/* Eye */}
      <ellipse cx="56" cy="28" rx="5" ry="3" {...G.feat}/>
      {/* Mouth/lip */}
      <path d="M62 52 Q68 56 66 60" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1.5"/>
      {/* Chin */}
      <path d="M58 62 Q50 68 44 68" fill="none" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1.2"/>
    </svg>
  ),
  profile_smile: (
    <svg viewBox="0 0 80 100" className="w-full h-full">
      <path d="M20 100 Q20 75 36 68 L36 64 Q26 58 22 44 Q18 28 28 14 Q36 5 50 8 Q64 12 66 28 Q68 44 58 54 Q50 60 44 62 L44 68 Q58 74 58 100" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1.5"/>
      <path d="M28 14 Q32 6 44 6 Q52 6 56 14" fill="currentColor" fillOpacity="0.14"/>
      <path d="M66 28 Q74 32 72 40 Q70 46 66 46" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1.5"/>
      <ellipse cx="56" cy="28" rx="5" ry="3" {...G.feat}/>
      {/* Brow raised */}
      <path d="M50 20 Q58 17 64 21" fill="none" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1.2" strokeLinecap="round"/>
      {/* OPEN mouth — very visible teeth */}
      <path d="M58 52 Q68 56 68 64 Q64 68 58 64Z" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeOpacity="0.28" strokeWidth="1.2"/>
      <rect x="59" y="52" width="9" height="7" rx="1" fill="currentColor" fillOpacity="0.28" stroke="currentColor" strokeOpacity="0.15" strokeWidth="0.5"/>
      <line x1="63" y1="52" x2="63" y2="59" stroke="currentColor" strokeOpacity="0.2" strokeWidth="0.7"/>
      <line x1="67" y1="52" x2="67" y2="59" stroke="currentColor" strokeOpacity="0.15" strokeWidth="0.7"/>
    </svg>
  ),
  three_quarter: (
    <svg viewBox="0 0 80 100" className="w-full h-full">
      <path d="M10 100 Q10 74 28 70 L28 66 Q18 58 18 40 Q18 20 30 12 Q40 6 52 10 Q64 14 66 30 Q68 46 58 56 Q50 62 44 64 L44 70 Q62 74 62 100" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1.5"/>
      <path d="M18 40 Q16 28 24 16 Q30 8 40 7 Q50 7 52 10" fill="currentColor" fillOpacity="0.14"/>
      {/* Far eye (smaller) */}
      <ellipse cx="36" cy="32" rx="3.5" ry="2.5" {...G.feat}/>
      {/* Near eye */}
      <ellipse cx="52" cy="30" rx="5" ry="3" {...G.feat}/>
      {/* Nose */}
      <path d="M64 30 Q70 34 68 40 Q66 44 62 44" fill="none" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1.2"/>
      {/* Mouth */}
      <path d="M50 56 Q56 60 60 56" {...G.line}/>
    </svg>
  ),
  intraoral_frontal: (
    <svg viewBox="0 0 100 66" className="w-full h-full">
      {/* Upper arch */}
      <path d="M8 14 Q50 2 92 14 L92 22 Q50 10 8 22Z" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeOpacity="0.28" strokeWidth="1.5"/>
      {/* Lower arch */}
      <path d="M8 52 Q50 64 92 52 L92 44 Q50 56 8 44Z" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeOpacity="0.28" strokeWidth="1.5"/>
      {/* Cheek gingiva sides */}
      <line x1="8" y1="22" x2="8" y2="44" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1.5"/>
      <line x1="92" y1="22" x2="92" y2="44" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1.5"/>
      {/* Tooth dividers upper */}
      <line x1="50" y1="3" x2="50" y2="22" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1"/>
      <line x1="36" y1="6" x2="36" y2="22" stroke="currentColor" strokeOpacity="0.15" strokeWidth="0.8"/>
      <line x1="64" y1="6" x2="64" y2="22" stroke="currentColor" strokeOpacity="0.15" strokeWidth="0.8"/>
      <line x1="24" y1="10" x2="24" y2="22" stroke="currentColor" strokeOpacity="0.12" strokeWidth="0.8"/>
      <line x1="76" y1="10" x2="76" y2="22" stroke="currentColor" strokeOpacity="0.12" strokeWidth="0.8"/>
      {/* Tooth dividers lower */}
      <line x1="50" y1="44" x2="50" y2="63" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1"/>
      <line x1="36" y1="44" x2="36" y2="60" stroke="currentColor" strokeOpacity="0.15" strokeWidth="0.8"/>
      <line x1="64" y1="44" x2="64" y2="60" stroke="currentColor" strokeOpacity="0.15" strokeWidth="0.8"/>
      <line x1="24" y1="44" x2="24" y2="56" stroke="currentColor" strokeOpacity="0.12" strokeWidth="0.8"/>
      <line x1="76" y1="44" x2="76" y2="56" stroke="currentColor" strokeOpacity="0.12" strokeWidth="0.8"/>
      {/* Midline hint arrow at center */}
      <line x1="50" y1="26" x2="50" y2="40" stroke="#60a5fa" strokeOpacity="0.25" strokeWidth="1" strokeDasharray="2 2"/>
    </svg>
  ),
  intraoral_right: (
    <svg viewBox="0 0 100 66" className="w-full h-full">
      {/* Upper teeth row */}
      <path d="M6 12 Q55 4 94 14 L94 22 Q55 12 6 20Z" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeOpacity="0.28" strokeWidth="1.5"/>
      {/* Lower teeth row */}
      <path d="M6 54 Q55 62 94 52 L94 44 Q55 54 6 46Z" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeOpacity="0.28" strokeWidth="1.5"/>
      {/* Side walls */}
      <line x1="6" y1="20" x2="6" y2="46" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1.5"/>
      <line x1="94" y1="22" x2="94" y2="44" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1.5"/>
      {/* Individual tooth marks upper — molars are bigger */}
      <line x1="28" y1="16" x2="28" y2="20" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3"/>
      <line x1="50" y1="12" x2="50" y2="20" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3"/>
      <line x1="72" y1="14" x2="72" y2="20" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3"/>
      {/* Cusp bumps upper */}
      <path d="M6 20 Q17 14 28 20 Q39 14 50 20 Q61 14 72 20 Q83 14 94 20" fill="none" stroke="currentColor" strokeOpacity="0.18" strokeWidth="1"/>
      {/* Individual tooth marks lower */}
      <line x1="28" y1="44" x2="28" y2="50" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3"/>
      <line x1="50" y1="44" x2="50" y2="52" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3"/>
      <line x1="72" y1="44" x2="72" y2="50" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3"/>
      {/* R label */}
      <text x="7" y="38" fontSize="9" fontWeight="bold" fill="currentColor" fillOpacity="0.2" stroke="none">R</text>
    </svg>
  ),
  intraoral_left: (
    <svg viewBox="0 0 100 66" className="w-full h-full">
      <path d="M6 14 Q45 4 94 12 L94 20 Q45 12 6 22Z" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeOpacity="0.28" strokeWidth="1.5"/>
      <path d="M6 52 Q45 62 94 54 L94 46 Q45 54 6 44Z" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeOpacity="0.28" strokeWidth="1.5"/>
      <line x1="6" y1="22" x2="6" y2="44" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1.5"/>
      <line x1="94" y1="20" x2="94" y2="46" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1.5"/>
      <line x1="28" y1="16" x2="28" y2="22" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3"/>
      <line x1="50" y1="12" x2="50" y2="20" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3"/>
      <line x1="72" y1="14" x2="72" y2="20" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3"/>
      <path d="M6 22 Q17 16 28 22 Q39 16 50 20 Q61 16 72 20 Q83 16 94 20" fill="none" stroke="currentColor" strokeOpacity="0.18" strokeWidth="1"/>
      <line x1="28" y1="44" x2="28" y2="50" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3"/>
      <line x1="50" y1="44" x2="50" y2="52" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3"/>
      <line x1="72" y1="44" x2="72" y2="50" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3"/>
      <text x="84" y="38" fontSize="9" fontWeight="bold" fill="currentColor" fillOpacity="0.2" stroke="none">L</text>
    </svg>
  ),
  upper_occlusal: (
    <svg viewBox="0 0 100 80" className="w-full h-full">
      {/* Palate outer arch */}
      <path d="M50 8 Q82 8 90 30 Q90 55 50 62 Q10 55 10 30 Q18 8 50 8Z" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeOpacity="0.28" strokeWidth="1.5"/>
      {/* Palate inner ridge */}
      <path d="M50 18 Q70 18 76 32 Q76 48 50 54 Q24 48 24 32 Q30 18 50 18Z" fill="none" stroke="currentColor" strokeOpacity="0.18" strokeWidth="1"/>
      {/* Median suture */}
      <line x1="50" y1="8" x2="50" y2="62" stroke="currentColor" strokeOpacity="0.15" strokeWidth="0.8" strokeDasharray="2 2"/>
      {/* Teeth - upper incisors front */}
      <rect x="38" y="8" width="12" height="10" rx="2" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeOpacity="0.2" strokeWidth="0.8"/>
      <line x1="44" y1="8" x2="44" y2="18" stroke="currentColor" strokeOpacity="0.2" strokeWidth="0.8"/>
      {/* Lateral incisors */}
      <rect x="29" y="9" width="9" height="9" rx="1.5" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeOpacity="0.18" strokeWidth="0.8"/>
      <rect x="50" y="9" width="9" height="9" rx="1.5" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeOpacity="0.18" strokeWidth="0.8"/>
      {/* Canines */}
      <ellipse cx="24" cy="18" rx="5" ry="4" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeOpacity="0.2" strokeWidth="0.8"/>
      <ellipse cx="76" cy="18" rx="5" ry="4" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeOpacity="0.2" strokeWidth="0.8"/>
      {/* Premolars */}
      <rect x="14" y="24" width="10" height="9" rx="2" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeOpacity="0.18" strokeWidth="0.8"/>
      <rect x="76" y="24" width="10" height="9" rx="2" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeOpacity="0.18" strokeWidth="0.8"/>
      {/* Molars */}
      <rect x="11" y="36" width="12" height="12" rx="2" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeOpacity="0.18" strokeWidth="0.8"/>
      <rect x="77" y="36" width="12" height="12" rx="2" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeOpacity="0.18" strokeWidth="0.8"/>
    </svg>
  ),
  lower_occlusal: (
    <svg viewBox="0 0 100 80" className="w-full h-full">
      {/* Tongue space outer */}
      <path d="M50 72 Q82 72 90 50 Q90 25 50 18 Q10 25 10 50 Q18 72 50 72Z" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeOpacity="0.28" strokeWidth="1.5"/>
      {/* Inner arch */}
      <path d="M50 62 Q70 62 76 48 Q76 32 50 26 Q24 32 24 48 Q30 62 50 62Z" fill="none" stroke="currentColor" strokeOpacity="0.18" strokeWidth="1"/>
      <line x1="50" y1="18" x2="50" y2="72" stroke="currentColor" strokeOpacity="0.15" strokeWidth="0.8" strokeDasharray="2 2"/>
      {/* Incisors */}
      <rect x="38" y="62" width="12" height="10" rx="2" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeOpacity="0.2" strokeWidth="0.8"/>
      <line x1="44" y1="62" x2="44" y2="72" stroke="currentColor" strokeOpacity="0.2" strokeWidth="0.8"/>
      <rect x="29" y="62" width="9" height="9" rx="1.5" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeOpacity="0.18" strokeWidth="0.8"/>
      <rect x="50" y="62" width="9" height="9" rx="1.5" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeOpacity="0.18" strokeWidth="0.8"/>
      <ellipse cx="24" cy="62" rx="5" ry="4" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeOpacity="0.2" strokeWidth="0.8"/>
      <ellipse cx="76" cy="62" rx="5" ry="4" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeOpacity="0.2" strokeWidth="0.8"/>
      <rect x="14" y="47" width="10" height="9" rx="2" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeOpacity="0.18" strokeWidth="0.8"/>
      <rect x="76" y="47" width="10" height="9" rx="2" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeOpacity="0.18" strokeWidth="0.8"/>
      <rect x="11" y="32" width="12" height="12" rx="2" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeOpacity="0.18" strokeWidth="0.8"/>
      <rect x="77" y="32" width="12" height="12" rx="2" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeOpacity="0.18" strokeWidth="0.8"/>
    </svg>
  ),
  panoramic: (
    <svg viewBox="0 0 120 68" className="w-full h-full">
      {/* Skull outline */}
      <path d="M8 34 Q14 8 60 6 Q106 8 112 34 Q106 62 60 64 Q14 62 8 34Z" fill="currentColor" fillOpacity="0.07" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1.5"/>
      {/* Upper jaw arch */}
      <path d="M22 26 Q40 12 60 12 Q80 12 98 26" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1.5"/>
      {/* Lower jaw arch */}
      <path d="M22 42 Q40 56 60 56 Q80 56 98 42" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1.5"/>
      {/* Upper teeth */}
      {[28,35,42,49,60,67,74,81,88].map((x,i) => (
        <rect key={i} x={x-3} y={15} width={6} height={10} rx="1" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeOpacity="0.18" strokeWidth="0.7"/>
      ))}
      {/* Lower teeth */}
      {[28,35,42,49,60,67,74,81,88].map((x,i) => (
        <rect key={i} x={x-3} y={43} width={6} height={10} rx="1" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeOpacity="0.18" strokeWidth="0.7"/>
      ))}
      {/* Condyles */}
      <ellipse cx="16" cy="20" rx="5" ry="7" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1"/>
      <ellipse cx="104" cy="20" rx="5" ry="7" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1"/>
      {/* Sinus */}
      <path d="M34 10 Q40 6 46 10 Q46 18 40 18 Q34 18 34 10Z" fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="0.8"/>
      <path d="M74 10 Q80 6 86 10 Q86 18 80 18 Q74 18 74 10Z" fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="0.8"/>
    </svg>
  ),
  cephalometric: (
    <svg viewBox="0 0 80 96" className="w-full h-full">
      {/* Cranium */}
      <path d="M40 6 Q68 8 72 32 Q74 50 60 62 Q52 68 40 70 L40 82 L28 82" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeOpacity="0.28" strokeWidth="1.5"/>
      {/* Face */}
      <path d="M40 6 Q22 8 18 24 Q14 40 22 54 Q30 64 40 70" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeOpacity="0.28" strokeWidth="1.5"/>
      {/* Sella */}
      <circle cx="46" cy="28" r="3.5" fill="currentColor" fillOpacity="0.22" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1"/>
      {/* Orbit */}
      <path d="M28 26 Q32 22 40 23 Q46 22 48 26 Q48 32 40 33 Q32 32 28 26Z" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1.2"/>
      {/* Nasion */}
      <circle cx="26" cy="26" r="2" fill="currentColor" fillOpacity="0.25"/>
      {/* ANS */}
      <circle cx="16" cy="52" r="2" fill="currentColor" fillOpacity="0.25"/>
      {/* Pogonion */}
      <circle cx="24" cy="78" r="2" fill="currentColor" fillOpacity="0.25"/>
      {/* N-A line */}
      <line x1="26" y1="26" x2="16" y2="52" stroke="currentColor" strokeOpacity="0.18" strokeWidth="1" strokeDasharray="2 2"/>
      {/* S-N line */}
      <line x1="46" y1="28" x2="26" y2="26" stroke="currentColor" strokeOpacity="0.18" strokeWidth="1" strokeDasharray="2 2"/>
      {/* Mandible outline */}
      <path d="M24 54 Q18 66 20 78 Q22 86 40 82" fill="none" stroke="currentColor" strokeOpacity="0.22" strokeWidth="1.2"/>
      {/* Spine/cervical */}
      <path d="M68 60 L68 90" stroke="currentColor" strokeOpacity="0.15" strokeWidth="3" strokeLinecap="round"/>
      <line x1="60" y1="66" x2="76" y2="66" stroke="currentColor" strokeOpacity="0.15" strokeWidth="1"/>
      <line x1="60" y1="74" x2="76" y2="74" stroke="currentColor" strokeOpacity="0.15" strokeWidth="1"/>
      <line x1="60" y1="82" x2="76" y2="82" stroke="currentColor" strokeOpacity="0.15" strokeWidth="1"/>
    </svg>
  ),
  ceph_raw: (
    <svg viewBox="0 0 80 96" className="w-full h-full">
      {/* Cranium */}
      <path d="M40 6 Q68 8 72 32 Q74 50 60 62 Q52 68 40 70 L40 82 L28 82" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeOpacity="0.28" strokeWidth="1.5"/>
      <path d="M40 6 Q22 8 18 24 Q14 40 22 54 Q30 64 40 70" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeOpacity="0.28" strokeWidth="1.5"/>
      <circle cx="46" cy="28" r="3.5" fill="currentColor" fillOpacity="0.22"/>
      <path d="M28 26 Q40 22 48 26 Q48 32 40 33 Q32 32 28 26Z" fill="none" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1.2"/>
      {/* Scale/ruler border */}
      <rect x="2" y="2" width="76" height="92" rx="2" fill="none" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1.5"/>
      {/* Scale marks */}
      {[12,22,32,42,52,62,72,82].map((y,i)=>(
        <line key={i} x1="2" y1={y} x2="7" y2={y} stroke="currentColor" strokeOpacity="0.18" strokeWidth="1"/>
      ))}
      {[12,22,32,42,52,62].map((x,i)=>(
        <line key={i} x1={x} y1="2" x2={x} y2="7" stroke="currentColor" strokeOpacity="0.18" strokeWidth="1"/>
      ))}
    </svg>
  ),
  wrist: (
    <svg viewBox="0 0 80 100" className="w-full h-full">
      {/* Radius bone */}
      <path d="M30 90 L28 52 Q27 44 30 36 Q32 30 34 28" fill="none" stroke="currentColor" strokeOpacity="0.28" strokeWidth="8" strokeLinecap="round"/>
      {/* Ulna bone */}
      <path d="M50 90 L50 52 Q50 44 48 36 Q46 30 44 28" fill="none" stroke="currentColor" strokeOpacity="0.22" strokeWidth="7" strokeLinecap="round"/>
      {/* Wrist joint */}
      <ellipse cx="40" cy="28" rx="16" ry="6" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1.5"/>
      {/* Carpal bones (proximal row) */}
      <rect x="18" y="16" width="10" height="10" rx="2" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeOpacity="0.22" strokeWidth="1"/>
      <rect x="30" y="14" width="10" height="10" rx="2" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeOpacity="0.22" strokeWidth="1"/>
      <rect x="42" y="14" width="10" height="10" rx="2" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeOpacity="0.22" strokeWidth="1"/>
      <rect x="54" y="16" width="8" height="9" rx="2" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeOpacity="0.22" strokeWidth="1"/>
      {/* Distal row + metacarpals */}
      <rect x="16" y="4" width="8" height="10" rx="2" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeOpacity="0.18" strokeWidth="1"/>
      <rect x="27" y="2" width="9" height="10" rx="2" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeOpacity="0.18" strokeWidth="1"/>
      <rect x="39" y="2" width="9" height="10" rx="2" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeOpacity="0.18" strokeWidth="1"/>
      <rect x="51" y="4" width="8" height="9" rx="2" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeOpacity="0.18" strokeWidth="1"/>
      {/* Wrist bone growth plate lines */}
      <line x1="27" y1="52" x2="33" y2="52" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1.5"/>
      <line x1="47" y1="52" x2="53" y2="52" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1.5"/>
    </svg>
  ),
  cover: (
    <svg viewBox="0 0 80 108" className="w-full h-full">
      {/* Shoulders */}
      <path d="M2 108 Q4 82 24 76 Q30 73 33 71 L33 68 L47 68 L47 71 Q50 73 56 76 Q76 82 78 108Z" {...G.face}/>
      {/* Neck */}
      <path d="M33 58 Q32 64 33 68 L47 68 Q48 64 47 58Z" {...G.face}/>
      {/* Face */}
      <path d="M40 6 Q58 6 63 26 Q66 42 62 54 Q58 64 40 66 Q22 64 18 54 Q14 42 17 26 Q22 6 40 6Z" {...G.face}/>
      {/* Hair — topuz */}
      <ellipse cx="40" cy="5" rx="7" ry="4.5" {...G.hair}/>
      <path d="M17 26 Q15 14 22 9 Q30 4 40 4 Q50 4 58 9 Q65 14 63 26 Q59 8 40 7 Q21 8 17 26Z" {...G.hair}/>
      {/* Ear L */}
      <path d="M17 32 Q11 33 11 39 Q11 45 17 46 Q17 44 14 39 Q14 35 17 34Z" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeOpacity="0.18" strokeWidth="1"/>
      {/* Ear R */}
      <path d="M63 32 Q69 33 69 39 Q69 45 63 46 Q63 44 66 39 Q66 35 63 34Z" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeOpacity="0.18" strokeWidth="1"/>
      {/* Brows */}
      <path d="M23 27 Q29 23 35 25" fill="none" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M45 25 Q51 23 57 27" fill="none" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1.4" strokeLinecap="round"/>
      {/* Eyes */}
      <path d="M23 33 Q26 30 30 31 Q34 30 37 33 Q34 36 30 36 Q26 36 23 33Z" fill="currentColor" fillOpacity="0.13" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1"/>
      <circle cx="30" cy="33" r="2" fill="currentColor" fillOpacity="0.18"/>
      <path d="M43 33 Q46 30 50 31 Q54 30 57 33 Q54 36 50 36 Q46 36 43 33Z" fill="currentColor" fillOpacity="0.13" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1"/>
      <circle cx="50" cy="33" r="2" fill="currentColor" fillOpacity="0.18"/>
      {/* Nose */}
      <path d="M40 36 L39 44 Q37 48 38 50 Q40 52 42 50 Q43 48 41 44 L40 36" fill="none" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1.1" strokeLinecap="round"/>
      {/* Closed lips neutral */}
      <path d="M32 56 Q36 54 40 55 Q44 54 48 56" fill="none" stroke="currentColor" strokeOpacity="0.28" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M32 56 Q36 60 40 60 Q44 60 48 56" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeOpacity="0.18" strokeWidth="1"/>
    </svg>
  ),
}

// ── Draggable bulk thumbnail ─────────────────────────────────────────────────
function BulkThumb({ item, onRemove }) {
  const handleDragStart = (e) => {
    e.dataTransfer.setData('text/plain', 'bulk:' + item.id)
    e.dataTransfer.effectAllowed = 'copy'
  }
  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="relative group cursor-grab active:cursor-grabbing flex-shrink-0"
      style={{ width: 130 }}
    >
      <img src={item.url} alt={item.file.name} className="w-full h-28 object-cover rounded-xl border border-white/10 shadow-md group-hover:border-accent-blue/40 transition-all" />
      <div className="absolute inset-0 rounded-xl bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
        <span className="text-[9px] text-white font-semibold bg-black/50 px-1.5 py-0.5 rounded">Sürükle</span>
      </div>
      <button
        onClick={() => onRemove(item.id)}
        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
      >✕</button>
      <p className="text-[9px] text-center text-dark-400 mt-1 truncate leading-tight px-1">{item.file.name}</p>
    </div>
  )
}

// ── Bulk upload zone ─────────────────────────────────────────────────────────
function BulkUploadPanel({ bulkFiles, onFilesAdded, onFileRemove }) {
  const [dragging, setDragging] = useState(false)
  const ref = useRef(null)

  const stop = (e) => { e.preventDefault(); e.stopPropagation() }
  const onDrop = (e) => {
    stop(e); setDragging(false)
    if (e.dataTransfer.files?.length) onFilesAdded(e.dataTransfer.files)
  }
  const onChange = (e) => {
    if (e.target.files?.length) { onFilesAdded(e.target.files); e.target.value = '' }
  }

  return (
    <div className="glass-card p-4 mb-4" style={{ position: 'sticky', top: 4, zIndex: 20 }}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <svg className="w-3.5 h-3.5 text-accent-blue flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
        <span className="text-xs font-semibold text-dark-300">Toplu Yükle → Sürükle</span>
        {bulkFiles.length > 0 && (
          <span className="ml-auto text-[10px] text-dark-500">{bulkFiles.length} fotoğraf hazır</span>
        )}
      </div>

      {/* Drop zone */}
      <div
        className={`rounded-lg border-2 border-dashed cursor-pointer transition-all flex items-center gap-3 px-4 py-3 ${
          dragging ? 'border-accent-blue/70 bg-accent-blue/5' : 'border-white/10 hover:border-white/20 hover:bg-white/2'
        }`}
        onDragEnter={(e) => { stop(e); setDragging(true) }}
        onDragLeave={(e) => { stop(e); setDragging(false) }}
        onDragOver={stop}
        onDrop={onDrop}
        onClick={() => ref.current?.click()}
      >
        <input ref={ref} type="file" accept="image/*" multiple className="hidden" onChange={onChange} />
        <svg className="w-7 h-7 text-dark-600 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
        </svg>
        <div>
          <p className="text-[11px] font-medium text-dark-400">Tüm fotoğrafları buraya sürükleyin veya tıklayın</p>
          <p className="text-[10px] text-dark-600 mt-0.5">Yüklenen görüntüleri aşağıdaki kutulara sürükleyerek yerleştirin</p>
        </div>
      </div>

      {/* Thumbnails */}
      {bulkFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-white/5">
          {bulkFiles.map(item => (
            <BulkThumb key={item.id} item={item} onRemove={onFileRemove} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Individual slot drop zone ────────────────────────────────────────────────
function SlotZone({ slot, imageFile, onDrop, onRemove, onBulkDrop, onPreview, onRotate }) {
  const [dragging, setDragging] = useState(false)
  const ref = useRef(null)
  const preview = imageFile ? URL.createObjectURL(imageFile) : null
  const stop = (e) => { e.preventDefault(); e.stopPropagation() }
  const borderCls = GROUP_BORDER[slot.group] || 'border-white/10'

  const handleRotate = useCallback((e) => {
    e.stopPropagation()
    if (!imageFile) return
    const url = URL.createObjectURL(imageFile)
    const img = new window.Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.height
      canvas.height = img.width
      const ctx = canvas.getContext('2d')
      ctx.translate(canvas.width / 2, canvas.height / 2)
      ctx.rotate(Math.PI / 2)
      ctx.drawImage(img, -img.width / 2, -img.height / 2)
      URL.revokeObjectURL(url)
      canvas.toBlob(blob => {
        if (blob) {
          const name = imageFile.name.replace(/\.[^.]+$/, '') + '.jpg'
          onRotate(slot.key, new File([blob], name, { type: 'image/jpeg' }))
        }
      }, 'image/jpeg', 0.95)
    }
    img.src = url
  }, [imageFile, slot.key, onRotate])

  const handleDrop = useCallback((e) => {
    stop(e); setDragging(false)
    const text = e.dataTransfer.getData('text/plain')
    if (text?.startsWith('bulk:')) {
      onBulkDrop?.(slot.key, text.slice(5))
    } else if (e.dataTransfer.files?.[0]) {
      onDrop(slot.key, e.dataTransfer.files[0])
    }
  }, [slot.key, onDrop, onBulkDrop])

  return (
    <div
      className={`relative rounded-lg border transition-all overflow-hidden
        ${dragging ? 'border-accent-blue/60 bg-accent-blue/5 scale-[1.02]' : `${borderCls} hover:border-white/20`}
        ${preview ? 'bg-transparent cursor-zoom-in' : 'bg-white/2 hover:bg-white/4 cursor-pointer'}`}
      style={{ aspectRatio: '4/3' }}
      onDragEnter={(e) => { stop(e); setDragging(true) }}
      onDragLeave={(e) => { stop(e); setDragging(false) }}
      onDragOver={stop}
      onDrop={handleDrop}
      onClick={() => preview ? onPreview({ url: preview, label: slot.label }) : ref.current?.click()}
    >
      <input ref={ref} type="file" accept="image/*" className="hidden"
        onChange={(e) => { if (e.target.files?.[0]) { onDrop(slot.key, e.target.files[0]); e.target.value = '' } }} />

      {preview ? (
        <>
          <img src={preview} alt={slot.label} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors" />
          {/* Action buttons — top-right, always visible */}
          <div className="absolute top-1 right-1 flex gap-1">
            <button
              onClick={handleRotate}
              className="w-5 h-5 rounded-full bg-blue-600/80 hover:bg-blue-500 text-white text-[10px] flex items-center justify-center shadow"
              title="90° Döndür"
            >↻</button>
            <button
              onClick={(e) => { e.stopPropagation(); ref.current?.click() }}
              className="w-5 h-5 rounded-full bg-ortho-600/80 hover:bg-ortho-500 text-white text-[8px] flex items-center justify-center shadow"
              title="Değiştir"
            >↑</button>
            <button
              onClick={(e) => { e.stopPropagation(); onRemove(slot.key) }}
              className="w-5 h-5 rounded-full bg-red-500/80 hover:bg-red-500 text-white text-[9px] flex items-center justify-center shadow"
              title="Kaldır"
            >✕</button>
          </div>
          {/* Label bar */}
          <div className="absolute bottom-0 left-0 right-0 px-1.5 py-0.5 bg-gradient-to-t from-black/80 to-transparent">
            <p className="text-[9px] text-white/90 font-medium truncate">{slot.label}</p>
          </div>
        </>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-between p-2 text-center">
          {/* Ghost illustration */}
          <div className={`flex-1 w-full flex items-center justify-center text-white`} style={{ minHeight: 0 }}>
            {SLOT_GHOST[slot.key] || (
              <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-full h-full opacity-20">
                <rect x="8" y="8" width="48" height="48" rx="4"/>
                <circle cx="22" cy="26" r="5"/><polyline points="8 48 22 34 32 44 42 34 56 48"/>
              </svg>
            )}
          </div>
          {/* Info bottom */}
          <div className="w-full mt-1 space-y-0.5">
            <p className="text-[12px] font-bold text-white/80 leading-tight">{slot.label}</p>
            <span className={`inline-block text-[8px] font-semibold px-1.5 py-0.5 rounded-full ${GROUP_STYLE[slot.group]}`}>
              {slot.slideInfo}
            </span>
            <p className="text-[8px] text-dark-600 mt-0.5">sürükle veya tıkla</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Lightbox modal with scroll-to-zoom ──────────────────────────────────────
function Lightbox({ item, onClose }) {
  const [scale, setScale] = useState(1)
  const [pan, setPan]     = useState({ x: 0, y: 0 })
  const isDragging        = useRef(false)
  const dragStart         = useRef({ x: 0, y: 0, px: 0, py: 0 })

  // Reset on image change
  useEffect(() => { setScale(1); setPan({ x: 0, y: 0 }) }, [item])

  if (!item) return null

  const handleWheel = (e) => {
    e.preventDefault()
    const delta = e.deltaY < 0 ? 1.15 : 1 / 1.15
    setScale(s => Math.max(0.5, Math.min(8, s * delta)))
  }

  const handleMouseDown = (e) => {
    if (scale <= 1) return
    e.preventDefault()
    isDragging.current = true
    dragStart.current  = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y }
  }
  const handleMouseMove = (e) => {
    if (!isDragging.current) return
    setPan({
      x: dragStart.current.px + (e.clientX - dragStart.current.x),
      y: dragStart.current.py + (e.clientY - dragStart.current.y),
    })
  }
  const handleMouseUp = () => { isDragging.current = false }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
      onClick={onClose}
      onWheel={handleWheel}
      style={{ userSelect: 'none' }}
    >
      <div
        className="relative flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: scale > 1 ? (isDragging.current ? 'grabbing' : 'grab') : 'default' }}
      >
        <img
          src={item.url}
          alt={item.label}
          draggable={false}
          style={{
            display: 'block',
            maxWidth: '90vw', maxHeight: '88vh',
            objectFit: 'contain',
            borderRadius: 12,
            boxShadow: '0 20px 60px rgba(0,0,0,0.9)',
            transform: `scale(${scale}) translate(${pan.x / scale}px, ${pan.y / scale}px)`,
            transition: isDragging.current ? 'none' : 'transform 0.12s ease',
          }}
        />
        <p className="mt-2 text-sm font-semibold text-white/70">{item.label}</p>
        {/* Zoom hint */}
        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
          Kaydırarak yakınlaştır{scale > 1 ? ` · ${Math.round(scale * 100)}%` : ''}
        </p>
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-dark-800 border border-white/10 text-white/70 hover:text-white flex items-center justify-center text-sm shadow-lg"
        >✕</button>
        {scale > 1 && (
          <button
            onClick={(e) => { e.stopPropagation(); setScale(1); setPan({ x: 0, y: 0 }) }}
            style={{ position: 'absolute', bottom: 36, left: '50%', transform: 'translateX(-50%)', fontSize: 11, padding: '4px 12px', borderRadius: 6, background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer' }}
          >Sıfırla</button>
        )}
      </div>
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────
export default function ImageGrid({ images, onImageDrop, onImageRemove, onImageRotate, onReset }) {
  const [bulkFiles, setBulkFiles] = useState([])
  const [lightbox, setLightbox] = useState(null)
  const nextId = useRef(0)
  const bulkSlotMap = useRef({}) // slotKey → bulkItem (tracks bulk-originated slots)

  const addBulkFiles = useCallback((fileList) => {
    const items = Array.from(fileList).map(f => ({
      id: String(nextId.current++),
      file: f,
      url: URL.createObjectURL(f),
    }))
    setBulkFiles(prev => [...prev, ...items])
  }, [])

  const removeBulkFile = useCallback((id) => {
    setBulkFiles(prev => {
      const item = prev.find(x => x.id === id)
      if (item) URL.revokeObjectURL(item.url)
      return prev.filter(x => x.id !== id)
    })
  }, [])

  const handleBulkDrop = useCallback((slotKey, bulkId) => {
    const item = bulkFiles.find(x => x.id === bulkId)
    if (item) {
      bulkSlotMap.current[slotKey] = item
      onImageDrop(slotKey, item.file)
      removeBulkFile(bulkId)
    }
  }, [bulkFiles, onImageDrop, removeBulkFile])

  const handleSlotDrop = useCallback((slotKey, file) => {
    // Direct drop clears any bulk tracking for this slot
    delete bulkSlotMap.current[slotKey]
    onImageDrop(slotKey, file)
  }, [onImageDrop])

  const handleSlotRemove = useCallback((slotKey) => {
    const bulkItem = bulkSlotMap.current[slotKey]
    if (bulkItem) {
      delete bulkSlotMap.current[slotKey]
      const newUrl = URL.createObjectURL(bulkItem.file)
      setBulkFiles(prev => [...prev, { ...bulkItem, url: newUrl }])
    }
    onImageRemove(slotKey)
  }, [onImageRemove])

  // Count assigned images per group for the header badges
  const assignedCount = IMAGE_SLOTS.filter(s => images[s.key]).length

  return (
    <>
      <Lightbox item={lightbox} onClose={() => setLightbox(null)} />

      <div className="glass-card p-4 animate-slide-up">
        {/* Section header */}
        <div className="flex items-center gap-2 mb-4">
          <div className="section-title mb-0">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
            Klinik Fotoğraflar
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[10px] text-dark-500">{assignedCount}/{IMAGE_SLOTS.length} atandı</span>
            {assignedCount > 0 && (
              <button
                onClick={onReset}
                className="text-[10px] text-red-400/70 hover:text-red-400 border border-red-400/20 hover:border-red-400/50 rounded px-2 py-0.5 transition-colors"
                title="Tüm fotoğrafları temizle"
              >Tümünü Temizle</button>
            )}
          </div>
        </div>

        {/* Bulk upload */}
        <BulkUploadPanel
          bulkFiles={bulkFiles}
          onFilesAdded={addBulkFiles}
          onFileRemove={removeBulkFile}
        />

        {/* 5-column grid */}
        <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(5, minmax(0, 1fr))' }}>
          {IMAGE_SLOTS.map(slot => (
            <SlotZone
              key={slot.key}
              slot={slot}
              imageFile={images[slot.key]}
              onDrop={handleSlotDrop}
              onRemove={handleSlotRemove}
              onBulkDrop={handleBulkDrop}
              onPreview={setLightbox}
              onRotate={onImageRotate}
            />
          ))}
        </div>

        {/* Group legend */}
        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-white/5">
          {Object.entries(GROUP_STYLE).map(([name, cls]) => (
            <span key={name} className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${cls}`}>{name}</span>
          ))}
        </div>
      </div>
    </>
  )
}
