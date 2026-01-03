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

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    initEventListeners();
    updateFileCount();
    
    // Configurar calidad personalizada
    qualitySelect.addEventListener('change', function() {
        if (this.value === 'custom') {
            customQualityContainer.classList.remove('hidden');
        } else {
            customQualityContainer.classList.add('hidden');
        }
    });
    
    customQuality.addEventListener('input', function() {
        qualityValue.textContent = `${this.value}%`;
    });
    
    // Mantener relación de aspecto
    widthInput.addEventListener('input', function() {
        if (maintainAspect.checked && uploadedFiles.length > 0) {
            const file = uploadedFiles[0];
            if (file.info && file.info.dimensions) {
                const [origWidth, origHeight] = file.info.dimensions;
                const newHeight = Math.round((origHeight / origWidth) * this.value);
                heightInput.value = newHeight;
            }
        }
    });
    
    heightInput.addEventListener('input', function() {
        if (maintainAspect.checked && uploadedFiles.length > 0) {
            const file = uploadedFiles[0];
            if (file.info && file.info.dimensions) {
                const [origWidth, origHeight] = file.info.dimensions;
                const newWidth = Math.round((origWidth / origHeight) * this.value);
                widthInput.value = newWidth;
            }
        }
    });
});

// Event Listeners
function initEventListeners() {
    // Arrastrar y soltar
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
        handleFiles(files);
    });
    
    // Seleccionar archivos
    browseBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => handleFiles(e.target.files));
    
    // Convertir
    convertBtn.addEventListener('click', convertImages);
    
    // Limpiar todo
    clearAllBtn.addEventListener('click', clearAll);
    
    // Cerrar modal
    closeModal.addEventListener('click', () => infoModal.classList.add('hidden'));
    infoModal.addEventListener('click', (e) => {
        if (e.target === infoModal) {
            infoModal.classList.add('hidden');
        }
    });
}

// Manejar archivos seleccionados
function handleFiles(files) {
    if (!files || files.length === 0) return;
    
    // Convertir FileList a Array y filtrar por tipo
    const imageFiles = Array.from(files).filter(file => {
        return file.type.startsWith('image/');
    });
    
    if (imageFiles.length === 0) {
        showError('Por favor, selecciona solo archivos de imagen.');
        return;
    }
    
    // Verificar tamaño máximo (50MB)
    const maxSize = 50 * 1024 * 1024;
    const oversizedFiles = imageFiles.filter(file => file.size > maxSize);
    
    if (oversizedFiles.length > 0) {
        showError(`Algunos archivos exceden el tamaño máximo de 50MB: ${oversizedFiles.map(f => f.name).join(', ')}`);
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
                type: file.type
            };
            
            // Obtener información de la imagen
            const img = new Image();
            img.onload = function() {
                fileData.dimensions = { width: img.width, height: img.height };
                fileData.aspectRatio = (img.width / img.height).toFixed(2);
                
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
            };
            img.src = e.target.result;
        };
        
        reader.readAsDataURL(file);
    });
    
    // Resetear input file
    fileInput.value = '';
}

