export default function CephTable({ evaluated, hasData }) {
  if (!hasData) {
    return (
      <div className="glass-card p-5 animate-slide-up">
        <div className="section-title">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 3h18v18H3z"/>
            <path d="M3 9h18"/>
            <path d="M3 15h18"/>
            <path d="M9 3v18"/>
          </svg>
          Sefalometrik Analiz
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-dark-400">
          <svg className="w-16 h-16 mb-4 opacity-20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
          <p className="text-sm font-medium">Veri yüklenmedi</p>
          <p className="text-xs text-dark-500 mt-1">Excel dosyası yükleyerek değerleri görüntüleyin</p>
        </div>
      </div>
    )
  }

  // Group by category
  const skeletalSagittal = evaluated.filter(e =>
    ['SNA', 'SNB', 'ANB', 'Wits', 'A-Nperp', 'Pog-Nperp', 'Co-A', 'Co-Gn', 'MaxMandDiff', 'FacialAngle'].includes(e.key)
  )
  const skeletalVertical = evaluated.filter(e =>
    ['GoGn-SN', 'FMA', 'SN-PP', 'PP-MP', 'Y-Axis', 'SumOfAngles', 'Gonial', 'UpperGonial', 'LowerGonial', 'UFH', 'LFH', 'PFH-AFH', 'AFH', 'PFH'].includes(e.key)
  )
  const dental = evaluated.filter(e =>
    ['U1-NA_deg', 'U1-NA_mm', 'L1-NB_deg', 'L1-NB_mm', 'IMPA', 'U1-SN', 'InterIncisal', 'Overjet', 'Overbite'].includes(e.key)
  )
  const softTissue = evaluated.filter(e =>
    ['Nasolabial', 'E-Line_Upper', 'E-Line_Lower', 'H-Line', 'S-Line_Upper', 'S-Line_Lower'].includes(e.key)
  )

  const sections = [
    { title: 'İskeletsel (Sagittal)', data: skeletalSagittal, color: 'text-violet-400' },
    { title: 'İskeletsel (Vertikal)', data: skeletalVertical, color: 'text-sky-400' },
    { title: 'Dental', data: dental, color: 'text-amber-400' },
    { title: 'Yumuşak Doku', data: softTissue, color: 'text-emerald-400' },
  ]

  const abnormalCount = evaluated.filter(e => e.status !== 'normal').length

  return (
    <div className="glass-card p-5 animate-slide-up">
      <div className="section-title">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 3h18v18H3z"/>
          <path d="M3 9h18"/>
          <path d="M3 15h18"/>
          <path d="M9 3v18"/>
        </svg>
        Sefalometrik Analiz
        <span className="ml-auto text-[10px] font-semibold text-dark-400 after:hidden">
          {abnormalCount > 0 && (
            <span className="bg-red-500/15 text-red-400 px-2 py-0.5 rounded-full">
              {abnormalCount} anormal
            </span>
          )}
        </span>
      </div>

      <div className="max-h-[560px] overflow-y-auto pr-1" style={{ scrollbarGutter: 'stable' }}>
        {sections.map(section => (
          section.data.length > 0 && (
            <div key={section.title} className="mb-4">
              <h4 className={`text-[11px] font-bold uppercase tracking-wider mb-2 ${section.color}`}>
                {section.title}
              </h4>
              <table className="ceph-table">
                <thead>
                  <tr>
                    <th>Ölçüm</th>
                    <th>Değer</th>
                    <th>Referans</th>
                    <th>Durum</th>
                  </tr>
                </thead>
                <tbody>
                  {section.data.map(item => (
                    <tr key={item.key} className={item.status !== 'normal' ? 'bg-white/[0.01]' : ''}>
                      <td className="font-medium text-dark-200">{item.name}</td>
                      <td className={`font-mono font-bold ${
                        item.status === 'high' ? 'status-high' :
                        item.status === 'low' ? 'status-low' :
                        'status-normal'
                      }`}>
                        {item.value}{item.unit}
                      </td>
                      <td className="text-dark-400 font-mono text-xs">
                        {item.low}—{item.high}{item.unit}
                      </td>
                      <td>
                        {item.status === 'high' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/15 text-red-400">
                            ▲ Yüksek
                          </span>
                        )}
                        {item.status === 'low' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-400">
                            ▼ Düşük
                          </span>
                        )}
                        {item.status === 'normal' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/12 text-emerald-400">
                            ● Normal
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ))}
      </div>
    </div>
  )
}
