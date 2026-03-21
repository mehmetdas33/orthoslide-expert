# OrthoSlide Expert V2 — Kurulum Kılavuzu

---

## Gereksinimler

| Yazılım | Sürüm | İndirme |
|---------|-------|---------|
| Python  | 3.10+ | https://www.python.org/downloads/ |
| Node.js | 18+   | https://nodejs.org/en/download    |
| Git     | herhangi | https://git-scm.com/downloads  |

---

## Windows Kurulumu

### 1. Python Kur

1. `python.org/downloads` adresine git, **"Download Python 3.x.x"** butonuna tıkla.
2. Yükleyiciyi çalıştır, **"Add Python to PATH"** kutucuğunu işaretle → Install Now.
3. Kurulum bitti mi kontrol et:
   ```
   python --version
   pip --version
   ```

### 2. Node.js Kur

1. `nodejs.org` → **LTS** sürümünü indir ve kur (varsayılan seçeneklerle).
2. Kontrol:
   ```
   node --version
   npm --version
   ```

### 3. Projeyi Al

```
git clone <proje-repo-url>
cd "My project Claude"
```

veya zip olarak indirip çıkart, klasörün içine gir.

### 4. Backend Kurulumu

```
cd backend
pip install -r requirements.txt
```

Yoksa tek tek kur:
```
pip install flask flask-cors pillow python-pptx openpyxl
```

### 5. Frontend Kurulumu

```
cd ..\frontend
npm install
```

### 6. Şablonu Yerleştir

`sunum.pptx` dosyasını projenin kök dizinine (`My project Claude/` altına) koy:
```
My project Claude\
  sunum.pptx        ← buraya
  backend\
  frontend\
```

### 7. Çalıştır

İki ayrı terminal aç:

**Terminal 1 — Backend:**
```
cd "My project Claude\backend"
python app.py
```
→ `http://localhost:5000` üzerinde çalışır.

**Terminal 2 — Frontend:**
```
cd "My project Claude\frontend"
npm run dev
```
→ Tarayıcıda `http://localhost:5173` aç.

---

## macOS Kurulumu

### 1. Homebrew Kur (yoksa)

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### 2. Python ve Node.js Kur

```bash
brew install python node
```

Kontrol:
```bash
python3 --version
node --version
```

### 3. Projeyi Al

```bash
git clone <proje-repo-url>
cd "My project Claude"
```

### 4. Backend Kurulumu

```bash
cd backend
pip3 install flask flask-cors pillow python-pptx openpyxl
```

veya:
```bash
pip3 install -r requirements.txt
```

### 5. Frontend Kurulumu

```bash
cd ../frontend
npm install
```

### 6. Şablonu Yerleştir

`sunum.pptx` dosyasını proje kök dizinine koy:
```
My project Claude/
  sunum.pptx        ← buraya
  backend/
  frontend/
```

### 7. Çalıştır

İki ayrı terminal aç:

**Terminal 1 — Backend:**
```bash
cd "My project Claude/backend"
python3 app.py
```

**Terminal 2 — Frontend:**
```bash
cd "My project Claude/frontend"
npm run dev
```
→ Tarayıcıda `http://localhost:5173` aç.

---

## Sık Karşılaşılan Sorunlar

### "sunum.pptx not found"
`sunum.pptx` dosyasının `backend/` klasöründe değil, bir üst klasörde (`My project Claude/`) olduğundan emin ol.

### "Module not found" (Python)
```
pip install flask flask-cors pillow python-pptx openpyxl
```

### "npm: command not found" (macOS)
Homebrew kurulumu sonrası terminali yeniden başlat veya `source ~/.zshrc` çalıştır.

### Port 5000 meşgul (macOS)
macOS'ta AirPlay port 5000'i kullanabilir. `app.py` dosyasında `port=5000` → `port=5001` yap, frontend'deki `/api` proxy ayarını da güncelle.

### Windows'ta HEIC fotoğraf desteği
iPhone'dan HEIC format geliyorsa Windows'ta `pillow-heif` kur:
```
pip install pillow-heif
```
Ve `pptx_engine.py` başına şunu ekle:
```python
from pillow_heif import register_heif_opener
register_heif_opener()
```

---

## Hızlı Başlatma Scripti (Windows)

`start.bat` olarak kaydet, çift tıkla:
```bat
@echo off
start cmd /k "cd /d "%~dp0backend" && python app.py"
timeout /t 2
start cmd /k "cd /d "%~dp0frontend" && npm run dev"
start "" "http://localhost:5173"
```

## Hızlı Başlatma Scripti (macOS)

`start.sh` olarak kaydet:
```bash
#!/bin/bash
cd "$(dirname "$0")/backend" && python3 app.py &
cd "$(dirname "$0")/frontend" && npm run dev &
sleep 3 && open http://localhost:5173
```
Çalıştır:
```bash
chmod +x start.sh
./start.sh
```
