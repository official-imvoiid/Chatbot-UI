# 🚀 Chatbot UI - Open Source Chat Interface

An open-source, privacy-focused chatbot interface that supports multiple AI backends including local GGUF models, OpenAI, and Claude APIs. Built with React and Flask, this application prioritizes user privacy and data ownership.

## 📖 Overview

Chatbot UI is a full-stack application designed to provide a flexible and secure environment for interacting with various AI models. Whether you want to run models locally on your machine or connect to cloud-based APIs, this interface gives you complete control over your chat experience.

## ✨ Key Features

### 🤖 Multiple AI Backend Support
- **Local GGUF Models**: Run quantized language models directly on your machine using llama.cpp
- **OpenAI Integration**: Connect to GPT-4o, GPT-4o Mini, O1 Preview, and O1 Mini models
- **Claude Integration**: Access Claude 3.5 Sonnet, Claude Opus 4, and Claude Sonnet 4

### 🔒 Privacy and Data Management
- **Guest Mode**: Use the application without creating an account - no data is saved
- **User Authentication**: Create an account to save and sync your chat history
- **Local Storage**: All data is stored either in memory (guest mode) or in your local MongoDB instance
- **Export/Import**: Full control over your data with JSON export and import functionality

### 💬 Chat Management
- **Conversation History**: Save and organize multiple chat sessions
- **Chat Renaming**: Customize conversation titles for easy reference
- **Auto-Save**: Conversations are automatically saved for registered users
- **Message Threading**: Maintain context across multiple exchanges

### 📎 File Handling
- **Text File Attachments**: Attach multiple .txt files to your messages (up to 10MB total)
- **Context Integration**: Attached files are automatically included in the conversation context
- **Multi-file Support**: Handle multiple file attachments in a single message

### 🎨 User Interface
- **Dark/Light Mode**: Toggle between dark and light themes
- **Responsive Design**: Works seamlessly across desktop and mobile devices
- **Real-time Updates**: See AI responses as they generate
- **Profile Customization**: Set custom usernames and profile photos

### ⚙️ Advanced Settings
- **Temperature Control**: Adjust response creativity (0.0 - 2.0)
- **Token Limits**: Configure maximum response length (128 - 4096 tokens)
- **Top-P Sampling**: Fine-tune response diversity (0.0 - 1.0)
- **Model Selection**: Choose specific model versions for each API

## 🛠️ Technology Stack

### Frontend
- **React 18**: Modern UI library with hooks and functional components
- **Vite**: Fast build tool and development server
- **Tailwind CSS**: Utility-first styling framework
- **Lucide React**: Icon library for consistent UI elements

### Backend
- **Flask**: Lightweight Python web framework
- **llama-cpp-python**: Python bindings for llama.cpp (GGUF model support)
- **MongoDB**: NoSQL database for user data and chat history
- **Flask-CORS**: Cross-origin resource sharing support

## 💻 System Requirements

### Software Dependencies
- **Node.js**: Version 14 or higher
- **Python**: Version 3.8 or higher
- **MongoDB**: Version 4.4 or higher (for database features)
- **curl**: For the model downloader utility

### Hardware Recommendations
- **For GGUF Models**: 
  - Minimum 8GB RAM (16GB+ recommended)
  - CPU with AVX2 support for optimal performance
  - Optional: CUDA-compatible GPU for accelerated inference
- **For API Usage**: Standard modern computer with internet connection

## 🔧 Installation and Setup

### Initial Setup

The application consists of two main components that need to be set up: the frontend (React) and the backend (Flask).

1. Ensure MongoDB is installed and running on the default port (27017). If you don't have MongoDB, the application will still work but without user authentication and chat history persistence.

2. The project includes a convenient startup script for Windows users that handles all setup automatically. For manual setup or non-Windows systems, you'll need to configure both the frontend and backend separately.

### Backend Configuration

The backend requires Python dependencies installed in a virtual environment. The key dependencies include Flask for the web server, llama-cpp-python for GGUF model support, pymongo for database connectivity, and python-dotenv for environment configuration.

Environment variables can be configured in the .env file, including Flask settings, MongoDB connection strings, CORS origins, and default model parameters. The backend will automatically create necessary directories for uploads and models.

### Frontend Configuration

The frontend is a React application built with Vite. All necessary npm packages are specified in package.json and will be installed during the first run. The application is configured to run on port 5173 by default and will automatically connect to the Flask backend on port 5001.

### Starting the Application

For Windows users, simply run the start.bat script, which will:
- Check for Python and Node.js installation
- Create and activate Python virtual environment if needed
- Install all required dependencies
- Start both backend and frontend servers in separate windows
- Open the application in your default browser

