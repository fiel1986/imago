import os
from datetime import timedelta

class Config:
    # Configuración básica
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    
    # Configuración de archivos
    MAX_CONTENT_LENGTH = 50 * 1024 * 1024  # 50MB max file size
    UPLOAD_FOLDER = 'uploads'
    CONVERTED_FOLDER = 'converted'
    
    # Formatos permitidos
    ALLOWED_EXTENSIONS = {
        'png', 'jpg', 'jpeg', 'gif', 'bmp',
        'tiff', 'tif', 'webp', 'ico', 'svg'
    }
    
    # Configuración de conversión
    MAX_IMAGE_DIMENSION = 5000  # Máximo ancho/alto en píxeles
    DEFAULT_QUALITY = 85
    DEFAULT_FORMAT = 'JPEG'
    
    # Configuración de limpieza automática
    CLEANUP_AGE = 3600  # Segundos antes de eliminar archivos (1 hora)
    
    # Configuración de rate limiting
    RATELIMIT_DEFAULT = "100 per hour"
    
    @staticmethod
    def init_app(app):
        # Crear carpetas si no existen
        for folder in [app.config['UPLOAD_FOLDER'], 
                      app.config['CONVERTED_FOLDER']]:
            os.makedirs(folder, exist_ok=True)

class DevelopmentConfig(Config):
    DEBUG = True
    SESSION_COOKIE_SECURE = False

class ProductionConfig(Config):
    DEBUG = False
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    PERMANENT_SESSION_LIFETIME = timedelta(minutes=30)
    
    # En producción, usar variables de entorno
    @classmethod
    def init_app(cls, app):
        Config.init_app(app)
        # Configuración para producción
        app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY')

config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}