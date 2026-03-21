#!/bin/bash
set -e

echo ""
echo " ============================================="
echo "  OrthoSlide Expert V2 - Mac/Linux Kurulum"
echo " ============================================="
echo ""

# ── Python kontrolü ────────────────────────────────────────────────────────────
if command -v python3 &>/dev/null; then
    PYTHON=python3
elif command -v python &>/dev/null; then
    PYTHON=python
else
    echo " [HATA] Python bulunamadi!"
    echo " https://www.python.org/downloads/ adresinden Python 3.10+ indirin."
    echo " Mac icin: brew install python3"
    exit 1
fi

PYVER=$($PYTHON --version 2>&1)
echo " [OK] $PYVER bulundu."

# ── Node.js kontrolü ───────────────────────────────────────────────────────────
if ! command -v node &>/dev/null; then
    echo " [HATA] Node.js bulunamadi!"
    echo " https://nodejs.org adresinden LTS surumunu indirin."
    echo " Mac icin: brew install node"
    exit 1
fi
echo " [OK] Node.js $(node --version) bulundu."

# ── Python sanal ortam ─────────────────────────────────────────────────────────
echo ""
echo " [1/4] Python sanal ortami olusturuluyor..."
if [ ! -d "venv" ]; then
    $PYTHON -m venv venv
fi
source venv/bin/activate

# ── Python bagimliliklar ───────────────────────────────────────────────────────
echo " [2/4] Python kutuphaneleri yukleniyor..."
pip install --upgrade pip --quiet
pip install -r backend/requirements.txt --quiet
echo "       Tamamlandi."

# ── Frontend bagimliliklar ─────────────────────────────────────────────────────
echo " [3/4] Frontend kutuphaneleri yukleniyor..."
cd frontend
npm install --silent
cd ..
echo "       Tamamlandi."

# ── Frontend derleme ───────────────────────────────────────────────────────────
echo " [4/4] Arayuz derleniyor..."
cd frontend
npm run build
cd ..
echo "       Tamamlandi."

echo ""
echo " ============================================="
echo "  Kurulum basarili!"
echo "  Uygulamayi baslatmak icin: ./start.sh"
echo " ============================================="
echo ""
