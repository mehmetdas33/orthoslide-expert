import { useState, useCallback, useRef, useEffect } from 'react'
import Header from './components/Header'
import ImageGrid from './components/ImageGrid'
import ExcelUpload from './components/ExcelUpload'
import PupilLineModal from './components/PupilLineModal'
import PhotoQuestionModal from './components/PhotoQuestionModal'
import CropModal from './components/CropModal'
import LineMarkModal from './components/LineMarkModal'
import axios from 'axios'

const API_BASE = (import.meta.env.VITE_API_URL || '') + '/api'

const SLOT_QUESTIONS = {
  profile: [
    { type: 'buttons', label: 'Profil Tipi', placeholder: 'ph105', options: ['Concave', 'Straight', 'Convex'] },
  ],
  intraoral_right: [
    { type: 'buttons', label: 'Sağ Molar Sınıf',  placeholder: '_rmolar',  options: ['I', 'II', 'III', 'No'] },
    { type: 'buttons', label: 'Sağ Kanin Sınıf',  placeholder: '_rcanine', options: ['I', 'II', 'III', 'No'] },
  ],
  intraoral_left: [
    { type: 'buttons', label: 'Sol Molar Sınıf',   placeholder: '_lmolar',  options: ['I', 'II', 'III', 'No'] },
    { type: 'buttons', label: 'Sol Kanin Sınıf',   placeholder: '_lcanine', options: ['I', 'II', 'III', 'No'] },
  ],
  intraoral_frontal: [
    { type: 'midline', label: 'Üst Orta Hat (mm)', placeholder: 'ph110', prefix: 'Upper' },
    { type: 'midline', label: 'Alt Orta Hat (mm)', placeholder: 'ph111', prefix: 'Lower' },
    { type: 'text',    label: 'Overjet (mm)',      placeholder: 'ph112' },
    { type: 'text',    label: 'Overbite (mm)',      placeholder: 'ph113' },
  ],
  upper_occlusal: [
    { type: 'header', label: 'Hayce-Nance Analizi' },
    { type: 'header', label: 'Maxilla' },
    { type: 'number', label: 'Sağ',  placeholder: 'ph120', signed: true },
    { type: 'number', label: 'Sol',  placeholder: 'ph121', signed: true },
    // ph122 = ph120 + ph121 (auto-calculated)
    { type: 'header', label: 'Mandibula' },
    { type: 'number', label: 'Sağ',  placeholder: 'ph123', signed: true },
    { type: 'number', label: 'Sol',  placeholder: 'ph124', signed: true },
    // ph125 = ph123 + ph124 (auto-calculated)
    { type: 'bolton', label: 'Bolton Analizi', optional: true },
  ],
  lower_occlusal: [
    { type: 'header', label: 'Hayce-Nance Analizi' },
    { type: 'header', label: 'Maxilla' },
    { type: 'number', label: 'Sağ',  placeholder: 'ph120', signed: true },
    { type: 'number', label: 'Sol',  placeholder: 'ph121', signed: true },
    { type: 'header', label: 'Mandibula' },
    { type: 'number', label: 'Sağ',  placeholder: 'ph123', signed: true },
    { type: 'number', label: 'Sol',  placeholder: 'ph124', signed: true },
    { type: 'bolton', label: 'Bolton Analizi', optional: true },
  ],
  wrist: [
    { type: 'buttons', label: 'İskelet Olgunluk Evresi', placeholder: 'ph130',
      options: ['PP2', 'MP3', 'S', 'MP3cap', 'RU'] },
  ],
  panoramic: [
    { type: 'teeth', label: 'Eksik Diş', placeholder: 'ph140', format: 'missing' },
    { type: 'teeth', label: 'Kanal Tedavisi (RCT)', placeholder: 'ph141', format: 'rct', optional: true },
    { type: 'teeth', label: 'Kron / Köprü', placeholder: 'ph142', format: 'crown', optional: true },
    { type: 'teeth', label: 'Dolgu / Restorasyon', placeholder: 'ph143', format: 'restoration', optional: true },
    { type: 'teeth', label: 'Gömülü Diş', placeholder: 'ph144', format: 'impacted', optional: true },
  ],
}

