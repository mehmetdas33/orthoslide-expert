@echo off
chcp 65001 >nul
echo.
echo  =============================================
echo   OrthoSlide Expert V2 - Windows Kurulum
echo  =============================================
echo.

:: ── Python kontrolü ──────────────────────────────────────────────────────────
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo  [HATA] Python bulunamadi!
    echo  https://www.python.org/downloads/ adresinden Python 3.10 veya ustunu indirin.
    echo  Kurulum sirasinda "Add Python to PATH" secenegini isaretleyin.
    echo.
    pause
    exit /b 1
)
for /f "tokens=2 delims= " %%v in ('python --version 2^>^&1') do set PYVER=%%v
echo  [OK] Python %PYVER% bulundu.

:: ── Node.js kontrolü ─────────────────────────────────────────────────────────
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo  [HATA] Node.js bulunamadi!
    echo  https://nodejs.org adresinden LTS surumunu indirin.
    echo.
    pause
    exit /b 1
)
for /f %%v in ('node --version 2^>^&1') do set NODEVER=%%v
echo  [OK] Node.js %NODEVER% bulundu.

:: ── Python sanal ortam ───────────────────────────────────────────────────────
echo.
echo  [1/4] Python sanal ortami olusturuluyor...
if exist venv (
    echo       Mevcut ortam kullanilacak.
) else (
    python -m venv venv
    if %errorlevel% neq 0 (
        echo  [HATA] Sanal ortam olusturulamadi.
        pause & exit /b 1
    )
)

:: ── Python bagimliliklar ─────────────────────────────────────────────────────
echo  [2/4] Python kutuphaneleri yukleniyor...
call venv\Scripts\activate
pip install --upgrade pip --quiet
pip install -r backend\requirements.txt --quiet
if %errorlevel% neq 0 (
    echo  [HATA] Python kutuphaneleri yuklenemedi.
    pause & exit /b 1
)
echo       Tamamlandi.

:: ── Frontend bagimliliklar ───────────────────────────────────────────────────
echo  [3/4] Frontend kutuphaneleri yukleniyor...
cd frontend
call npm install --silent
if %errorlevel% neq 0 (
    echo  [HATA] npm install basarisiz.
    cd ..
    pause & exit /b 1
)
cd ..
echo       Tamamlandi.

:: ── Frontend derleme ─────────────────────────────────────────────────────────
echo  [4/4] Arayuz derleniyor...
cd frontend
call npm run build
if %errorlevel% neq 0 (
    echo  [HATA] Frontend derlenemedi.
    cd ..
    pause & exit /b 1
)
cd ..
echo       Tamamlandi.

echo.
echo  =============================================
echo   Kurulum basarili!
echo   Uygulamayi baslatmak icin: start.bat
echo  =============================================
echo.
pause
