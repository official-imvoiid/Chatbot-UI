@echo off
setlocal enabledelayedexpansion

echo ========================================
echo   Hugging Face Model Downloader
echo ========================================
echo.

REM Create the models directory if it doesn't exist
if not exist ".\backend\models" (
    echo Creating .\backend\models directory...
    mkdir ".\backend\models"
    echo.
)

REM Prompt for Hugging Face token (optional)
echo Enter your Hugging Face token (press Enter to skip if not needed):
set /p HF_TOKEN=Token: 
echo.

REM Prompt for download link
echo Enter the direct download link:
set /p DOWNLOAD_URL=URL: 
echo.

REM Validate that a URL was provided
if "%DOWNLOAD_URL%"=="" (
    echo Error: No download link provided!
    pause
    exit /b 1
)

REM Extract filename from URL
for %%F in ("%DOWNLOAD_URL%") do set FILENAME=%%~nxF

REM If filename couldn't be extracted, use a default name
if "%FILENAME%"=="" (
    set FILENAME=downloaded_model
    echo Warning: Could not extract filename from URL. Using default name.
    echo.
)

set OUTPUT_PATH=.\backend\models\%FILENAME%

echo Download Information:
echo -------------------
echo URL: %DOWNLOAD_URL%
echo Output: %OUTPUT_PATH%
if not "%HF_TOKEN%"=="" (
    echo Token: [REDACTED]
) else (
    echo Token: Not provided
)
echo.

echo Starting download...
echo.

REM Download using curl with optional authorization header
if not "%HF_TOKEN%"=="" (
    curl -L -H "Authorization: Bearer %HF_TOKEN%" -o "%OUTPUT_PATH%" "%DOWNLOAD_URL%"
) else (
    curl -L -o "%OUTPUT_PATH%" "%DOWNLOAD_URL%"
)

echo.
if %ERRORLEVEL% EQU 0 (
    echo ========================================
    echo Download completed successfully!
    echo File saved to: %OUTPUT_PATH%
    echo ========================================
) else (
    echo ========================================
    echo Download failed! Error code: %ERRORLEVEL%
    echo ========================================
)

echo.
pause