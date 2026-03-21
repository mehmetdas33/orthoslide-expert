#!/bin/bash

echo ""
echo " ============================================="
echo "  OrthoSlide Expert V2"
echo " ============================================="

# Sanal ortam kontrolü
if [ ! -f "venv/bin/activate" ]; then
    echo " [HATA] Sanal ortam bulunamadi. Once ./setup.sh calistirin."
    exit 1
fi

# sunum.pptx kontrolü
if [ ! -f "sunum.pptx" ]; then
    echo " [UYARI] sunum.pptx bulunamadi! Dosyayi proje klasorune koyun."
fi

source venv/bin/activate

echo " Uygulama baslatiliyor..."
echo " Tarayicinizda: http://localhost:5000"
echo " Kapatmak icin: Ctrl+C"
echo ""

# Tarayiciyi 2 saniye sonra ac (Mac ve Linux)
(sleep 2 && {
    if command -v open &>/dev/null; then
        open http://localhost:5000        # macOS
    elif command -v xdg-open &>/dev/null; then
        xdg-open http://localhost:5000   # Linux
    fi
}) &

python backend/app.py
