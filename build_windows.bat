@echo off
chcp 65001 >nul
echo.
echo  =============================================
echo   OrthoSlide - Windows Build (.exe)
echo  =============================================
echo.

:: Sanal ortam yoksa kur
if not exist venv (
    echo  Sanal ortam olusturuluyor...
    python -m venv venv
)
call venv\Scripts\activate

:: Bagimliliklar
echo  [1/3] Bagimliliklar yukleniyor...
pip install -r backend\requirements.txt --quiet
pip install pyinstaller --quiet

:: Frontend build
echo  [2/3] Arayuz derleniyor...
cd frontend
call npm install --silent
call npm run build
cd ..

:: PyInstaller
echo  [3/3] Executable olusturuluyor (3-5 dakika surebilir)...
pyinstaller orthoslide.spec --noconfirm

echo.
if exist dist\OrthoSlide\OrthoSlide.exe (
    echo  =============================================
    echo   BUILD BASARILI!
    echo.
    echo   Klasor: dist\OrthoSlide\
    echo.
    echo   Dagitim icin:
    echo   1. dist\OrthoSlide\ klasorunu zip'le
    echo   2. sunum.pptx dosyasini zip'e ekle
    echo   3. Hedef bilgisayarda zip'i ac
    echo   4. OrthoSlide.exe'ye cift tikla
    echo  =============================================
) else (
    echo  [HATA] Build basarisiz. Loglari kontrol edin.
)
echo.
pause
