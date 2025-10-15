from flask import Flask, request, jsonify, Response, stream_with_context
from flask_cors import CORS
from werkzeug.utils import secure_filename
import os
import json
import time
from datetime import datetime
import requests
import hashlib
from pymongo import MongoClient
from bson import ObjectId
from dotenv import load_dotenv
import re

# Try to import llama_cpp but make it optional
try:
    from llama_cpp import Llama
    LLAMA_AVAILABLE = True
except ImportError:
    print("Warning: llama-cpp-python not installed. GGUF models will not work.")
    LLAMA_AVAILABLE = False
    Llama = None

load_dotenv()

app = Flask(__name__)
# CORS to allow frontend connection
CORS(app, origins=["http://localhost:5173", "http://127.0.0.1:5173"], supports_credentials=True)

UPLOAD_FOLDER = 'uploads'
MODEL_FOLDER = 'models'
ALLOWED_EXTENSIONS = {'gguf', 'txt'}
MAX_FILE_SIZE = 50 * 1024 * 1024 * 1024

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(MODEL_FOLDER, exist_ok=True)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MODEL_FOLDER'] = MODEL_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_FILE_SIZE

MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/')
DB_NAME = os.getenv('DB_NAME', 'chatbot_db')

try:
    mongo_client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    # Test the connection
    mongo_client.server_info()
    db = mongo_client[DB_NAME]
    users_collection = db['users']
    chats_collection = db['chats']
    models_collection = db['models']
    users_collection.create_index('email', unique=True)
    chats_collection.create_index('user_email')
    chats_collection.create_index('created_at')
    print("✓ MongoDB connected successfully")
except Exception as e:
    print(f"✗ MongoDB connection failed: {e}")
    print("Running without database - using local storage only")
    db = None

current_model = None
current_model_name = None

def allowed_file(filename, extension):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() == extension

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

def serialize_doc(doc):
    if doc is None:
        return None
    if isinstance(doc, list):
        return [serialize_doc(item) for item in doc]
    if isinstance(doc, dict):
        return {key: str(value) if isinstance(value, ObjectId) else value 
                for key, value in doc.items()}
    return doc

def format_messages_for_llama(messages):
    """Format messages for GGUF/llama.cpp models (supports multiple chat formats)"""
    formatted = ""
    
    for msg in messages:
        role = msg.get('role', 'user')
        content = msg.get('content', '').strip()
        
        if role == 'system':
            formatted += f"<|system|>\n{content}<|end|>\n"
        elif role == 'user':
            formatted += f"<|user|>\n{content}<|end|>\n"
        elif role == 'assistant':
            formatted += f"<|assistant|>\n{content}<|end|>\n"
    
    formatted += "<|assistant|>\n"
    return formatted

def clean_llama_response(response_text):
    """Clean GGUF model responses (works with various models)"""
    if not response_text:
        return ""
    
    # Remove common special tokens
    tokens_to_remove = [
        "<|end|>", "<|assistant|>", "<|user|>", "<|system|>",
        "<|im_start|>", "<|im_end|>",
        "[INST]", "[/INST]",
        "<<SYS>>", "<</SYS>>"
    ]
    
    cleaned = response_text
    for token in tokens_to_remove:
        cleaned = cleaned.replace(token, "")
    
    # Split by common delimiters and take first complete response
    for delimiter in ["\n<|", "<|user|>", "<|assistant|>", "\nUser:", "\nAssistant:", "\nHuman:", "\nAI:"]:
        if delimiter in cleaned:
            cleaned = cleaned.split(delimiter)[0]
            break
    
    # Remove extra whitespace
    cleaned = re.sub(r'\n{3,}', '\n\n', cleaned)
    cleaned = cleaned.strip()
    
    return cleaned

def get_windows_safe_path(filename):
    """Convert filename to Windows-safe path"""
    # First use secure_filename
    safe_name = secure_filename(filename)
    # Remove any remaining problematic characters for Windows
    safe_name = re.sub(r'[<>:"|?*]', '_', safe_name)
    # Limit length for Windows paths
    if len(safe_name) > 255:
        name, ext = os.path.splitext(safe_name)
        safe_name = name[:255-len(ext)] + ext
    return safe_name

