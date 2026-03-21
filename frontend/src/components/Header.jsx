import { useState } from 'react'

export default function Header({ patientInfo, onPatientInfoChange, onGenerate, isGenerating, hasData, imageCount, statusMessage }) {
  return (
    <header className="glass-card p-5 animate-fade-in" style={{ maxWidth: '1600px', margin: '0 auto' }}>
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">

        {/* Logo & Title */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-ortho-500 to-ortho-700 flex items-center justify-center shadow-lg shadow-ortho-500/20">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-ortho-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent">
              OrthoSlide Expert
            </h1>
            <p className="text-xs text-dark-400 mt-0.5">Ortodontik Sunum Otomasyonu v2.0</p>
          </div>
        </div>

        {/* Patient Info */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <label className="absolute -top-2 left-3 px-1 text-[10px] font-semibold text-dark-400 bg-dark-900 rounded">
              İsim Soyisim
            </label>
            <input
              id="patient-name"
              type="text"
              value={patientInfo.patient_name || ''}
              onChange={(e) => onPatientInfoChange({ ...patientInfo, patient_name: e.target.value })}
              className="bg-dark-900 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white/90 focus:outline-none focus:border-ortho-500 focus:ring-1 focus:ring-ortho-500/30 transition-all w-36 lg:w-48"
              placeholder="Hasta adı..."
            />
          </div>
          
          <div className="relative">
            <label className="absolute -top-2 left-3 px-1 text-[10px] font-semibold text-dark-400 bg-dark-900 rounded">
              Yaş (yıl)
            </label>
            <input
              id="patient-age-year"
              type="number"
              value={patientInfo.age_year || ''}
              onChange={(e) => onPatientInfoChange({ ...patientInfo, age_year: e.target.value })}
              className="bg-dark-900 border border-dark-700 rounded-lg px-2 py-2 text-sm text-white/90 focus:outline-none focus:border-ortho-500 focus:ring-1 focus:ring-ortho-500/30 transition-all w-20"
              placeholder="Yıl"
              min="0" max="120"
            />
          </div>

          <div className="relative">
            <label className="absolute -top-2 left-3 px-1 text-[10px] font-semibold text-dark-400 bg-dark-900 rounded">
              Ay
            </label>
            <input
              id="patient-age-month"
              type="number"
              value={patientInfo.age_month || ''}
              onChange={(e) => onPatientInfoChange({ ...patientInfo, age_month: e.target.value })}
              className="bg-dark-900 border border-dark-700 rounded-lg px-2 py-2 text-sm text-white/90 focus:outline-none focus:border-ortho-500 focus:ring-1 focus:ring-ortho-500/30 transition-all w-16"
              placeholder="Ay"
              min="0" max="11"
            />
          </div>

          <div className="relative">
            <label className="absolute -top-2 left-3 px-1 text-[10px] font-semibold text-dark-400 bg-dark-900 rounded">
              Cinsiyet
            </label>
            <select
              id="patient-gender"
              value={patientInfo.gender || ''}
              onChange={(e) => onPatientInfoChange({ ...patientInfo, gender: e.target.value })}
              className="bg-dark-900 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white/90 focus:outline-none focus:border-ortho-500 focus:ring-1 focus:ring-ortho-500/30 transition-all w-28"
            >
              <option value="">Seçiniz</option>
              <option value="Female">Female</option>
              <option value="Male">Male</option>
            </select>
          </div>

          <div className="relative">
            <label className="absolute -top-2 left-3 px-1 text-[10px] font-semibold text-dark-400 bg-dark-900 rounded">
              Şikayet
            </label>
            <input
              id="patient-complaint"
              type="text"
              value={patientInfo.complaint ?? 'My teeth are crooked'}
              onChange={(e) => onPatientInfoChange({ ...patientInfo, complaint: e.target.value })}
              className="bg-dark-900 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white/90 focus:outline-none focus:border-ortho-500 focus:ring-1 focus:ring-ortho-500/30 transition-all w-40 lg:w-56"
            />
          </div>
        </div>

        {/* Stats & Generate */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 text-xs">
            <span className={`px-3 py-1.5 rounded-full font-medium ${hasData ? 'bg-emerald-500/15 text-emerald-400' : 'bg-dark-800 text-dark-400'}`}>
              {hasData ? '✓ Veri Hazır' : '○ Veri Yok'}
            </span>
            <span className={`px-3 py-1.5 rounded-full font-medium ${imageCount > 0 ? 'bg-ortho-500/15 text-ortho-400' : 'bg-dark-800 text-dark-400'}`}>
              📷 {imageCount}/12
            </span>
          </div>

          <button
            id="generate-btn"
            onClick={onGenerate}
            disabled={isGenerating || !hasData}
            className="btn-primary"
          >
            {isGenerating ? (
              <>
                <svg className="w-5 h-5 spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" opacity="0.3" />
                  <path d="M12 2a10 10 0 0 1 10 10" />
                </svg>
                Oluşturuluyor...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

      {/* Status Bar */}
      {statusMessage && (
        <div className={`mt-3 py-2 px-4 rounded-lg text-xs font-medium animate-slide-up ${
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
