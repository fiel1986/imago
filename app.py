import os
import uuid
import shutil
from datetime import datetime
from pathlib import Path
import time
import threading
from flask import Flask, render_template, request, send_file, jsonify, session
from werkzeug.utils import secure_filename
from PIL import Image, ImageOps
import zipfile
from io import BytesIO

app = Flask(__name__)
app.config['SECRET_KEY'] = 'dev-secret-key-change-in-production'
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['CONVERTED_FOLDER'] = 'converted'
app.config['ALLOWED_EXTENSIONS'] = {'png', 'jpg', 'jpeg', 'gif', 'bmp', 'tiff', 'tif', 'webp', 'ico'}
app.config['MAX_IMAGE_DIMENSION'] = 5000
app.config['ICO_SIZES'] = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]


for folder in [app.config['UPLOAD_FOLDER'], app.config['CONVERTED_FOLDER']]:
    os.makedirs(folder, exist_ok=True)

class ImageConverter:
    def __init__(self):
        self.supported_formats = {
            'PNG': '.png',
            'JPEG': '.jpg',
            'JPG': '.jpg',
            'BMP': '.bmp',
            'GIF': '.gif',
            'TIFF': '.tiff',
            'ICO': '.ico',
            'WEBP': '.webp'
        }
        
       
        self.ico_sizes = app.config['ICO_SIZES']
        
    
        self.transparency_formats = ['PNG', 'GIF', 'ICO', 'WEBP']
        
      
        self.rgb_formats = ['JPEG', 'JPG', 'BMP']
    
    def allowed_file(self, filename):
        return '.' in filename and \
               filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']
    
    def get_unique_filename(self, folder, filename):
        """Generar un nombre único para el archivo"""
        path = Path(folder) / filename
        if not path.exists():
            return filename
        
        name, ext = os.path.splitext(filename)
        return f"{name}_{uuid.uuid4().hex[:8]}{ext}"
    
    def prepare_image_for_ico(self, img, size):
        """Prepara una imagen para convertirse a ICO"""
        width, height = size
        
        
        if img.mode != 'RGBA':
            img = img.convert('RGBA')
        
        square_img = Image.new('RGBA', (width, height), (255, 255, 255, 0))
        
        
        img_ratio = img.width / img.height
        target_ratio = width / height
        
        if img_ratio > target_ratio:
            
            new_width = width
            new_height = int(width / img_ratio)
        else:
            
            new_height = height
            new_width = int(height * img_ratio)
        
       
        resized_img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
        
        
        x_offset = (width - new_width) // 2
        y_offset = (height - new_height) // 2
        
        square_img.paste(resized_img, (x_offset, y_offset), resized_img)
        
        return square_img
    
    def create_multi_size_ico(self, img, output_path):
        """Crea un ICO con múltiples tamaños (16x16, 32x32, 48x48, 64x64, 128x128, 256x256)"""
        images_for_ico = []
        
        for size in self.ico_sizes:
            
            ico_img = self.prepare_image_for_ico(img, size)
            images_for_ico.append(ico_img)
        
    
        images_for_ico[0].save(
            output_path,
            format='ICO',
            sizes=[img.size for img in images_for_ico],
            append_images=images_for_ico[1:] if len(images_for_ico) > 1 else []
        )
    
    def convert_image(self, input_path, output_path, output_format, 
                     width=None, height=None, quality=85, maintain_aspect=True,
                     ico_multi_size=False):
        """Convertir imagen a otro formato y tamaño"""
        try:
            with Image.open(input_path) as img:
                original_format = img.format
                original_size = img.size
                original_mode = img.mode
             
                if output_format.upper() == 'ICO':
                    if ico_multi_size:
                       
                        self.create_multi_size_ico(img, output_path)
                    else:
                        
                        if not width and not height:
                            
                            width, height = 256, 256
                        
                        if width and not height:
                            height = width
                        elif height and not width:
                            width = height
                        
                        # Preparar y guardar ICO
                        ico_img = self.prepare_image_for_ico(img, (width, height))
                        ico_img.save(output_path, format='ICO', sizes=[(width, height)])
                    
                    output_size = os.path.getsize(output_path)
                    
                    return {
                        'success': True,
                        'original_size': original_size,
                        'original_format': original_format,
                        'output_size': output_size,
                        'output_dimensions': (width, height),
                        'is_ico': True,
                        'ico_multi_size': ico_multi_size
                    }
                
                
                if output_format.upper() in self.rgb_formats:
                    if img.mode in ('RGBA', 'LA', 'P'):
                        rgb_img = Image.new('RGB', img.size, (255, 255, 255))
                        if img.mode == 'P':
                            img = img.convert('RGBA')
                        rgb_img.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
                        img = rgb_img
                    elif img.mode == 'P':
                        img = img.convert('RGB')
                elif output_format.upper() in self.transparency_formats and img.mode == 'P':
                    img = img.convert('RGBA')
                
                
                if width or height:
                    if maintain_aspect:
                        original_width, original_height = img.size
                        
                        if width and height:
                            width_ratio = width / original_width
                            height_ratio = height / original_height
                            ratio = min(width_ratio, height_ratio)
                            new_width = int(original_width * ratio)
                            new_height = int(original_height * ratio)
                        elif width:
                            ratio = width / original_width
                            new_width = width
                            new_height = int(original_height * ratio)
                        elif height:
                            ratio = height / original_height
                            new_width = int(original_width * ratio)
                            new_height = height
                        
                        img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
                    else:
                        new_width = width or img.width
                        new_height = height or img.height
                        img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
                
              
                save_kwargs = {'format': output_format}
                
               
                if output_format.upper() in ['JPEG', 'JPG']:
                    save_kwargs['quality'] = quality
                    save_kwargs['optimize'] = True
                elif output_format.upper() == 'WEBP':
                    save_kwargs['quality'] = quality
                elif output_format.upper() == 'PNG':
                    save_kwargs['optimize'] = True
                elif output_format.upper() == 'GIF':
                    
                    if img.mode != 'P':
                        img = img.convert('P', palette=Image.Palette.ADAPTIVE)
                
                
                img.save(output_path, **save_kwargs)
                
                
                output_size = os.path.getsize(output_path)
                
                return {
                    'success': True,
                    'original_size': original_size,
                    'original_format': original_format,
                    'output_size': output_size,
                    'output_dimensions': img.size,
                    'compression_ratio': f"{((1 - (output_size / os.path.getsize(input_path))) * 100):.1f}%" 
                    if os.path.getsize(input_path) > 0 else "N/A",
                    'is_ico': False
                }
                
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_image_info(self, image_path):
        """Obtener información de la imagen"""
        try:
            with Image.open(image_path) as img:
                info = {
                    'format': img.format,
                    'dimensions': img.size,
                    'mode': img.mode,
                    'size_bytes': os.path.getsize(image_path),
                    'size_mb': os.path.getsize(image_path) / (1024 * 1024),
                    'is_animated': getattr(img, 'is_animated', False),
                    'n_frames': getattr(img, 'n_frames', 1)
                }
                return info
        except Exception as e:
            return {'error': str(e)}

