# Chatbot-UI Setup Guide

A Flask + React chatbot application with support for local GGUF models, OpenAI, and Claude APIs.

## Prerequisites

### 1. Python Installation
- **Required**: Python 3.10 or Above (Any stable version of python works but avoid too old or too latest version)
- **Recommended**: Python 3.12 (best compatibility with current packages)
- Download from [python.org](https://www.python.org/downloads/)
- During installation, check "Add Python to PATH"

### 2. MongoDB Installation
- Download MongoDB Community Server from [mongodb.com/try/download/community](https://www.mongodb.com/try/download/community)
- Run installer as Administrator
- Click Next through installation
- **Uncheck "Install MongoDB Compass"** (optional GUI tool)
- Complete installation

**Create MongoDB data directory:**
```bash
# Open Command Prompt as Administrator
mkdir C:\data\db
```

### 3. Visual Studio Build Tools
Required for llama-cpp-python compilation.

- Download from [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
- Run installer
- Select **"Desktop development with C++"**
- Install (may take 10-15 minutes)

### 4. Node.js
- Download from [nodejs.org](https://nodejs.org/)
- Install LTS version
- Verify: `node --version` and `npm --version`

## Installation

### Clone Repository
```bash
git clone https://github.com/official-imvoiid/Chatbot-UI.git
cd Chatbot-UI
```

### Quick Start (Windows)
Simply run the startup script:
```bash
start.bat
```

This will automatically:
- Create Python virtual environment (first run only)
- Install all dependencies (first run only)
- Launch backend server (Flask)
- Launch frontend server (React)

**Notes**: 
- First run may take 5-30 minutes while llama-cpp-python compiles. Subsequent starts are instant.
- Start MongoDB first with `mongod` command in CMD, then click on `start.bat`
- **Do not close** the frontend, backend, or MongoDB (database) terminals while using the program

### Manual Setup (Alternative)

#### Backend Setup
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install --upgrade pip
pip install -r requirements.txt
python app.py
```

#### Frontend Setup
```bash
cd public
npm install
npm run dev
```

## Accessing the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5001
- **Health Check**: http://localhost:5001/api/health

## Model Management

### Downloading Models

Use the included downloader for Hugging Face models:
```bash
ModelDownloder.bat
```

Or manually download GGUF models to:
```
backend/models/
```

**Important**: Always save models directly to `backend/models/` to avoid duplicates. The backend only reads from this location.

### Supported Model Types
- **Local GGUF models** (llama.cpp compatible)
- **OpenAI API** (GPT-3.5, GPT-4)
- **Claude API** (Claude 3 family)

## File Storage Notes

- **Uploaded text files**: Temporarily processed in `backend/uploads/`, automatically deleted after reading
- **GGUF models**: Permanently stored in `backend/models/`
- **MongoDB data**: Stored in `C:\data\db`

## Troubleshooting

### MongoDB Not Starting
```bash
# Start MongoDB manually program does not start mongodb automatically
# Open Command Prompt (ensure MongoDB bin folder is in PATH)
# C:\Program Files\MongoDB\Server\<version>\bin
mongod
```

### llama-cpp-python Installation Issues
- Ensure Visual Studio Build Tools are installed
- Try: `pip install llama-cpp-python --force-reinstall --no-cache-dir`
- Installation time varies: 2-30 minutes depending on hardware

### Port Already in Use
- Backend (5001): Check if another Flask app is running
- Frontend (5173): Check if another Vite app is running
- MongoDB (27017): Check if MongoDB is already running

### Model Loading Fails
- Verify model file is in `backend/models/`
- Check model file integrity (not corrupted)
- Reduce `n_ctx` parameter if memory issues occur
- Try loading with GPU layers set to 0 (CPU only)

## Configuration

Edit `backend/.env` for custom settings:
```env
MONGO_URI=mongodb://localhost:27017/
DB_NAME=chatbot_db
DEFAULT_N_CTX=2048
DEFAULT_N_GPU_LAYERS=0
```

## Features

- User authentication & profiles
- Multiple model support (local & API)
- Chat history with MongoDB persistence
- File upload & processing (.txt)
- Model management (upload, load, unload)
- Export chat history
- Responsive UI

## Tech Stack

**Backend**: Flask, llama-cpp-python, PyMongo, Flask-CORS  
**Frontend**: React, Vite, Tailwind CSS  
**Database**: MongoDB

---

For issues or contributions, visit the [GitHub repository](https://github.com/official-imvoiid/Chatbot-UI).
