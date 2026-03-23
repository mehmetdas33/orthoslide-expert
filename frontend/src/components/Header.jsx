import { useState } from 'react'

const field = {
  wrapper: 'flex flex-col gap-1',
  label: 'text-[10px] font-semibold uppercase tracking-wider text-white/35 pl-0.5',
  input: 'bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white/90 placeholder-white/20 focus:outline-none focus:border-ortho-500/60 focus:bg-white/8 focus:ring-1 focus:ring-ortho-500/20 transition-all',
}

export default function Header({ patientInfo, onPatientInfoChange, onGenerate, isGenerating, hasData, imageCount, statusMessage }) {
  return (
    <header className="glass-card animate-fade-in" style={{ maxWidth: '1600px', margin: '0 auto' }}>

      {/* ── Top bar: logo + generate ── */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-ortho-500 to-ortho-700 flex items-center justify-center shadow-lg shadow-ortho-500/25 flex-shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight">
              <span className="text-white/50">Bezmialem </span>
              <span className="bg-gradient-to-r from-ortho-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent">OrthoSlide Expert</span>
            </h1>
            <p className="text-[10px] text-white/25 tracking-wide">Ortodontik Sunum Otomasyonu v2.0</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${hasData ? 'bg-emerald-500/12 text-emerald-400 border border-emerald-500/20' : 'bg-white/4 text-white/25 border border-white/8'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${hasData ? 'bg-emerald-400' : 'bg-white/20'}`}/>
              {hasData ? 'Veri Hazır' : 'Veri Yok'}
            </div>
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${imageCount > 0 ? 'bg-ortho-500/12 text-ortho-400 border border-ortho-500/20' : 'bg-white/4 text-white/25 border border-white/8'}`}>
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
              </svg>
              {imageCount}/12 Fotoğraf
            </div>
          </div>

          <button
            id="generate-btn"
            onClick={onGenerate}
            disabled={isGenerating || !hasData}
            className="btn-primary"
          >
            {isGenerating ? (
              <>
                <svg className="w-4 h-4 spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" opacity="0.3"/>
                  <path d="M12 2a10 10 0 0 1 10 10"/>
                </svg>
                Oluşturuluyor...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                PPTX Oluştur
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Patient info row ── */}
      <div className="px-5 py-3 flex flex-wrap gap-x-4 gap-y-3 items-end">

        {/* Hasta */}
        <div className={field.wrapper} style={{ minWidth: 148 }}>
          <label className={field.label}>Hasta İsim Soyisim</label>
          <input
            id="patient-name"
            type="text"
            value={patientInfo.patient_name || ''}
            onChange={(e) => {
              const v = e.target.value.replace(/\b\w/g, c => c.toUpperCase())
              onPatientInfoChange({ ...patientInfo, patient_name: v })
            }}
            className={field.input}
            style={{ width: 172 }}
            placeholder="Hasta adı..."
          />
        </div>

        {/* Hekim */}
        <div className={field.wrapper} style={{ minWidth: 140 }}>
          <label className={field.label}>Hekim İsim Soyisim</label>
          <input
            type="text"
            value={patientInfo.doctor_name || ''}
            onChange={(e) => {
              const v = e.target.value.replace(/\b\w/g, c => c.toUpperCase())
              onPatientInfoChange({ ...patientInfo, doctor_name: v })
            }}
            className={field.input}
            style={{ width: 164 }}
            placeholder="Hekim adı..."
          />
        </div>

        {/* Yaş yıl + ay — grouped */}
        <div className={field.wrapper}>
          <label className={field.label}>Yaş</label>
          <div className="flex items-center gap-1">
            <input
              id="patient-age-year"
              type="number"
              value={patientInfo.age_year || ''}
              onChange={(e) => onPatientInfoChange({ ...patientInfo, age_year: e.target.value })}
              className={field.input}
              style={{ width: 64 }}
              placeholder="Yıl"
              min="0" max="120"
            />
            <span className="text-white/20 text-xs font-medium">:</span>
            <input
              id="patient-age-month"
              type="number"
              value={patientInfo.age_month || ''}
              onChange={(e) => onPatientInfoChange({ ...patientInfo, age_month: e.target.value })}
              className={field.input}
              style={{ width: 52 }}
              placeholder="Ay"
              min="0" max="11"
            />
          </div>
        </div>

        {/* Cinsiyet */}
        <div className={field.wrapper}>
          <label className={field.label}>Cinsiyet</label>
          <div className="flex gap-1.5">
            {['Female', 'Male'].map(g => (
              <button
                key={g}
                onClick={() => onPatientInfoChange({ ...patientInfo, gender: patientInfo.gender === g ? '' : g })}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                  patientInfo.gender === g
                    ? 'bg-ortho-500/20 border-ortho-500/50 text-ortho-300'
                    : 'bg-white/5 border-white/10 text-white/35 hover:border-white/20 hover:text-white/55'
                }`}
              >{g}</button>
            ))}
          </div>
        </div>

        {/* Şikayet */}
        <div className={field.wrapper} style={{ flex: '1 1 200px', minWidth: 200 }}>
          <label className={field.label}>Şikayet</label>
          <input
            id="patient-complaint"
            type="text"
            list="complaint-options"
            value={patientInfo.complaint ?? 'My teeth are crooked'}
            onChange={(e) => onPatientInfoChange({ ...patientInfo, complaint: e.target.value })}
            className={field.input}
            style={{ width: '100%' }}
            placeholder="Şikayet girin veya seçin..."
          />
          <datalist id="complaint-options">
            <option value="My teeth are crooked" />
            <option value="Seconder Motivation" />
            <option value="I dont like my teeth appearence" />
            <option value="I have impacted teeth" />
            <option value="I have asymmetry" />
            <option value="My lower jaw is on backward position" />
            <option value="My lower jaw is on forward position" />
          </datalist>
        </div>

      </div>

      {/* Status Bar */}
      {statusMessage && (
        <div className={`mx-5 mb-3 py-2 px-4 rounded-xl text-xs font-medium animate-slide-up ${
          statusMessage.includes('✓') ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
          statusMessage.includes('✗') ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
          'bg-ortho-500/10 text-ortho-400 border border-ortho-500/20'
        }`}>
          {statusMessage}
        </div>
      )}
    </header>
  )
}