converter = ImageConverter()

@app.route('/')
def index():
    return render_template('index.html', 
                         formats=list(converter.supported_formats.keys()),
                         ico_sizes=converter.ico_sizes)

@app.route('/upload', methods=['POST'])
def upload_file():
    try:
        if 'files' not in request.files:
            return jsonify({'error': 'No se seleccionaron archivos'}), 400
        
        files = request.files.getlist('files')
        if not files or files[0].filename == '':
            return jsonify({'error': 'No se seleccionaron archivos'}), 400
        
     
        output_format = request.form.get('format', 'JPEG').upper()
        quality = int(request.form.get('quality', 85))
        width = request.form.get('width', type=int)
        height = request.form.get('height', type=int)
        maintain_aspect = request.form.get('maintain_aspect', 'true') == 'true'
        batch_mode = request.form.get('batch', 'false') == 'true'
        
        ico_multi_size = request.form.get('ico_multi_size', 'false') == 'true'
        ico_size = request.form.get('ico_size', '256')
        
        
        if output_format == 'ICO' and not width and not height:
            width = height = int(ico_size)
        
        
        uploaded_files = []
        
        for file in files:
            if file and converter.allowed_file(file.filename):
                filename = secure_filename(file.filename)
                input_path = os.path.join(app.config['UPLOAD_FOLDER'], 
                                         f"temp_{uuid.uuid4().hex[:8]}_{filename}")
                file.save(input_path)
                
                
                info = converter.get_image_info(input_path)
                
                uploaded_files.append({
                    'path': input_path,
                    'filename': filename,
                    'original_name': file.filename,
                    'info': info
                })
            else:
                return jsonify({'error': f'Formato no permitido: {file.filename}'}), 400
        
        if batch_mode and len(uploaded_files) > 1:
            
            results = []
            session_id = str(uuid.uuid4())
            session_folder = os.path.join(app.config['CONVERTED_FOLDER'], session_id)
            os.makedirs(session_folder, exist_ok=True)
            
            for file_info in uploaded_files:
                try:
                    input_path = file_info['path']
                    filename = file_info['filename']
                    

                    name_without_ext = os.path.splitext(filename)[0]
                    output_filename = f"{name_without_ext}{converter.supported_formats.get(output_format, '.jpg')}"
                    output_path = os.path.join(session_folder, output_filename)
                    
                    
                    result = converter.convert_image(
                        input_path, output_path, output_format,
                        width, height, quality, maintain_aspect,
                        ico_multi_size
                    )
                    
                    if result['success']:
                        result.update({
                            'filename': file_info['original_name'],
                            'output_filename': output_filename,
                            'download_url': f'/download/{session_id}/{output_filename}',
                            'session_id': session_id
                        })
                    else:
                        result.update({
                            'filename': file_info['original_name'],
                            'error': result['error']
                        })
                    
                    results.append(result)
                    
                    
                    try:
                        os.remove(input_path)
                    except:
                        pass
                        
                except Exception as e:
                    results.append({
                        'success': False,
                        'filename': file_info['original_name'],
                        'error': str(e)
                    })
            
          
            zip_buffer = BytesIO()
            with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
                for result in results:
                    if result['success']:
                        file_path = os.path.join(session_folder, result['output_filename'])
                        zip_file.write(file_path, result['output_filename'])
            
            zip_buffer.seek(0)
            zip_filename = f'converted_images_{datetime.now().strftime("%Y%m%d_%H%M%S")}.zip'
            zip_path = os.path.join(app.config['CONVERTED_FOLDER'], zip_filename)
            
            with open(zip_path, 'wb') as f:
                f.write(zip_buffer.getvalue())
            
            return jsonify({
                'success': True,
                'batch': True,
                'zip_filename': zip_filename,
                'results': results,
                'download_url': f'/download/{zip_filename}'
            })
            
        else:
            
            if uploaded_files:
                file_info = uploaded_files[0]
                filename = file_info['filename']
                
               
                name_without_ext = os.path.splitext(filename)[0]
                output_filename = f"{name_without_ext}{converter.supported_formats.get(output_format, '.jpg')}"
                output_path = os.path.join(app.config['CONVERTED_FOLDER'], output_filename)
                
                
                result = converter.convert_image(
                    file_info['path'], output_path, output_format,
                    width, height, quality, maintain_aspect,
                    ico_multi_size
                )
                
                if result['success']:
                    result.update({
                        'filename': file_info['original_name'],
                        'output_filename': output_filename,
                        'download_url': f'/download/{output_filename}'
                    })
                else:
                    result.update({
                        'filename': file_info['original_name'],
                        'error': result['error']
                    })
                
                
                try:
                    os.remove(file_info['path'])
                except:
                    pass
                
                return jsonify(result)
        
        return jsonify({'error': 'No se pudo procesar la solicitud'}), 500
        
    except Exception as e:
        return jsonify({'error': f'Error del servidor: {str(e)}'}), 500

@app.route('/download/<path:filename>')
def download_file(filename):
    try:
        file_path = os.path.join(app.config['CONVERTED_FOLDER'], filename)
        
        if os.path.exists(file_path):
            return send_file(file_path, as_attachment=True, download_name=os.path.basename(filename))
        
        return jsonify({'error': 'Archivo no encontrado'}), 404
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


def cleanup_old_files():
    cleanup_age = 3600  
    now = time.time()
    
    for folder in [app.config['UPLOAD_FOLDER'], app.config['CONVERTED_FOLDER']]:
        if os.path.exists(folder):
            for item in os.listdir(folder):
                item_path = os.path.join(folder, item)
                try:
                    if os.stat(item_path).st_mtime < now - cleanup_age:
                        if os.path.isdir(item_path):
                            shutil.rmtree(item_path)
                        else:
                            os.remove(item_path)
                except:
                    pass

def start_cleanup_thread():
    def cleanup_loop():
        while True:
            try:
                cleanup_old_files()
            except:
                pass
            time.sleep(300)
    
    thread = threading.Thread(target=cleanup_loop, daemon=True)
    thread.start()

start_cleanup_thread()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)