@app.route('/api/auth/signup', methods=['POST'])
def signup():
    if db is None:
        return jsonify({'error': 'Database not available'}), 500
    data = request.json
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')
    if not all([username, email, password]):
        return jsonify({'error': 'All fields required'}), 400
    if users_collection.find_one({'email': email}):
        return jsonify({'error': 'User already exists'}), 400
    user_doc = {
        'username': username,
        'email': email,
        'password': hash_password(password),
        'profile_photo': None,
        'created_at': datetime.utcnow(),
        'updated_at': datetime.utcnow()
    }
    result = users_collection.insert_one(user_doc)
    return jsonify({
        'message': 'User created successfully',
        'user': {
            'id': str(result.inserted_id),
            'username': username,
            'email': email
        }
    }), 201

@app.route('/api/auth/login', methods=['POST'])
def login():
    if db is None:
        return jsonify({'error': 'Database not available'}), 500
    data = request.json
    email = data.get('email')
    password = data.get('password')
    if not email or not password:
        return jsonify({'error': 'Email and password required'}), 400
    user = users_collection.find_one({'email': email})
    if not user or user['password'] != hash_password(password):
        return jsonify({'error': 'Invalid credentials'}), 401
    return jsonify({
        'message': 'Login successful',
        'user': {
            'id': str(user['_id']),
            'username': user['username'],
            'email': user['email'],
            'profile_photo': user.get('profile_photo')
        }
    }), 200

@app.route('/api/auth/profile', methods=['GET', 'PUT'])
def profile():
    if db is None:
        return jsonify({'error': 'Database not available'}), 500
    email = request.args.get('email') if request.method == 'GET' else request.json.get('email')
    if not email:
        return jsonify({'error': 'Email required'}), 400
    if request.method == 'GET':
        user = users_collection.find_one({'email': email})
        if not user:
            return jsonify({'error': 'User not found'}), 404
        return jsonify({
            'user': {
                'username': user['username'],
                'email': user['email'],
                'profile_photo': user.get('profile_photo')
            }
        }), 200
    elif request.method == 'PUT':
        data = request.json
        update_data = {}
        if 'username' in data:
            update_data['username'] = data['username']
        if 'profile_photo' in data:
            update_data['profile_photo'] = data['profile_photo']
        if 'password' in data and data['password']:
            update_data['password'] = hash_password(data['password'])
        update_data['updated_at'] = datetime.utcnow()
        result = users_collection.update_one(
            {'email': email},
            {'$set': update_data}
        )
        if result.modified_count == 0:
            return jsonify({'error': 'User not found or no changes'}), 404
        return jsonify({'message': 'Profile updated successfully'}), 200

@app.route('/api/model/upload', methods=['POST'])
def upload_model():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    if not allowed_file(file.filename, 'gguf'):
        return jsonify({'error': 'Only .gguf files allowed'}), 400
    
    # Get the original filename and create a safe version
    original_filename = file.filename
    safe_filename = get_windows_safe_path(original_filename)
    
    # Use absolute path and normalize it for Windows
    model_folder = os.path.abspath(app.config['MODEL_FOLDER'])
    filepath = os.path.normpath(os.path.join(model_folder, safe_filename))
    
    # Ensure we're still within the intended directory (security check)
    if not filepath.startswith(os.path.abspath(model_folder)):
        return jsonify({'error': 'Invalid file path'}), 400
    
    # Ensure the models directory exists
    os.makedirs(model_folder, exist_ok=True)
    
    try:
        # Check if file already exists and handle accordingly
        if os.path.exists(filepath):
            # Option 1: Return error asking user to unload first
            return jsonify({
                'error': f'Model {safe_filename} already exists. Please unload the current model first or rename your file.',
                'filename': safe_filename
            }), 400
            
            # Option 2: Create unique filename (uncomment if you prefer this approach)
            # name, ext = os.path.splitext(safe_filename)
            # counter = 1
            # while os.path.exists(filepath):
            #     safe_filename = f"{name}_{counter}{ext}"
            #     filepath = os.path.normpath(os.path.join(model_folder, safe_filename))
            #     counter += 1
        
        file.save(filepath)
        
        # Verify file was saved and is a valid GGUF file
        if not os.path.exists(filepath):
            return jsonify({'error': 'Failed to save model file'}), 500
            
        file_size = os.path.getsize(filepath)
        if file_size == 0:
            os.remove(filepath)  # Clean up empty file
            return jsonify({'error': 'Uploaded file is empty'}), 400
        
        if db is not None:
            model_doc = {
                'filename': safe_filename,
                'filepath': filepath,
                'size': file_size,
                'uploaded_at': datetime.utcnow()
            }
            models_collection.update_one(
                {'filename': safe_filename},
                {'$set': model_doc},
                upsert=True
            )
        
        return jsonify({
            'message': 'Model uploaded successfully',
            'filename': safe_filename,
            'path': filepath,
            'size': file_size
        }), 200
        
    except Exception as e:
        # Clean up if something went wrong
        if os.path.exists(filepath):
            try:
                os.remove(filepath)
            except:
                pass
        error_msg = f'Failed to save model: {str(e)}'
        print(f"Upload error: {error_msg}")
        return jsonify({'error': error_msg}), 500