The backend will be accessible at http://localhost:5001 and the frontend at http://localhost:5173.

## 📚 Usage Guide

### First-Time Setup

When you first launch the application, you'll be presented with a login screen. You have two options:

**Guest Mode**: Click "Skip and continue as Guest" to use the application without creating an account. In this mode, conversations exist only in memory and will be lost when you close the browser.

**Create Account**: Sign up with a username, email, and password to enable chat history persistence and cross-session access to your conversations.

### Loading a Model

Before you can start chatting, you need to configure an AI backend:

**For GGUF Models**:
- Click "Load GGUF" in the sidebar
- Select your .gguf model file from your local system
- The model will be uploaded to the backend/models directory
- Once uploaded, the model is automatically loaded into memory
- You'll see a confirmation message when the model is ready

Alternatively, use the ModelDownloader.bat utility to download models directly from Hugging Face:
- Run ModelDownloader.bat
- Enter your Hugging Face token if the model requires authentication
- Paste the direct download URL for the GGUF file
- The model will be saved directly to the backend/models directory

**For API Models**:
- Click "OpenAI API" or "Claude API" in the sidebar
- Enter your API key in the modal
- Select your preferred model from the dropdown
- Click Save to activate the API connection

### Chatting

Once a model is loaded:
- Type your message in the input box at the bottom
- Press Enter or click the send button
- The AI will process your message and respond
- Conversations are automatically saved for registered users

### Managing Conversations

**Creating New Chats**: Click the "New chat" button in the sidebar to start a fresh conversation. If you have an ongoing chat, it will be automatically saved before creating the new one.

**Viewing History**: All saved conversations appear in the sidebar (registered users only). Click on any conversation to load it and continue where you left off.

**Renaming Chats**: Hover over a conversation in the sidebar and click the edit icon. Enter a new title and press Enter to save.

**Deleting Chats**: Hover over a conversation and click the trash icon to permanently delete it.

### File Attachments

To include context from text files:
- Click the paperclip icon in the input area
- Select one or more .txt files (combined size under 10MB)
- Attached files appear as chips above the input box
- Click the X on any chip to remove that attachment
- Files are automatically included in your message context when you send

### Customizing Settings

**User Profile** (registered users):
- Click your avatar in the sidebar
- Select "Settings"
- Update your username, profile photo, or password
- Changes are saved to the database

**Model Parameters**:
- Access through the Settings menu
- Adjust temperature for more creative or conservative responses
- Modify max tokens to control response length
- Change top-p for diversity in word selection
- Settings apply to all subsequent messages

### Data Management

**Exporting Data**:
- Click "Export data" in the sidebar
- A JSON file containing all your chat history and settings will be downloaded
- This backup can be saved externally or shared across devices

**Importing Data**:
- Click "Import data" in the sidebar
- Select a previously exported JSON file
- Imported chats are merged with existing history (duplicates handled by chat ID)

## 🏗️ Architecture and Design

### Frontend Architecture

The application uses a single-page architecture with React's useState and useEffect hooks for state management. All application state is maintained in memory during the session, with persistent data saved to the backend API for registered users.

The UI is organized into three main sections:
- **Sidebar**: Navigation, model selection, chat history, and settings
- **Chat Area**: Message display with scrollable conversation history
- **Input Area**: Message composition with file attachment support

### Backend Architecture

The Flask backend is structured around RESTful API endpoints that handle:
- **Authentication**: User signup, login, and profile management
- **Model Management**: GGUF model upload, loading, unloading, and status
- **Chat Completions**: Message processing for all model types
- **File Handling**: Text file uploads and content extraction
- **History Management**: CRUD operations for chat conversations

### Data Flow

**For GGUF Models**:
1. User sends a message
2. Frontend formats messages and sends to backend API
3. Backend converts messages to model-specific format
4. llama.cpp processes the prompt and generates response
5. Response is cleaned and returned to frontend
6. Frontend displays the message and saves to history (if logged in)

**For API Models**:
1. User sends a message
2. Frontend forwards request to backend
3. Backend proxies request to OpenAI or Claude API
4. API response is returned through backend
5. Frontend displays and saves the message

### Security Considerations

**API Key Handling**: API keys are stored in memory only during the session and never persisted to disk or database. Users must re-enter keys each session.

**Password Security**: User passwords are hashed using SHA-256 before storage in MongoDB. Plain text passwords are never stored.

**File Upload Safety**: All file uploads are validated for extension and size. Filenames are sanitized to prevent path traversal attacks.

**CORS Configuration**: Backend is configured to only accept requests from the frontend origin, preventing unauthorized cross-origin access.

## 📦 Model Format Support

### GGUF Models