// Agregar archivo a la lista
function addFileToList(fileData) {
    const fileItem = document.createElement('div');
    fileItem.className = 'file-item fade-in';
    fileItem.dataset.id = fileData.id;
    
    fileItem.innerHTML = `
        <div class="file-info">
            <i class="fas fa-file-image file-icon"></i>
            <div class="file-name">${fileData.name}</div>
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

// Mostrar información del archivo
function showFileInfo(fileId) {
    const fileData = uploadedFiles.find(f => f.id === fileId);
    if (!fileData) return;
    
    modalBody.innerHTML = `
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
            ${fileData.dimensions ? `
                <div class="info-item">
                    <strong>Dimensiones:</strong> ${fileData.dimensions.width} × ${fileData.dimensions.height} px
                </div>
                <div class="info-item">
                    <strong>Relación de aspecto:</strong> ${fileData.aspectRatio}
                </div>
            ` : ''}
        </div>
    `;
    
    infoModal.classList.remove('hidden');
}

// Eliminar archivo
function removeFile(fileId) {
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
    previewImg.src = fileData.dataUrl;
    previewImg.alt = fileData.name;
    
    let infoHtml = `
        <strong>${fileData.name}</strong><br>
        ${fileData.size} • ${fileData.dimensions ? `${fileData.dimensions.width}×${fileData.dimensions.height} px` : ''}
    `;
    
    previewInfo.innerHTML = infoHtml;
    previewPlaceholder.classList.add('hidden');
    previewImage.classList.remove('hidden');
}

// Ocultar vista previa
function hidePreview() {
    previewPlaceholder.classList.remove('hidden');
    previewImage.classList.add('hidden');
    previewImg.src = '';
    previewInfo.innerHTML = '';
}

// Actualizar contador de archivos
function updateFileCount() {
    const countElement = document.getElementById('file-count');
    countElement.textContent = `${uploadedFiles.length} archivo${uploadedFiles.length !== 1 ? 's' : ''}`;
}

// Actualizar estado del botón de conversión
function updateConvertButton() {
    convertBtn.disabled = uploadedFiles.length === 0;
}

// Mostrar error
function showError(message) {
    alert(message); // En una app real, usarías un toast o modal más bonito
}

// Convertir imágenes
async function convertImages() {
    if (uploadedFiles.length === 0) return;
    
    // Obtener configuración
    const format = formatSelect.value;
    const quality = qualitySelect.value === 'custom' ? customQuality.value : qualitySelect.value;
    const width = widthInput.value || null;
    const height = heightInput.value || null;
    const keepAspect = maintainAspect.checked;
    const isBatch = batchMode.checked;
    
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
    convertBtn.disabled = true;
    progressContainer.classList.remove('hidden');
    progressBar.style.width = '0%';
    progressText.textContent = '0%';
    
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
    
    try {
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
        showError(error.message);
    } finally {
        // Restaurar UI
        convertBtn.disabled = false;
        progressContainer.classList.add('hidden');
    }
}

// Simular progreso (en producción, usarías WebSockets o polling)
function simulateProgress() {
    let progress = 0;
    const interval = setInterval(() => {
        progress += Math.random() * 20;
        if (progress >= 100) {
            progress = 100;
            clearInterval(interval);
        }
        progressBar.style.width = `${progress}%`;
        progressText.textContent = `${Math.round(progress)}%`;
    }, 200);
}

// Mostrar resultados
function showResults(data) {
    resultsContainer.classList.remove('hidden');
    
    if (data.batch) {
        // Resultados en lote
        resultsContent.innerHTML = `
            <p><i class="fas fa-check"></i> Se procesaron ${data.results.length} imágenes correctamente.</p>
            <p><i class="fas fa-file-archive"></i> Todas las imágenes están empaquetadas en un archivo ZIP.</p>
            <div class="file-list">
                ${data.results.map(result => `
                    <div class="file-item">
                        <div class="file-info">
                            <i class="fas ${result.success ? 'fa-check-circle text-success' : 'fa-times-circle text-danger'}"></i>
                            <div class="file-name">${result.filename}</div>
                            <div class="file-size">${result.success ? '✓ Convertido' : '✗ Error'}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        
        // Crear y descargar ZIP
        resultsActions.innerHTML = `
            <button class="btn btn-success" onclick="downloadZip('${data.zip_filename}', '${data.zip_data}')">
                <i class="fas fa-download"></i> Descargar ZIP
            </button>
            <button class="btn btn-primary" onclick="convertMore()">
                <i class="fas fa-sync"></i> Convertir más
            </button>
        `;
    } else {
        // Resultado individual
        if (data.success) {
            resultsContent.innerHTML = `
                <p><i class="fas fa-check-circle"></i> Conversión exitosa!</p>
                <div class="result-info">
                    <p><strong>Archivo original:</strong> ${data.filename}</p>
                    <p><strong>Tamaño original:</strong> ${data.original_size ? `${data.original_size[0]}×${data.original_size[1]} px` : 'N/A'}</p>
                    <p><strong>Tamaño convertido:</strong> ${data.output_dimensions ? `${data.output_dimensions[0]}×${data.output_dimensions[1]} px` : 'N/A'}</p>
                    ${data.compression_ratio ? `<p><strong>Compresión:</strong> ${data.compression_ratio}</p>` : ''}
                </div>
            `;
            
            resultsActions.innerHTML = `
                <button class="btn btn-success" onclick="downloadFile('${data.download_url}', '${data.output_filename}')">
                    <i class="fas fa-download"></i> Descargar
                </button>
                <button class="btn btn-primary" onclick="convertMore()">
                    <i class="fas fa-sync"></i> Convertir otra
                </button>
            `;
        } else {
            resultsContent.innerHTML = `
                <p><i class="fas fa-times-circle"></i> Error en la conversión</p>
                <p>${data.error || 'Error desconocido'}</p>
            `;
            
            resultsActions.innerHTML = `
                <button class="btn btn-primary" onclick="convertMore()">
                    <i class="fas fa-redo"></i> Intentar de nuevo
                </button>
            `;
        }
    }
    
    // Desplazar hacia los resultados
    resultsContainer.scrollIntoView({ behavior: 'smooth' });
}

// Descargar archivo
function downloadFile(url, filename) {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Descargar ZIP
function downloadZip(filename, hexData) {
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

// Convertir más imágenes
function convertMore() {
    resultsContainer.classList.add('hidden');
    resultsContent.innerHTML = '';
    resultsActions.innerHTML = '';
}

// Limpiar todo
function clearAll() {
    if (uploadedFiles.length > 0 && !confirm('¿Estás seguro de que quieres eliminar todos los archivos?')) {
        return;
    }
    
    uploadedFiles = [];
    conversionResults = [];
    
    // Limpiar UI
    fileList.innerHTML = '';
    updateFileCount();
    updateConvertButton();
    hidePreview();
    resultsContainer.classList.add('hidden');
}

// Formatear tamaño de archivo
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Manejar tecla ESC para cerrar modal
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !infoModal.classList.contains('hidden')) {
        infoModal.classList.add('hidden');
    }
});
alert('hola es gratis')