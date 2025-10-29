@echo off
echo ========================================
echo   Hugging Face Model Downloader
echo ========================================
echo.

if not exist ".\backend\models" mkdir ".\backend\models"

set /p HF_TOKEN="Enter your Hugging Face token (press Enter to skip if not needed): "
echo.
set /p DOWNLOAD_URL="Enter the full download link: "
echo.

rem Trim spaces from URL
for /f "tokens=*" %%a in ("%DOWNLOAD_URL%") do set DOWNLOAD_URL=%%a

if "%DOWNLOAD_URL%"=="" (
    echo Error: No download link provided!
    pause
    exit /b 1
)

for %%F in ("%DOWNLOAD_URL%") do set FILENAME=%%~nxF
if "%FILENAME%"=="" set FILENAME=model.gguf

set OUTPUT_PATH=.\backend\models\%FILENAME%

echo Downloading to: %OUTPUT_PATH%
echo URL: %DOWNLOAD_URL%
echo.

if not "%HF_TOKEN%"=="" (
    curl -# -L -C - --fail -H "Authorization: Bearer %HF_TOKEN%" -o "%OUTPUT_PATH%" "%DOWNLOAD_URL%"
    goto :check_result
)

curl -# -L -C - --fail -o "%OUTPUT_PATH%" "%DOWNLOAD_URL%"

:check_result
echo.
if exist "%OUTPUT_PATH%" (
    echo ========================================
    echo Download completed successfully!
    echo File saved at: %OUTPUT_PATH%
    echo ========================================
) else (
    echo ========================================
    echo Download failed - file not found!
    echo ========================================
)
echo.
pause