@app.route('/api/model/load', methods=['POST'])
def load_model():
    global current_model, current_model_name
    
    if not LLAMA_AVAILABLE:
        return jsonify({'error': 'llama-cpp-python is not installed. Please install it to use GGUF models.'}), 500
    
    data = request.json
    model_name = data.get('model_name')
    n_ctx = data.get('n_ctx', 2048)
    n_gpu_layers = data.get('n_gpu_layers', 0)
    
    if not model_name:
        return jsonify({'error': 'Model name required'}), 400
    
    model_path = os.path.join(app.config['MODEL_FOLDER'], model_name)
    
    if not os.path.exists(model_path):
        return jsonify({'error': f'Model not found at {model_path}'}), 404
    
    try:
        if current_model:
            del current_model
            current_model = None
        
        print(f"Loading model: {model_name}")
        print(f"Model path: {model_path}")
        
        current_model = Llama(
            model_path=model_path,
            n_ctx=n_ctx,
            n_gpu_layers=n_gpu_layers,
            verbose=True,
            use_mlock=False,
            use_mmap=True
        )
        
        current_model_name = model_name
        
        print("Testing model with simple prompt...")
        test_response = current_model("Hello", max_tokens=10)
        print(f"Model test successful: {test_response}")
        
        if db is not None:
            models_collection.update_one(
                {'filename': model_name},
                {'$set': {
                    'last_loaded': datetime.utcnow(),
                    'n_ctx': n_ctx,
                    'n_gpu_layers': n_gpu_layers
                }},
                upsert=True
            )
        
        return jsonify({
            'message': 'Model loaded successfully',
            'model_name': model_name,
            'n_ctx': n_ctx,
            'test_response': test_response
        }), 200
        
    except Exception as e:
        error_msg = f'Failed to load model: {str(e)}'
        print(error_msg)
        return jsonify({'error': error_msg}), 500

@app.route('/api/model/unload', methods=['POST'])
def unload_model():
    global current_model, current_model_name
    if current_model:
        del current_model
        current_model = None
        current_model_name = None
        return jsonify({'message': 'Model unloaded successfully'}), 200
    return jsonify({'message': 'No model loaded'}), 200

@app.route('/api/model/status', methods=['GET'])
def model_status():
    return jsonify({
        'loaded': current_model is not None,
        'model_name': current_model_name
    }), 200

@app.route('/api/model/list', methods=['GET'])
def list_models():
    models = []
    for filename in os.listdir(app.config['MODEL_FOLDER']):
        if filename.endswith('.gguf'):
            filepath = os.path.join(app.config['MODEL_FOLDER'], filename)
            model_info = {
                'filename': filename,
                'size': os.path.getsize(filepath)
            }
            if db is not None:
                model_doc = models_collection.find_one({'filename': filename})
                if model_doc:
                    model_info['uploaded_at'] = model_doc.get('uploaded_at')
                    model_info['last_loaded'] = model_doc.get('last_loaded')
            models.append(model_info)
    return jsonify({'models': serialize_doc(models)}), 200

