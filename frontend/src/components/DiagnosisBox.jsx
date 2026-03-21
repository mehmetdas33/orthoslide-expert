export default function DiagnosisBox({ diagnosis, hasData }) {
  if (!hasData || !diagnosis) {
    return (
      <div className="diagnosis-card p-5 animate-slide-up">
        <div className="section-title">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
          </svg>
          Oto-Teşhis
        </div>
        <div className="flex items-center gap-3 py-6 text-dark-400">
          <div className="w-10 h-10 rounded-full bg-dark-800 flex items-center justify-center">
            <svg className="w-5 h-5 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium">Teşhis bekleniyor</p>
            <p className="text-xs text-dark-500">Excel verisi yüklendiğinde otomatik oluşturulacak</p>
          </div>
        </div>
      </div>
    )
  }

  const diagItems = [
    {
      label: 'İskeletsel Sınıf',
      value: diagnosis.skeletal_class,
      icon: '🦴',
      color: diagnosis.skeletal_class?.includes('II') ? 'text-red-400' :
             diagnosis.skeletal_class?.includes('III') ? 'text-blue-400' :
             'text-emerald-400',
      bgColor: diagnosis.skeletal_class?.includes('II') ? 'bg-red-500/10 border-red-500/20' :
               diagnosis.skeletal_class?.includes('III') ? 'bg-blue-500/10 border-blue-500/20' :
               'bg-emerald-500/10 border-emerald-500/20',
    },
    {
      label: 'Büyüme Paterni',
      value: diagnosis.growth_pattern,
      icon: '📐',
      color: diagnosis.growth_pattern?.includes('Hiper') ? 'text-orange-400' :
             diagnosis.growth_pattern?.includes('Hipo') ? 'text-cyan-400' :
             'text-emerald-400',
      bgColor: diagnosis.growth_pattern?.includes('Hiper') ? 'bg-orange-500/10 border-orange-500/20' :
               diagnosis.growth_pattern?.includes('Hipo') ? 'bg-cyan-500/10 border-cyan-500/20' :
               'bg-emerald-500/10 border-emerald-500/20',
    },
    {
      label: 'Dental Bulgular',
      value: diagnosis.dental_summary,
      icon: '🦷',
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10 border-amber-500/20',
    },
    {
      label: 'Yumuşak Doku',
      value: diagnosis.soft_tissue_summary,
      icon: '👄',
      color: 'text-pink-400',
      bgColor: 'bg-pink-500/10 border-pink-500/20',
    },
  ]

  return (
    <div className="diagnosis-card p-5 animate-slide-up">
      <div className="section-title">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
        </svg>
        Oto-Teşhis
      </div>

      <div className="space-y-3">
        {diagItems.map((item, i) => (
          item.value && (
            <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border ${item.bgColor} animate-fade-in`}
                 style={{ animationDelay: `${i * 100}ms` }}>
              <span className="text-lg mt-0.5">{item.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-dark-400 mb-0.5">{item.label}</p>
                <p className={`text-sm font-semibold ${item.color}`}>{item.value}</p>
              </div>
            </div>
          )
        ))}
      </div>

      {/* Full Summary */}
      {diagnosis.full_text && (
        <div className="mt-4 pt-4 border-t border-white/5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-dark-500 mb-2">Özet</p>
          <p className="text-xs text-dark-300 leading-relaxed">{diagnosis.full_text}</p>
        </div>
      )}
    </div>
  )
}
