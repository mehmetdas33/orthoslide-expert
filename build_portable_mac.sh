#!/bin/bash
set -e
echo ""
echo " ============================================================"
echo "  OrthoSlide — macOS Tasinabilir Paket Olusturucu"
echo "  Bu script senin Mac'inde bir kez calisir."
echo "  Cikti: OrthoSlide_Mac klasoru"
echo " ============================================================"
echo ""

OUT="OrthoSlide_Mac"
# Mac mimarisini tespit et (M1/M2/M3 = arm64, Intel = x86_64)
ARCH=$(uname -m)
PY_VER="3.11.9"
PY_DATE="20240814"

if [ "$ARCH" = "arm64" ]; then
    PY_URL="https://github.com/indygreg/python-build-standalone/releases/download/${PY_DATE}/cpython-${PY_VER}+${PY_DATE}-aarch64-apple-darwin-install_only.tar.gz"
    echo " Mimari: Apple Silicon (M1/M2/M3)"
else
    PY_URL="https://github.com/indygreg/python-build-standalone/releases/download/${PY_DATE}/cpython-${PY_VER}+${PY_DATE}-x86_64-apple-darwin-install_only.tar.gz"
    echo " Mimari: Intel"
fi

# Temizle
rm -rf "$OUT"
mkdir -p "$OUT"

# ── 1. Standalone Python indir ────────────────────────────────────────────────
echo " [1/4] Python indiriliyor (~60 MB)..."
curl -L "$PY_URL" -o python_standalone.tar.gz --progress-bar
echo " [1/4] Python aciliyor..."
tar -xzf python_standalone.tar.gz -C "$OUT"
mv "$OUT/python" "$OUT/python_dist"
rm python_standalone.tar.gz

PYTHON="$OUT/python_dist/bin/python3"

# ── 2. Paketleri kur ──────────────────────────────────────────────────────────
echo " [2/4] Kutuphaneler kuruluyor (2-3 dakika)..."
"$PYTHON" -m pip install -r backend/requirements.txt -q
if [ $? -ne 0 ]; then echo " [HATA] Paket kurulumu basarisiz."; exit 1; fi

# ── 3. Uygulama dosyalarini kopyala ──────────────────────────────────────────
echo " [3/4] Uygulama dosyalari kopyalaniyor..."
cp -r backend          "$OUT/backend"
mkdir -p               "$OUT/frontend"
cp -r frontend/dist    "$OUT/frontend/dist"
cp sunum.pptx          "$OUT/sunum.pptx"
cp run.py              "$OUT/run.py"

# ── 4. Baslatic olustur ───────────────────────────────────────────────────────
echo " [4/4] Baslatic olusturuluyor..."
cat > "$OUT/OrthoSlide.command" << 'LAUNCHER'
#!/bin/bash
cd "$(dirname "$0")"
if [ ! -f "sunum.pptx" ]; then
    echo "[UYARI] sunum.pptx bulunamadi!"
    read -p "Devam etmek icin Enter..."
    exit 1
fi
echo "OrthoSlide baslatiliyor..."
(sleep 3 && open http://localhost:5000) &
python_dist/bin/python3 run.py
LAUNCHER

chmod +x "$OUT/OrthoSlide.command"

# Gatekeeper quarantine kaldir (izin uyarisini engeller)
xattr -rd com.apple.quarantine "$OUT" 2>/dev/null || true

echo ""
echo " ============================================================"
echo "  TAMAMLANDI!"
echo ""
echo "  Dagitim icin:"
echo "  1. '$OUT' klasorunu zip'le"
echo "  2. Hedef Mac'e kopyala"
echo "  3. Zip'i ac"
echo "  4. OrthoSlide.command'a cift tikla — bitti!"
echo ""
echo "  NOT: Ilk acilista Mac 'dogrulanamayan gelistirici')"
echo "  uyarisi verebilir. Cozum:"
echo "  Sistem Tercihleri -> Guvenlik -> 'Yine de ac'"
echo " ============================================================"
echo ""
