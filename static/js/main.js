// Variables globales
let uploadedFiles = [];
let conversionResults = [];

// Elementos DOM
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const browseBtn = document.getElementById('browse-btn');
const convertBtn = document.getElementById('convert-btn');
const fileList = document.getElementById('file-list');
const previewContainer = document.getElementById('preview-container');
const previewImage = document.getElementById('preview-image');
const previewImg = document.getElementById('preview-img');
const previewInfo = document.getElementById('preview-info');
const previewPlaceholder = document.getElementById('preview-placeholder');
const progressContainer = document.getElementById('progress-container');
const progressBar = document.getElementById('progress-bar');
const progressText = document.getElementById('progress-text');
const resultsContainer = document.getElementById('results-container');
const resultsContent = document.getElementById('results-content');
const resultsActions = document.getElementById('results-actions');
const qualitySelect = document.getElementById('quality');
const customQualityContainer = document.getElementById('custom-quality-container');
const customQuality = document.getElementById('custom-quality');
const qualityValue = document.getElementById('quality-value');
const formatSelect = document.getElementById('format');
const widthInput = document.getElementById('width');
const heightInput = document.getElementById('height');
const maintainAspect = document.getElementById('maintain-aspect');
const batchMode = document.getElementById('batch-mode');
const clearAllBtn = document.getElementById('clear-all');
const infoModal = document.getElementById('info-modal');
const closeModal = document.getElementById('close-modal');
const modalBody = document.getElementById('modal-body');
const icoOptions = document.getElementById('ico-options');
const icoMultiSize = document.getElementById('ico-multi-size');
const icoSizeSelect = document.getElementById('ico-size');

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    console.log('Inicializando aplicación...');
    
    // Configurar calidad personalizada
    if (qualitySelect) {
        qualitySelect.addEventListener('change', function() {
            if (this.value === 'custom') {
                if (customQualityContainer) customQualityContainer.classList.remove('hidden');
            } else {
                if (customQualityContainer) customQualityContainer.classList.add('hidden');
            }
        });
    }
    
    if (customQuality && qualityValue) {
        customQuality.addEventListener('input', function() {
            qualityValue.textContent = `${this.value}%`;
        });
    }
    
    // Configurar opciones ICO
    if (formatSelect && icoOptions) {
        formatSelect.addEventListener('change', function() {
            if (this.value === 'ICO') {
                icoOptions.classList.remove('hidden');
                
                // Para ICO, forzar cuadrado y mantener relación de aspecto
                if (maintainAspect) {
                    maintainAspect.checked = true;
                    maintainAspect.disabled = true;
                }
                
                // Si no hay dimensiones especificadas, usar 256x256
                if (widthInput && heightInput) {
                    if (!widthInput.value && !heightInput.value) {
                        widthInput.value = 256;
                        heightInput.value = 256;
                    }
                }
            } else {
                icoOptions.classList.add('hidden');
                if (maintainAspect) {
                    maintainAspect.disabled = false;
                }
            }
        });
    }
    
    // Mantener relación de aspecto
    if (widthInput && heightInput && maintainAspect) {
        widthInput.addEventListener('input', function() {
            if (maintainAspect.checked && uploadedFiles.length > 0) {
                const file = uploadedFiles[0];
                if (file && file.dimensions) {
                    const origWidth = file.dimensions.width;
                    const origHeight = file.dimensions.height;
                    if (origWidth > 0 && this.value) {
                        const newHeight = Math.round((origHeight / origWidth) * this.value);
                        heightInput.value = newHeight;
                    }
                }
            }
        });
        
        heightInput.addEventListener('input', function() {
            if (maintainAspect.checked && uploadedFiles.length > 0) {
                const file = uploadedFiles[0];
                if (file && file.dimensions) {
                    const origWidth = file.dimensions.width;
                    const origHeight = file.dimensions.height;
                    if (origHeight > 0 && this.value) {
                        const newWidth = Math.round((origWidth / origHeight) * this.value);
                        widthInput.value = newWidth;
                    }
                }
            }
        });
    }
    
    // Inicializar event listeners
    initEventListeners();
    updateFileCount();
    updateConvertButton();
});