GGUF (GPT-Generated Unified Format) is a file format designed for storing quantized language models. These models are optimized for inference on consumer hardware and support various quantization levels:

- **Q4_0, Q4_1**: 4-bit quantization, smallest size, good for resource-constrained systems
- **Q5_0, Q5_1**: 5-bit quantization, balanced size and quality
- **Q8_0**: 8-bit quantization, larger but better quality

The application uses llama.cpp for GGUF inference, which provides:
- CPU-optimized inference with AVX/AVX2 support
- Optional GPU acceleration via CUDA
- Memory-mapped model loading for efficiency
- Context window management up to 4096 tokens

### Message Formatting

The application automatically formats conversations for different model architectures:

**Chat Template Format**: Uses special tokens like `<|user|>`, `<|assistant|>`, and `<|system|>` to structure conversations. This format is compatible with most modern chat-tuned models.

**Response Cleaning**: Automatically removes special tokens, extra whitespace, and truncates responses at natural stopping points to provide clean, readable outputs.

## 🔌 API Integration Details

### OpenAI Integration

The application interfaces with OpenAI's Chat Completions API, supporting:
- Streaming and non-streaming responses
- Full conversation history for context
- Configurable parameters (temperature, max tokens, top-p)
- Model selection from available GPT variants

### Claude Integration

Claude API integration provides:
- Anthropic's latest models including Claude 3.5 Sonnet and Claude 4 variants
- Message-based conversation format
- Configurable generation parameters
- Built-in safety features from Anthropic

## 🛠️ Troubleshooting

### Common Issues

**Backend Not Starting**:
- Verify Python is installed and in system PATH
- Check that all dependencies are installed in the virtual environment
- Ensure port 5001 is not in use by another application
- Review the backend console for specific error messages

**MongoDB Connection Failures**:
- Confirm MongoDB is running: Check Task Manager (Windows) or Activity Monitor (Mac)
- Verify connection string in .env file
- The application will function without MongoDB but without persistence features

**Model Loading Issues**:
- Ensure sufficient RAM is available (model size + 2GB minimum)
- Verify the GGUF file is not corrupted
- Check backend console for detailed error messages
- Try unloading the current model before loading a new one

**Frontend Not Connecting to Backend**:
- Verify backend is running on port 5001
- Check browser console for CORS errors
- Ensure firewall is not blocking local connections
- Try accessing http://localhost:5001/api/health directly

**File Upload Failures**:
- Confirm total file size is under 10MB
- Verify files are .txt format
- Check that uploads directory exists and is writable
- Review backend logs for specific errors

## ⚡ Performance Optimization

### GGUF Model Performance

**CPU Optimization**:
- Use models quantized to Q4 or Q5 for faster inference
- Reduce context window size if experiencing slowdowns
- Close other resource-intensive applications

**GPU Acceleration**:
- Rebuild llama-cpp-python with CUDA support for NVIDIA GPUs
- Set n_gpu_layers parameter when loading models
- Monitor GPU memory usage to prevent out-of-memory errors

### Database Optimization

For users with extensive chat history:
- Regularly export and archive old conversations
- Use MongoDB indexes (automatically created) for faster queries
- Consider implementing pagination for chat history if needed

## 🔐 Privacy and Data Handling

### Data Storage

**Guest Mode**: 
- All data exists only in browser memory
- No data is transmitted to external servers (except to chosen AI APIs)
- Closing the browser tab destroys all session data

**Registered Users**:
- User profiles stored in MongoDB with hashed passwords
- Chat history stored locally in MongoDB instance
- No data is transmitted to external services except AI API providers
- Full data export available at any time

### AI Provider Data Policies

**Local GGUF Models**:
- All processing happens on your local machine
- No data is sent to external services
- Complete privacy and offline capability

**OpenAI API**:
- Messages sent to OpenAI servers for processing
- Subject to OpenAI's data usage policy
- API requests not used for model training by default

**Claude API**:
- Messages sent to Anthropic servers
- Subject to Anthropic's data usage policy
- Commercial API usage not used for model training

## 📄 License and Attribution

This project is released under the MIT License, which means:
- Free to use for personal and commercial purposes
- Modify and distribute as needed
- No warranty provided
- Attribution appreciated but not required

The MIT License provides maximum freedom while protecting the original authors from liability.

## 🤝 Contributing

While this is an open-source project, the codebase is designed to be easily forkable and customizable. If you make improvements:
- Fork the repository
- Make your changes
- Test thoroughly
- Share your modifications if desired

## 🙏 Acknowledgments

This project builds upon several excellent open-source technologies:
- React and the broader JavaScript ecosystem
- Flask and the Python web development community
- llama.cpp for efficient local model inference
- The creators of GGUF quantized models
- OpenAI and Anthropic for their API services