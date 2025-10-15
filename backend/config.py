import os
from datetime import timedelta

class Config:
    """Base configuration"""
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    
    # Folders
    UPLOAD_FOLDER = 'uploads'
    MODEL_FOLDER = 'models'
    
    # File upload settings
    MAX_CONTENT_LENGTH = 500 * 1024 * 1024  # 500MB
    ALLOWED_EXTENSIONS = {'gguf', 'txt'}
    
    # Model settings
    DEFAULT_N_CTX = 2048
    DEFAULT_N_GPU_LAYERS = 0
    DEFAULT_TEMPERATURE = 0.7
    DEFAULT_MAX_TOKENS = 512
    DEFAULT_TOP_P = 0.9
    
    # CORS settings
    CORS_ORIGINS = ['http://localhost:5000', 'http://localhost:5173', 'http://localhost:3000']
    
    # Session settings
    PERMANENT_SESSION_LIFETIME = timedelta(days=7)

class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    TESTING = False

class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    TESTING = False
    
    # Override these in production
    SECRET_KEY = os.environ.get('SECRET_KEY')
    
    # Use environment variables for sensitive settings
    DATABASE_URI = os.environ.get('DATABASE_URI')
    
    # Tighter CORS in production
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', '').split(',')

class TestingConfig(Config):
    """Testing configuration"""
    DEBUG = True
    TESTING = True

# Configuration dictionary
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}