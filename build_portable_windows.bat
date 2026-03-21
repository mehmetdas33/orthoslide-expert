@echo off
chcp 65001 >nul
echo.
echo  ============================================================
echo   OrthoSlide - Windows Tasinabilir Paket Olusturucu
echo   Cikti: OrthoSlide_Windows klasoru
echo  ============================================================
echo.

set OUT=OrthoSlide_Windows
set PY_VER=3.11.9
set PY_URL=https://www.python.org/ftp/python/%PY_VER%/python-%PY_VER%-embed-amd64.zip
set PIP_URL=https://bootstrap.pypa.io/get-pip.py

if exist %OUT% rmdir /s /q %OUT%
mkdir %OUT%
mkdir %OUT%\python

echo  [1/5] Python indiriliyor (%PY_VER%)...
curl -L %PY_URL% -o python_embed.zip
if %errorlevel% neq 0 (
    echo  [HATA] Python indirme basarisiz.
    pause
    exit /b 1
)

echo  [1/5] Python aciliyor...
tar -xf python_embed.zip -C %OUT%\python
del python_embed.zip

echo  [2/5] pip etkinlestiriliyor...
powershell -Command "(Get-Content '%OUT%\python\python311._pth') -replace '#import site','import site' | Set-Content '%OUT%\python\python311._pth'"

curl -L %PIP_URL% -o get-pip.py
%OUT%\python\python.exe get-pip.py --no-warn-script-location -q
del get-pip.py

echo  [3/5] Kutuphaneler kuruluyor (2-3 dakika)...
%OUT%\python\python.exe -m pip install -r backend\requirements.txt --no-warn-script-location -q
if %errorlevel% neq 0 (
    echo  [HATA] Paket kurulumu basarisiz.
    pause
    exit /b 1
)

echo  [4/5] Uygulama dosyalari kopyalaniyor...
xcopy /E /I /Q backend %OUT%\backend >nul
xcopy /E /I /Q frontend\dist %OUT%\frontend\dist >nul
copy sunum.pptx %OUT%\sunum.pptx >nul
copy run.py %OUT%\run.py >nul

echo  [5/5] Baslatic olusturuluyor...
(
echo @echo off
echo cd /d "%%~dp0"
echo if not exist sunum.pptx (
echo     echo [UYARI] sunum.pptx bulunamadi!
echo     pause
echo     exit /b 1
echo )
echo echo OrthoSlide baslatiliyor...
echo set PYTHONPYCACHEPREFIX=%%~dp0pycache_new
echo python\python.exe run.py
echo pause
) > %OUT%\OrthoSlide.bat

echo.
echo  ============================================================
echo   TAMAMLANDI!
echo   "%OUT%" klasorunu zip'le ve dagit.
echo   Hedef bilgisayarda: OrthoSlide.bat'a cift tikla
echo  ============================================================
echo.
pause