@app.route('/api/chat/completions', methods=['POST'])
def chat_completion():
    global current_model
    data = request.json
    messages = data.get('messages', [])
    model_type = data.get('model_type', 'gguf')
    api_key = data.get('api_key')
    settings = data.get('settings', {})
    
    if not messages:
        return jsonify({'error': 'Messages required'}), 400
    
    if model_type == 'gguf':
        if not current_model:
            return jsonify({'error': 'No model loaded. Please upload and load a GGUF model first.'}), 400
        
        try:
            prompt = format_messages_for_llama(messages)
            temperature = settings.get('temperature', 0.7)
            max_tokens = settings.get('max_tokens', 512)
            top_p = settings.get('top_p', 0.9)
            
            response = current_model(
                prompt,
                max_tokens=max_tokens,
                temperature=temperature,
                top_p=top_p,
                echo=False,
                stop=["<|end|>", "<|user|>", "<|assistant|>"]
            )
            
            raw_response = response['choices'][0]['text']
            cleaned_response = clean_llama_response(raw_response)
            
            return jsonify({
                'response': cleaned_response,
                'model': current_model_name,
                'usage': {
                    'prompt_tokens': response.get('usage', {}).get('prompt_tokens', 0),
                    'completion_tokens': response.get('usage', {}).get('completion_tokens', 0),
                    'total_tokens': response.get('usage', {}).get('total_tokens', 0)
                }
            }), 200
            
        except Exception as e:
            return jsonify({'error': f'Model generation failed: {str(e)}'}), 500
    
    elif model_type == 'openai':
        if not api_key:
            return jsonify({'error': 'OpenAI API key required'}), 400
        try:
            response = requests.post(
                'https://api.openai.com/v1/chat/completions',
                headers={
                    'Content-Type': 'application/json',
                    'Authorization': f'Bearer {api_key}'
                },
                json={
                    'model': settings.get('model', 'gpt-4o'),
                    'messages': messages,
                    'temperature': settings.get('temperature', 0.7),
                    'max_tokens': settings.get('max_tokens', 512),
                    'top_p': settings.get('top_p', 0.9)
                }
            )
            if response.status_code != 200:
                return jsonify({'error': response.json()}), response.status_code
            data = response.json()
            return jsonify({
                'response': data['choices'][0]['message']['content'],
                'model': data['model'],
                'usage': data.get('usage', {})
            }), 200
        except Exception as e:
            return jsonify({'error': f'OpenAI API failed: {str(e)}'}), 500
    
    elif model_type == 'claude':
        if not api_key:
            return jsonify({'error': 'Claude API key required'}), 400
        try:
            response = requests.post(
                'https://api.anthropic.com/v1/messages',
                headers={
                    'Content-Type': 'application/json',
                    'x-api-key': api_key,
                    'anthropic-version': '2023-06-01'
                },
                json={
                    'model': settings.get('model', 'claude-3-5-sonnet-20241022'),
                    'messages': messages,
                    'temperature': settings.get('temperature', 0.7),
                    'max_tokens': settings.get('max_tokens', 512)
                }
            )
            if response.status_code != 200:
                return jsonify({'error': response.json()}), response.status_code
            data = response.json()
            return jsonify({
                'response': data['content'][0]['text'],
                'model': data['model'],
                'usage': data.get('usage', {})
            }), 200
        except Exception as e:
            return jsonify({'error': f'Claude API failed: {str(e)}'}), 500
    
    return jsonify({'error': 'Invalid model type'}), 400

