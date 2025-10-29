@echo off
color 0A
echo =========================================
echo    Chatbot UI - Starting Application
echo =========================================
echo.
REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo Error: Python is not installed
    pause
    exit /b 1
)
REM Check if Node is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo Error: Node.js is not installed
    pause
    exit /b 1
)
REM Reminder for MongoDB
echo Reminder: Ensure MongoDB is running on port 27017
echo.
REM Start Backend
echo Starting Flask Backend...
cd backend
REM Create virtual environment if it doesn't exist
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
    if errorlevel 1 (
        echo Failed to create venv
        pause
        exit /b 1
    )
    call venv\Scripts\activate.bat
    echo Upgrading pip...
    python -m pip install --upgrade pip
    echo Installing Python dependencies...
    pip install -r requirements.txt
    if errorlevel 1 (
        echo Failed to install Python deps
        pause
        exit /b 1
    )
) else (
    call venv\Scripts\activate.bat
)
REM Start Flask in new window
start "Flask Backend" cmd /k "cd /d %CD% && venv\Scripts\activate.bat && python app.py"
echo Backend started on http://localhost:5001
echo.
REM Wait a bit for backend to start
timeout /t 3 /nobreak >nul
REM Go back to root
cd ..
REM Start Frontend
echo Starting React Frontend...
cd public
REM Install npm dependencies if needed
if not exist "node_modules" (
    echo Installing npm dependencies...
    npm install
    if errorlevel 1 (
        echo Failed to install npm deps
        pause
        exit /b 1
    )
)
REM Start React dev server in new window
start "React Frontend" cmd /k "cd /d %CD% && npm run dev"
echo Frontend starting on http://localhost:5173
echo.
REM Go back to root
cd ..
echo.
echo =========================================
echo   Application Started Successfully!
echo =========================================
echo.
echo Frontend: http://localhost:5173
echo Backend:  http://localhost:5001
echo.
pause