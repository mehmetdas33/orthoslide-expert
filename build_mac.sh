#!/bin/bash
set -e
echo ""
echo " ============================================="
echo "  OrthoSlide - macOS Build (.app)"
echo " ============================================="
echo ""

# Python kontrolü
if command -v python3 &>/dev/null; then PYTHON=python3
elif command -v python &>/dev/null; then PYTHON=python
else echo "[HATA] Python bulunamadi."; exit 1; fi

# Sanal ortam
if [ ! -d "venv" ]; then
    echo " Sanal ortam olusturuluyor..."
    $PYTHON -m venv venv
fi
source venv/bin/activate

# Bagimliliklar
echo " [1/3] Bagimliliklar yukleniyor..."
pip install -r backend/requirements.txt --quiet
pip install pyinstaller --quiet

# Frontend
echo " [2/3] Arayuz derleniyor..."
cd frontend
npm install --silent
npm run build
cd ..

# PyInstaller
echo " [3/3] .app olusturuluyor (3-5 dakika surebilir)..."
pyinstaller orthoslide.spec --noconfirm

echo ""
if [ -d "dist/OrthoSlide.app" ]; then
    echo " ============================================="
    echo "  BUILD BASARILI!"
    echo ""
    echo "  Konum: dist/OrthoSlide.app"
    echo ""
    echo "  Dagitim icin:"
    echo "  1. sunum.pptx'i OrthoSlide.app'in YANINA koy"
    echo "  2. Ikisini birlikte zip'le veya klasore koy"
    echo "  3. Hedef Mac'te OrthoSlide.app'e cift tikla"
    echo " ============================================="
else
    echo " [HATA] Build basarisiz."
    exit 1
fi
echo ""