// Event Listeners
function initEventListeners() {
    console.log('Inicializando event listeners...');
    
    // Arrastrar y soltar
    if (dropZone) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, preventDefaults, false);
        });
        
        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }
        
        dropZone.addEventListener('dragenter', () => {
            dropZone.classList.add('dragover');
        });
        
        dropZone.addEventListener('dragover', () => {
            dropZone.classList.add('dragover');
        });
        
        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('dragover');
        });
        
        dropZone.addEventListener('drop', (e) => {
            dropZone.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                handleFiles(files);
            }
        });
    }
    
    // Seleccionar archivos
    if (browseBtn && fileInput) {
        browseBtn.addEventListener('click', function(e) {
            e.preventDefault();
            fileInput.click();
        });
        
        fileInput.addEventListener('change', function(e) {
            if (e.target.files.length > 0) {
                handleFiles(e.target.files);
            }
        });
    }
    
    // Convertir
    if (convertBtn) {
        convertBtn.addEventListener('click', convertImages);
    }
    
    // Limpiar todo
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', clearAll);
    }
    
    // Cerrar modal
    if (closeModal && infoModal) {
        closeModal.addEventListener('click', () => {
            infoModal.classList.add('hidden');
        });
        
        infoModal.addEventListener('click', (e) => {
            if (e.target === infoModal) {
                infoModal.classList.add('hidden');
            }
        });
    }
    
    // Tecla ESC para cerrar modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && infoModal && !infoModal.classList.contains('hidden')) {
            infoModal.classList.add('hidden');
        }
    });
}

// Manejar archivos seleccionados
function handleFiles(files) {
    console.log('Manejando archivos:', files.length);
    
    if (!files || files.length === 0) {
        showError('No se seleccionaron archivos');
        return;
    }
    
    // Convertir FileList a Array
    const fileArray = Array.from(files);
    
    // Filtrar solo imágenes
    const imageFiles = fileArray.filter(file => {
        return file.type.startsWith('image/');
    });
    
    if (imageFiles.length === 0) {
        showError('Por favor, selecciona solo archivos de imagen (JPG, PNG, etc.)');
        return;
    }
    
    // Verificar tamaño máximo (50MB)
    const maxSize = 50 * 1024 * 1024;
    const oversizedFiles = imageFiles.filter(file => file.size > maxSize);
    
    if (oversizedFiles.length > 0) {
        showError(`Algunos archivos exceden el tamaño máximo de 50MB`);
        return;
    }
    
    // Procesar cada archivo
    imageFiles.forEach((file, index) => {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            const fileData = {
                file: file,
                dataUrl: e.target.result,
                id: Date.now() + index,
                name: file.name,
                size: formatFileSize(file.size),
                type: file.type,
                dimensions: null,
                aspectRatio: null
            };
            
            // Obtener información de la imagen
            const img = new Image();
            img.onload = function() {
                fileData.dimensions = { 
                    width: this.width, 
                    height: this.height 
                };
                fileData.aspectRatio = (this.width / this.height).toFixed(2);
                
                // Agregar a la lista
                uploadedFiles.push(fileData);
                
                // Actualizar UI
                addFileToList(fileData);
                updateFileCount();
                updateConvertButton();
                
                // Mostrar vista previa del primer archivo
                if (uploadedFiles.length === 1) {
                    showPreview(fileData);
                }
                
                console.log('Archivo agregado:', fileData.name);
            };
            
            img.onerror = function() {
                console.warn('No se pudieron obtener dimensiones para:', file.name);
                // Agregar sin dimensiones
                uploadedFiles.push(fileData);
                addFileToList(fileData);
                updateFileCount();
                updateConvertButton();
                
                if (uploadedFiles.length === 1) {
                    showPreview(fileData);
                }
            };
            
            img.src = e.target.result;
        };
        
        reader.onerror = function() {
            console.error('Error al leer archivo:', file.name);
            showError(`Error al leer el archivo: ${file.name}`);
        };
        
        reader.readAsDataURL(file);
    });
    
    // Resetear input file
    if (fileInput) {
        fileInput.value = '';
    }
}