function App() {
  const [patientInfo, setPatientInfo]     = useState({ patient_name: '', complaint: 'My teeth are crooked' })
  const [cephData, setCephData]           = useState(null)
  const [evaluated, setEvaluated]         = useState([])
  const [images, setImages]               = useState({})
  const imagesRef                         = useRef({})
  useEffect(() => { imagesRef.current = images }, [images])
  const [isGenerating, setIsGenerating]   = useState(false)
  const [isLoading, setIsLoading]         = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [pendingAnnotation, setPendingAnnotation] = useState(null)
  const [annotationAnswers, setAnnotationAnswers] = useState({})
  const [frontalMidlineX, setFrontalMidlineX] = useState(null)
  const [closingVideo, setClosingVideo] = useState(null)
  const videoInputRef = useRef(null)

  // Prevent browser from navigating to dropped files when dropped outside a slot zone
  useEffect(() => {
    const prevent = (e) => e.preventDefault()
    document.addEventListener('dragover', prevent)
    document.addEventListener('drop', prevent)
    return () => {
      document.removeEventListener('dragover', prevent)
      document.removeEventListener('drop', prevent)
    }
  }, [])

  const handleExcelUpload = useCallback(async (rawFile) => {
    setIsLoading(true)

    // XLS → XLSX otomatik dönüşüm
    let file = rawFile
    if (rawFile.name.toLowerCase().endsWith('.xls')) {
      setStatusMessage('XLS dosyası XLSX\'e dönüştürülüyor...')
      try {
        const fd = new FormData()
        fd.append('file', rawFile)
        const convRes = await axios.post(`${API_BASE}/convert-xls`, fd, { responseType: 'blob' })
        const xlsxName = rawFile.name.replace(/\.xls$/i, '.xlsx')
        file = new File([convRes.data], xlsxName, {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        })
      } catch (convErr) {
        setStatusMessage('XLS dönüştürme hatası: ' + (convErr.message || 'bilinmiyor'))
        setIsLoading(false)
        return
      }
    }

    setStatusMessage('Excel dosyası ayrıştırılıyor...')
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await axios.post(`${API_BASE}/parse-excel`, formData)
      if (res.data.success) {
        setCephData(res.data.raw_data)
        setEvaluated(res.data.evaluated)
        if (res.data.patient_info) setPatientInfo(prev => ({ ...prev, ...res.data.patient_info }))
        setStatusMessage('✓ Veriler başarıyla yüklendi')
      }
    } catch (err) {
      setStatusMessage('✗ Excel okuma hatası: ' + (err.response?.data?.error || err.message))
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleImageDrop = useCallback((slotKey, file) => {
    if (slotKey === 'frontal') {
      setPendingAnnotation({ type: 'frontal_midline', file })
    } else if (slotKey === 'frontal_smile') {
      setPendingAnnotation({ type: 'pupil', file })
    } else if (slotKey === 'cephalometric') {
      setPendingAnnotation({ type: 'crop', file })
    } else if (slotKey === 'upper_occlusal') {
      // Sadece kaydet; her iki fotoğraf da yüklenince modal açılır
      setImages(prev => ({ ...prev, upper_occlusal: file }))
    } else if (slotKey === 'lower_occlusal') {
      setImages(prev => ({ ...prev, lower_occlusal: file }))
      if (imagesRef.current.upper_occlusal) {
        setPendingAnnotation({ type: 'question', slotKey: 'lower_occlusal', file, questions: SLOT_QUESTIONS['lower_occlusal'] })
      }
    } else if (SLOT_QUESTIONS[slotKey]) {
      setPendingAnnotation({ type: 'question', slotKey, file, questions: SLOT_QUESTIONS[slotKey] })
    } else {
      setImages(prev => ({ ...prev, [slotKey]: file }))
    }
  }, [])

  const handleImageRemove = useCallback((slotKey) => {
    setImages(prev => { const n = { ...prev }; delete n[slotKey]; return n })
  }, [])

  const handleImageReset = useCallback(() => {
    setImages({})
    setAnnotationAnswers({})
  }, [])

  const handleImageRotate = useCallback((slotKey, rotatedFile) => {
    setImages(prev => ({ ...prev, [slotKey]: rotatedFile }))
  }, [])

  const handleFrontalMidlineConfirm = useCallback((annotatedFile, _ph109, originalFile) => {
    setImages(prev => ({
      ...prev,
      frontal: annotatedFile,        // with midline → slide 3
      frontal_plain: originalFile,   // original → composite (no midline)
    }))
    setPendingAnnotation(null)
  }, [])

  const handlePupilConfirm = useCallback((annotatedFile, ph109, originalFile, midlineX) => {
    setImages(prev => ({
      ...prev,
      frontal_smile: annotatedFile,          // with midline → slide 4
      frontal_smile_plain: originalFile,     // original → composite slide (no midline)
    }))
    if (ph109) setAnnotationAnswers(prev => ({ ...prev, ph109 }))
    if (midlineX !== null && midlineX !== undefined) setFrontalMidlineX(midlineX)
    setPendingAnnotation(null)
  }, [])

  const handleCropConfirm = useCallback((originalFile, croppedFile) => {
    setImages(prev => ({
      ...prev,
      cephalometric:      originalFile,  // slayt 11-12-13 (uncropped)
      cephalometric_crop: croppedFile,   // slayt 14 (cropped)
    }))
    // Open line-marking modal on the cropped image → slayt 15
    setPendingAnnotation({ type: 'line', file: croppedFile })
  }, [])

  const handleLineMarkConfirm = useCallback((lineFile) => {
    setImages(prev => ({ ...prev, cephalometric_line: lineFile }))
    setPendingAnnotation(null)
  }, [])

  const handleQuestionConfirm = useCallback((answers, burnedFile) => {
    const { slotKey, file } = pendingAnnotation
    setImages(prev => ({ ...prev, [slotKey]: burnedFile || file }))

    const final = { ...answers }

    // PH105: ensure "profile" suffix
    if (final.ph105) final.ph105 = final.ph105.trim() + ' profile'

    // PH101: right molar & canine → combined text
    if (final._rmolar || final._rcanine) {
      const m = final._rmolar || '?'
      const c = final._rcanine || '?'
      final.ph101 = `Class ${m} molar & Class ${c} canine relationship`
    }
    // PH103: left molar & canine → combined text
    if (final._lmolar || final._lcanine) {
      const m = final._lmolar || '?'
      const c = final._lcanine || '?'
      final.ph103 = `Class ${m} molar & Class ${c} canine relationship`
    }

    // Auto-calculate totals — only when at least one input is filled
    const ph120v = (final.ph120 || '').trim()
    const ph121v = (final.ph121 || '').trim()
    const fmt = (n) => parseFloat(n.toFixed(6)).toString()
    if (ph120v || ph121v) {
      final.ph122 = fmt((parseFloat(ph120v) || 0) + (parseFloat(ph121v) || 0))
    } else {
      delete final.ph122
    }
    const ph123v = (final.ph123 || '').trim()
    const ph124v = (final.ph124 || '').trim()
    if (ph123v || ph124v) {
      final.ph125 = fmt((parseFloat(ph123v) || 0) + (parseFloat(ph124v) || 0))
    } else {
      delete final.ph125
    }
    // Format wrist stage: "MP3" → "MP3 Stage"
    if (final.ph130) {
      final.ph130 = `${final.ph130} Stage`
    }
    // Strip all internal helper keys (prefixed with _)
    Object.keys(final).filter(k => k.startsWith('_')).forEach(k => delete final[k])

    setAnnotationAnswers(prev => ({ ...prev, ...final }))
    setPendingAnnotation(null)
  }, [pendingAnnotation])

  const handleAnnotationCancel = useCallback(() => setPendingAnnotation(null), [])

  const handleGenerate = useCallback(async () => {
    if (!cephData) { setStatusMessage('Lütfen önce Excel dosyasını yükleyin'); return }
    setIsGenerating(true)
    setStatusMessage('PPTX oluşturuluyor...')
    const formData = new FormData()
    formData.append('ceph_data', JSON.stringify(cephData))
    const finalPatientInfo = { ...patientInfo, ...annotationAnswers }
    if (finalPatientInfo.age_year || finalPatientInfo.age_month) {
      const yr = parseInt(finalPatientInfo.age_year) || 0
      const mo = parseInt(finalPatientInfo.age_month) || 0
      finalPatientInfo.age = mo > 0 ? `${yr} yıl ${mo} ay` : `${yr} yıl`
    }
    formData.append('patient_info', JSON.stringify(finalPatientInfo))
    Object.entries(images).forEach(([key, file]) => formData.append(key, file))
    if (closingVideo) formData.append('closing_video', closingVideo)
    try {
      const res  = await axios.post(`${API_BASE}/generate-pptx`, formData, { responseType: 'blob' })
      const url  = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href  = url
      link.setAttribute('download', `OrthoSlide_${patientInfo.patient_name || 'sunum'}.pptx`)
      document.body.appendChild(link); link.click(); link.remove()
      window.URL.revokeObjectURL(url)
      setStatusMessage('✓ Sunum başarıyla indirildi!')
    } catch (err) {
      setStatusMessage('✗ Oluşturma hatası: ' + err.message)
    } finally {
      setIsGenerating(false)
    }
  }, [cephData, patientInfo, annotationAnswers, images])

  return (
    <div className="min-h-screen p-4 md:p-6">
      {pendingAnnotation?.type === 'frontal_midline' && (
        <PupilLineModal file={pendingAnnotation.file} midlineOnly onConfirm={handleFrontalMidlineConfirm} onCancel={handleAnnotationCancel} />
      )}
      {pendingAnnotation?.type === 'pupil' && (
        <PupilLineModal file={pendingAnnotation.file} onConfirm={handlePupilConfirm} onCancel={handleAnnotationCancel} />
      )}
      {pendingAnnotation?.type === 'crop' && (
        <CropModal file={pendingAnnotation.file} onConfirm={handleCropConfirm} onCancel={handleAnnotationCancel} />
      )}
      {pendingAnnotation?.type === 'line' && (
        <LineMarkModal file={pendingAnnotation.file} onConfirm={handleLineMarkConfirm} onCancel={handleAnnotationCancel} />
      )}
      {pendingAnnotation?.type === 'question' && (
        <PhotoQuestionModal
          key={pendingAnnotation.slotKey}
          file={pendingAnnotation.file}
          questions={pendingAnnotation.questions}
          onConfirm={handleQuestionConfirm}
          onCancel={handleAnnotationCancel}
          showMidlineMark={pendingAnnotation.slotKey === 'intraoral_frontal'}
          referenceImage={
            pendingAnnotation.slotKey === 'intraoral_frontal' ? images.frontal_smile :
            pendingAnnotation.slotKey === 'upper_occlusal'    ? images.lower_occlusal :
            pendingAnnotation.slotKey === 'lower_occlusal'    ? images.upper_occlusal :
            null
          }
          refMidlineX={null}
          referenceLabel={
            pendingAnnotation.slotKey === 'upper_occlusal' ? 'Alt Oklüzal' :
            pendingAnnotation.slotKey === 'lower_occlusal' ? 'Üst Oklüzal' :
            'Gülüş Cephesi'
          }
        />
      )}
      <Header patientInfo={patientInfo} onPatientInfoChange={setPatientInfo}
        onGenerate={handleGenerate} isGenerating={isGenerating}
        hasData={!!cephData && evaluated.length > 0}
        imageCount={Object.keys(images).length} statusMessage={statusMessage} />
      <div style={{ maxWidth: '1600px', margin: '20px auto 0' }}>
        <ExcelUpload onUpload={handleExcelUpload} isLoading={isLoading} />
        <div className="mt-5">
          <ImageGrid images={images} onImageDrop={handleImageDrop} onImageRemove={handleImageRemove} onImageRotate={handleImageRotate} onReset={handleImageReset} />
        </div>
      </div>

      {/* Kapanış Video */}
      <div style={{ maxWidth: '1600px', margin: '16px auto 0' }}>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-4 h-4 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
            </svg>
            <span className="text-xs font-semibold text-dark-300">Kapanış Videosu</span>
            <span className="text-[10px] text-dark-500 ml-1">— Kompozit slaytından sonra eklenir</span>
            {closingVideo && (
              <button onClick={() => setClosingVideo(null)} className="ml-auto text-[10px] text-red-400/70 hover:text-red-400 border border-red-400/20 rounded px-2 py-0.5">Kaldır</button>
            )}
          </div>
          {closingVideo ? (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <svg className="w-5 h-5 text-purple-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
              </svg>
              <span className="text-xs text-purple-300 truncate">{closingVideo.name}</span>
              <span className="text-[10px] text-dark-500 ml-auto flex-shrink-0">{(closingVideo.size / 1024 / 1024).toFixed(1)} MB</span>
            </div>
          ) : (
            <div className="rounded-lg border-2 border-dashed border-white/10 hover:border-purple-500/30 cursor-pointer transition-all flex items-center gap-3 px-4 py-3"
              onClick={() => videoInputRef.current?.click()}>
              <input ref={videoInputRef} type="file" accept="video/*" className="hidden"
                onChange={(e) => { if (e.target.files?.[0]) { setClosingVideo(e.target.files[0]); e.target.value = '' } }} />
              <svg className="w-7 h-7 text-dark-600 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
              </svg>
              <div>
                <p className="text-[11px] font-medium text-dark-400">Video dosyasını buraya sürükleyin veya tıklayın</p>
                <p className="text-[10px] text-dark-600 mt-0.5">MP4, MOV, AVI — önerilen: MP4</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer style={{ maxWidth: '1600px', margin: '32px auto 0', padding: '16px 0', borderTop: '1px solid rgba(255,255,255,0.07)', textAlign: 'center' }}>
        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', lineHeight: '1.6' }}>
          <span style={{ color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>Bezmialem Ortodonti Slide Maker</span>
          {' '}— Ortodonti vakalarının sunuma hazırlanmasını kolaylaştırmak amacıyla geliştirilmiştir.
        </p>
        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', marginTop: '4px' }}>
          Geliştirici: <span style={{ color: 'rgba(255,255,255,0.4)' }}>Mehmet Daş</span>
        </p>
      </footer>
    </div>
  )
}

export default App