@app.route('/api/file/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    files = request.files.getlist('file')
    uploaded_files = []
    
    for file in files:
        if file.filename == '':
            continue
        if not allowed_file(file.filename, 'txt'):
            return jsonify({'error': f'Only .txt files allowed: {file.filename}'}), 400
        
        filename = secure_filename(file.filename)
        upload_folder = os.path.abspath(app.config['UPLOAD_FOLDER'])
        filepath = os.path.join(upload_folder, filename)
        
        # Ensure upload directory exists
        os.makedirs(upload_folder, exist_ok=True)
        
        try:
            file.save(filepath)
            
            # Read file content with error handling for encoding
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
            except UnicodeDecodeError:
                # Fallback to latin-1 if utf-8 fails
                with open(filepath, 'r', encoding='latin-1') as f:
                    content = f.read()
            
            uploaded_files.append({
                'name': filename,
                'content': content,
                'size': os.path.getsize(filepath)
            })
            
            # Clean up the uploaded file after reading
            try:
                os.remove(filepath)
            except:
                pass  # Ignore cleanup errors
                
        except Exception as e:
            return jsonify({'error': f'Failed to process file {filename}: {str(e)}'}), 500
    
    return jsonify({'files': uploaded_files}), 200

@app.route('/api/history/save', methods=['POST'])
def save_history():
    if db is None:
        return jsonify({'error': 'Database not available'}), 500
    data = request.json
    user_email = data.get('user_email')
    chat_id = data.get('chat_id')
    messages = data.get('messages', [])
    title = data.get('title', 'New Chat')
    if not user_email:
        return jsonify({'error': 'User email required'}), 400
    if not chat_id:
        chat_id = str(int(time.time() * 1000))
    chat_doc = {
        'chat_id': chat_id,
        'user_email': user_email,
        'title': title,
        'messages': messages,
        'created_at': datetime.utcnow(),
        'updated_at': datetime.utcnow()
    }
    chats_collection.update_one(
        {'chat_id': chat_id, 'user_email': user_email},
        {'$set': chat_doc},
        upsert=True
    )
    return jsonify({
        'message': 'Chat saved successfully',
        'chat_id': chat_id
    }), 200

@app.route('/api/history/list', methods=['GET'])
def list_history():
    if db is None:
        return jsonify({'error': 'Database not available'}), 500
    user_email = request.args.get('user_email')
    if not user_email:
        return jsonify({'error': 'User email required'}), 400
    chats = list(chats_collection.find(
        {'user_email': user_email}
    ).sort('created_at', -1))
    formatted_chats = []
    for chat in chats:
        formatted_chats.append({
            'id': chat['chat_id'],
            'title': chat['title'],
            'messages': chat['messages'],
            'timestamp': chat['created_at'].isoformat() if isinstance(chat['created_at'], datetime) else chat['created_at']
        })
    return jsonify({'chats': formatted_chats}), 200

@app.route('/api/history/delete', methods=['DELETE'])
def delete_history():
    if db is None:
        return jsonify({'error': 'Database not available'}), 500
    user_email = request.args.get('user_email')
    chat_id = request.args.get('chat_id')
    if not user_email or not chat_id:
        return jsonify({'error': 'User email and chat ID required'}), 400
    result = chats_collection.delete_one({
        'chat_id': chat_id,
        'user_email': user_email
    })
    if result.deleted_count == 0:
        return jsonify({'error': 'Chat not found'}), 404
    return jsonify({'message': 'Chat deleted successfully'}), 200

@app.route('/api/history/rename', methods=['PUT'])
def rename_history():
    if db is None:
        return jsonify({'error': 'Database not available'}), 500
    data = request.json
    user_email = data.get('user_email')
    chat_id = data.get('chat_id')
    new_title = data.get('title')
    if not user_email or not chat_id or not new_title:
        return jsonify({'error': 'User email, chat ID, and new title required'}), 400
    result = chats_collection.update_one(
        {'chat_id': chat_id, 'user_email': user_email},
        {'$set': {'title': new_title, 'updated_at': datetime.utcnow()}}
    )
    if result.modified_count == 0:
        return jsonify({'error': 'Chat not found'}), 404
    return jsonify({'message': 'Chat renamed successfully'}), 200

@app.route('/api/history/export', methods=['GET'])
def export_history():
    if db is None:
        return jsonify({'error': 'Database not available'}), 500
    user_email = request.args.get('user_email')
    if not user_email:
        return jsonify({'error': 'User email required'}), 400
    chats = list(chats_collection.find({'user_email': user_email}))
    formatted_chats = []
    for chat in chats:
        formatted_chats.append({
            'id': chat['chat_id'],
            'title': chat['title'],
            'messages': chat['messages'],
            'timestamp': chat['created_at'].isoformat() if isinstance(chat['created_at'], datetime) else chat['created_at']
        })
    export_data = {
        'user': user_email,
        'exported_at': datetime.utcnow().isoformat(),
        'chats': formatted_chats
    }
    return jsonify(export_data), 200

@app.route('/api/history/clear', methods=['DELETE'])
def clear_history():
    if db is None:
        return jsonify({'error': 'Database not available'}), 500
    user_email = request.args.get('user_email')
    if not user_email:
        return jsonify({'error': 'User email required'}), 400
    result = chats_collection.delete_many({'user_email': user_email})
    return jsonify({
        'message': f'Deleted {result.deleted_count} chats',
        'count': result.deleted_count
    }), 200

@app.route('/api/health', methods=['GET'])
def health_check():
    mongo_status = 'connected' if db is not None else 'disconnected'
    model_status = 'loaded' if current_model is not None else 'not loaded'
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat(),
        'database': mongo_status,
        'model_loaded': current_model is not None,
        'model_name': current_model_name,
        'llama_available': LLAMA_AVAILABLE,
        'message': 'Backend is running correctly!'
    }), 200

@app.route('/api/test', methods=['GET'])
def test_endpoint():
    return jsonify({
        'message': 'Backend is working!',
        'timestamp': datetime.utcnow().isoformat()
    }), 200

@app.route('/api/stats', methods=['GET'])
def get_stats():
    if db is None:
        return jsonify({'error': 'Database not available'}), 500
    total_users = users_collection.count_documents({})
    total_chats = chats_collection.count_documents({})
    total_models = models_collection.count_documents({})
    return jsonify({
        'total_users': total_users,
        'total_chats': total_chats,
        'total_models': total_models
    }), 200

if __name__ == '__main__':
    print("Starting Flask backend server...")
    print("Make sure you have installed all required packages:")
    print("pip install flask flask-cors pymongo python-dotenv requests")
    print("For GGUF models: pip install llama-cpp-python")
    print("Server will run on: http://localhost:5001")
    app.run(host='0.0.0.0', port=5001, debug=True)