// Agregar archivo a la lista
function addFileToList(fileData) {
    if (!fileList) return;
    
    const fileItem = document.createElement('div');
    fileItem.className = 'file-item';
    fileItem.dataset.id = fileData.id;
    
    fileItem.innerHTML = `
        <div class="file-info">
            <i class="fas fa-file-image file-icon"></i>
            <div class="file-name" title="${fileData.name}">${fileData.name}</div>
            <div class="file-size">${fileData.size}</div>
        </div>
        <div class="file-actions">
            <button class="file-action-btn" onclick="showFileInfo(${fileData.id})" title="Información">
                <i class="fas fa-info-circle"></i>
            </button>
            <button class="file-action-btn" onclick="removeFile(${fileData.id})" title="Eliminar">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
    
    fileList.appendChild(fileItem);
}

// Mostrar información del archivo - FUNCIÓN GLOBAL
window.showFileInfo = function(fileId) {
    const fileData = uploadedFiles.find(f => f.id === fileId);
    if (!fileData || !modalBody || !infoModal) return;
    
    let infoHTML = `
        <div class="file-info-modal">
            <div class="info-item">
                <strong>Nombre:</strong> ${fileData.name}
            </div>
            <div class="info-item">
                <strong>Tamaño:</strong> ${fileData.size}
            </div>
            <div class="info-item">
                <strong>Tipo:</strong> ${fileData.type}
            </div>
    `;
    
    if (fileData.dimensions) {
        infoHTML += `
            <div class="info-item">
                <strong>Dimensiones:</strong> ${fileData.dimensions.width} × ${fileData.dimensions.height} px
            </div>
            <div class="info-item">
                <strong>Relación de aspecto:</strong> ${fileData.aspectRatio}
            </div>
        `;
    }
    
    infoHTML += `</div>`;
    
    modalBody.innerHTML = infoHTML;
    infoModal.classList.remove('hidden');
}

// Eliminar archivo - FUNCIÓN GLOBAL
window.removeFile = function(fileId) {
    uploadedFiles = uploadedFiles.filter(f => f.id !== fileId);
    const fileItem = document.querySelector(`.file-item[data-id="${fileId}"]`);
    if (fileItem) {
        fileItem.remove();
    }
    
    updateFileCount();
    updateConvertButton();
    
    // Actualizar vista previa
    if (uploadedFiles.length > 0) {
        showPreview(uploadedFiles[0]);
    } else {
        hidePreview();
    }
}

// Mostrar vista previa
function showPreview(fileData) {
    if (!previewImg || !previewInfo || !previewPlaceholder || !previewImage) return;
    
    previewImg.src = fileData.dataUrl;
    previewImg.alt = fileData.name;
    
    let infoHtml = `<strong>${fileData.name}</strong><br>${fileData.size}`;
    
    if (fileData.dimensions) {
        infoHtml += ` • ${fileData.dimensions.width}×${fileData.dimensions.height} px`;
    }
    
    previewInfo.innerHTML = infoHtml;
    previewPlaceholder.classList.add('hidden');
    previewImage.classList.remove('hidden');
}

// Ocultar vista previa
function hidePreview() {
    if (!previewPlaceholder || !previewImage || !previewImg || !previewInfo) return;
    
    previewPlaceholder.classList.remove('hidden');
    previewImage.classList.add('hidden');
    previewImg.src = '';
    previewInfo.innerHTML = '';
}

// Actualizar contador de archivos
function updateFileCount() {
    const countElement = document.getElementById('file-count');
    if (countElement) {
        countElement.textContent = `${uploadedFiles.length} archivo${uploadedFiles.length !== 1 ? 's' : ''}`;
    }
}

// Actualizar estado del botón de conversión
function updateConvertButton() {
    if (convertBtn) {
        convertBtn.disabled = uploadedFiles.length === 0;
    }
}

// Mostrar error
function showError(message) {
    alert('Error: ' + message);
}

// Convertir imágenes
async function convertImages() {
    console.log('Iniciando conversión...');
    
    if (uploadedFiles.length === 0) {
        showError('No hay archivos para convertir');
        return;
    }
    
    // Obtener configuración
    const format = formatSelect ? formatSelect.value : 'JPEG';
    const quality = qualitySelect ? (qualitySelect.value === 'custom' ? customQuality.value : qualitySelect.value) : '85';
    let width = widthInput ? widthInput.value : null;
    let height = heightInput ? heightInput.value : null;
    const keepAspect = maintainAspect ? maintainAspect.checked : true;
    const isBatch = batchMode ? batchMode.checked : false;
    
    // Obtener configuración ICO
    const icoMultiSizeChecked = icoMultiSize ? icoMultiSize.checked : false;
    const icoSizeValue = icoSizeSelect ? icoSizeSelect.value : '256';
    
    // Para ICO, si se selecciona múltiples tamaños, ignorar width/height individuales
    if (format === 'ICO' && icoMultiSizeChecked) {
        width = null;
        height = null;
    }
    
    // Validar
    if (width && (width < 1 || width > 5000)) {
        showError('El ancho debe estar entre 1 y 5000 píxeles');
        return;
    }
    
    if (height && (height < 1 || height > 5000)) {
        showError('El alto debe estar entre 1 y 5000 píxeles');
        return;
    }
    
    // Deshabilitar botón y mostrar progreso
    if (convertBtn) convertBtn.disabled = true;
    if (progressContainer) {
        progressContainer.classList.remove('hidden');
        progressBar.style.width = '0%';
        progressText.textContent = '0%';
    }
    
    try {
        // Preparar FormData
        const formData = new FormData();
        
        // Agregar archivos
        uploadedFiles.forEach(fileData => {
            formData.append('files', fileData.file);
        });
        
        // Agregar configuración
        formData.append('format', format);
        formData.append('quality', quality);
        if (width) formData.append('width', width);
        if (height) formData.append('height', height);
        formData.append('maintain_aspect', keepAspect.toString());
        formData.append('batch', isBatch.toString());
        
        // Agregar parámetros ICO si es necesario
        if (format === 'ICO') {
            formData.append('ico_multi_size', icoMultiSizeChecked.toString());
            formData.append('ico_size', icoSizeValue);
        }
        
        // Simular progreso
        simulateProgress();
        
        // Enviar solicitud
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Procesar resultados
            conversionResults = data;
            showResults(data);
        } else {
            throw new Error(data.error || 'Error en la conversión');
        }
    } catch (error) {
        console.error('Error en conversión:', error);
        showError(error.message);
    } finally {
        // Restaurar UI
        if (convertBtn) convertBtn.disabled = false;
        if (progressContainer) progressContainer.classList.add('hidden');
    }
}

// Simular progreso
function simulateProgress() {
    let progress = 0;
    const interval = setInterval(() => {
        progress += Math.random() * 20;
        if (progress >= 100) {
            progress = 100;
            clearInterval(interval);
        }
        if (progressBar) progressBar.style.width = `${progress}%`;
        if (progressText) progressText.textContent = `${Math.round(progress)}%`;
    }, 200);
}

// Mostrar resultados
function showResults(data) {
    if (!resultsContainer || !resultsContent || !resultsActions) return;
    
    resultsContainer.classList.remove('hidden');
    resultsContent.innerHTML = '';
    resultsActions.innerHTML = '';
    
    if (data.success) {
        if (data.batch) {
            // Resultados en lote
            resultsContent.innerHTML = `
                <div style="text-align: center; padding: 20px;">
                    <i class="fas fa-check-circle" style="font-size: 2rem; color: #4cc9f0;"></i>
                    <p style="margin-top: 10px; font-weight: bold;">¡Conversión exitosa!</p>
                    <p>Se procesaron ${data.results?.length || 0} imágenes correctamente.</p>
                    <p>Todas las imágenes están empaquetadas en un archivo ZIP.</p>
                </div>
            `;
            
            resultsActions.innerHTML = `
                <button class="btn btn-success" onclick="downloadResultFile('${data.download_url}', '${data.zip_filename}')">
                    <i class="fas fa-download"></i> Descargar ZIP
                </button>
                <button class="btn btn-primary" onclick="convertMore()">
                    <i class="fas fa-sync"></i> Convertir más
                </button>
            `;
        } else {
            // Resultado individual
            resultsContent.innerHTML = `
                <div style="text-align: center; padding: 20px;">
                    <i class="fas fa-check-circle" style="font-size: 2rem; color: #4cc9f0;"></i>
                    <p style="margin-top: 10px; font-weight: bold;">¡Conversión exitosa!</p>
                    <p>Archivo: ${data.filename || 'N/A'}</p>
                    ${data.output_dimensions ? 
                      `<p>Tamaño convertido: ${data.output_dimensions[0]}×${data.output_dimensions[1]} px</p>` : ''}
                    ${data.compression_ratio ? `<p>Compresión: ${data.compression_ratio}</p>` : ''}
                </div>
            `;
            
            resultsActions.innerHTML = `
                <button class="btn btn-success" onclick="downloadResultFile('${data.download_url}', '${data.output_filename}')">
                    <i class="fas fa-download"></i> Descargar
                </button>
                <button class="btn btn-primary" onclick="convertMore()">
                    <i class="fas fa-sync"></i> Convertir otra
                </button>
            `;
        }
    } else {
        resultsContent.innerHTML = `
            <div style="color: #f72585; text-align: center; padding: 20px;">
                <i class="fas fa-times-circle" style="font-size: 2rem;"></i>
                <p style="margin-top: 10px; font-weight: bold;">Error en la conversión</p>
                <p>${data.error || 'Error desconocido'}</p>
            </div>
        `;
        
        resultsActions.innerHTML = `
            <button class="btn btn-primary" onclick="convertMore()">
                <i class="fas fa-redo"></i> Intentar de nuevo
            </button>
        `;
    }
    
    // Desplazar hacia los resultados
    resultsContainer.scrollIntoView({ behavior: 'smooth' });
}

// Descargar archivo - FUNCIÓN GLOBAL
window.downloadResultFile = function(url, filename) {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Descargar ZIP - FUNCIÓN GLOBAL (para compatibilidad)
window.downloadZip = function(filename, hexData) {
    try {
        // Convertir hex a bytes
        const byteArray = new Uint8Array(hexData.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
        
        // Crear blob y descargar
        const blob = new Blob([byteArray], { type: 'application/zip' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(link);
    } catch (error) {
        showError('Error al descargar el archivo ZIP');
    }
}

// Convertir más imágenes - FUNCIÓN GLOBAL
window.convertMore = function() {
    if (resultsContainer) resultsContainer.classList.add('hidden');
    if (resultsContent) resultsContent.innerHTML = '';
    if (resultsActions) resultsActions.innerHTML = '';
}

// Limpiar todo - FUNCIÓN GLOBAL
window.clearAll = function() {
    if (uploadedFiles.length > 0 && !confirm('¿Estás seguro de que quieres eliminar todos los archivos?')) {
        return;
    }
    
    uploadedFiles = [];
    conversionResults = [];
    
    // Limpiar UI
    if (fileList) fileList.innerHTML = '';
    updateFileCount();
    updateConvertButton();
    hidePreview();
    
    if (resultsContainer) resultsContainer.classList.add('hidden');
    if (resultsContent) resultsContent.innerHTML = '';
    if (resultsActions) resultsActions.innerHTML = '';
}

// Formatear tamaño de archivo
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}