@echo off
chcp 65001 >nul
echo.
echo  =============================================
echo   OrthoSlide Expert V2
echo  =============================================

:: Sanal ortam kontrolü
if not exist venv\Scripts\activate (
    echo  [HATA] Sanal ortam bulunamadi. Once setup.bat calistirin.
    pause
    exit /b 1
)

:: sunum.pptx kontrolü
if not exist sunum.pptx (
    echo  [UYARI] sunum.pptx bulunamadi! Dosyayi proje klasorune koyun.
)

call venv\Scripts\activate

echo  Uygulama baslatiliyor...
echo  Tarayicinizda: http://localhost:5000
echo  Kapatmak icin bu pencereyi kapatin veya Ctrl+C basin.
echo.

:: Tarayiciyi 2 saniye sonra ac
start "" cmd /c "timeout /t 2 >nul & start http://localhost:5000"

python backend\app.py

pause
