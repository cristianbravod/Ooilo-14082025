// src/routes/upload.js - Rutas de upload adaptadas con límites aumentados
const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const router = express.Router();

// Configuración de calidades para diferentes usos
const IMAGE_QUALITIES = {
  thumbnail: { width: 150, height: 150, quality: 60 },
  medium: { width: 400, height: 300, quality: 75 },
  large: { width: 800, height: 600, quality: 85 },
  original: { quality: 90 }
};

// Configuración de almacenamiento optimizada
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    // Ruta adaptada a tu estructura: BackEnd/public/uploads/temp
    const uploadDir = path.join(__dirname, '../../public/uploads');
    const tempDir = path.join(uploadDir, 'temp');
    
    try {
      await fs.access(uploadDir);
    } catch {
      await fs.mkdir(uploadDir, { recursive: true });
      await fs.mkdir(tempDir, { recursive: true });
      console.log('📁 Directorios de upload creados');
    }
    
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    const uniqueId = crypto.randomUUID();
    const timestamp = Date.now();
    const extension = path.extname(file.originalname) || '.jpg';
    cb(null, `temp_${timestamp}_${uniqueId}${extension}`);
  }
});

// ✅ CONFIGURACIÓN DE MULTER CON LÍMITES AUMENTADOS
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024,  // 50MB máximo (aumentado de 10MB)
    files: 1,
    fieldSize: 25 * 1024 * 1024, // 25MB para campos de texto individuales
    fieldNameSize: 100,           // 100 bytes para nombres de campos
    fields: 100,                  // Máximo 100 campos en el formulario
    parts: 100                    // Máximo 100 partes en el multipart
  },
  fileFilter: (req, file, cb) => {
    console.log(`📎 Archivo recibido: ${file.originalname}, tipo: ${file.mimetype}`);
    
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      console.log(`❌ Tipo de archivo rechazado: ${file.mimetype}`);
      cb(new Error('Solo se permiten archivos de imagen'));
    }
  }
});

// Función para procesar imagen en múltiples calidades
async function processImageQualities(inputPath, fileName) {
  const processedImages = {};
  
  try {
    for (const [quality, settings] of Object.entries(IMAGE_QUALITIES)) {
      const outputDir = path.join(__dirname, '../../public/uploads', quality);
      
      // Crear directorio si no existe
      try {
        await fs.access(outputDir);
      } catch {
        await fs.mkdir(outputDir, { recursive: true });
      }
      
      const outputPath = path.join(outputDir, fileName);
      
      if (quality === 'original') {
        // Para original, solo optimizar sin redimensionar
        await sharp(inputPath)
          .jpeg({ quality: settings.quality })
          .toFile(outputPath);
      } else {
        // Para otras calidades, redimensionar y optimizar
        await sharp(inputPath)
          .resize(settings.width, settings.height, { 
            fit: 'cover',
            position: 'center'
          })
          .jpeg({ quality: settings.quality })
          .toFile(outputPath);
      }
      
      processedImages[quality] = `/uploads/${quality}/${fileName}`;
    }
    
    console.log(`✅ Imagen procesada en ${Object.keys(IMAGE_QUALITIES).length} calidades:`, fileName);
    return processedImages;
    
  } catch (error) {
    console.error('❌ Error procesando calidades de imagen:', error);
    throw error;
  }
}

// ✅ MIDDLEWARE DE DEBUG PARA MULTER
router.use((req, res, next) => {
  console.log(`📸 Upload request: ${req.method} ${req.path}`);
  console.log(`📊 Content-Length: ${req.headers['content-length'] || 'N/A'}`);
  console.log(`📦 Content-Type: ${req.headers['content-type'] || 'N/A'}`);
  next();
});

/**
 * POST /api/upload/image
 * Sube imagen mediante multipart/form-data
 */
router.post('/image', upload.single('image'), async (req, res) => {
  let tempFilePath = null;
  
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No se recibió archivo de imagen'
      });
    }

    console.log(`📎 Archivo subido: ${req.file.filename}, tamaño: ${req.file.size} bytes`);
    
    tempFilePath = req.file.path;
    const fileName = req.file.filename.replace('temp_', '').replace(/^\d+_/, '') || `image_${Date.now()}.jpg`;

    // Procesar en múltiples calidades
    const processedImages = await processImageQualities(tempFilePath, fileName);

    // Generar URLs completas
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const imageUrls = {};
    
    for (const [quality, relativePath] of Object.entries(processedImages)) {
      imageUrls[quality] = `${baseUrl}${relativePath}`;
    }

    // Obtener metadatos de la imagen
    const metadata = await sharp(tempFilePath).metadata();

    // Limpiar archivo temporal
    await fs.unlink(tempFilePath);

    console.log('✅ Imagen subida y procesada exitosamente:', fileName);

    res.json({
      success: true,
      fileName: fileName,
      urls: imageUrls,
      metadata: {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        size: req.file.size
      },
      message: 'Imagen subida y procesada exitosamente'
    });

  } catch (error) {
    console.error('❌ Error en upload de imagen:', error);
    
    // Limpiar archivo temporal en caso de error
    if (tempFilePath) {
      try {
        await fs.unlink(tempFilePath);
      } catch (cleanupError) {
        console.error('Error limpiando archivo temporal:', cleanupError);
      }
    }

    res.status(500).json({
      success: false,
      message: 'Error procesando imagen',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    });
  }
});

/**
 * POST /api/upload/base64
 * Procesa imagen desde Base64
 */
router.post('/base64', async (req, res) => {
  let tempFilePath = null;
  
  try {
    const { imageData, fileName: requestedFileName } = req.body;

    if (!imageData) {
      return res.status(400).json({
        success: false,
        message: 'No se recibió data de imagen'
      });
    }

    console.log(`📏 Base64 recibido, tamaño: ${Math.round(imageData.length / 1024)} KB`);

    // Validar formato Base64
    const matches = imageData.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({
        success: false,
        message: 'Formato Base64 inválido'
      });
    }

    const imageType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');

    console.log(`📊 Imagen decodificada: ${buffer.length} bytes, tipo: ${imageType}`);

    // Verificar tamaño después de decodificar
    if (buffer.length > 50 * 1024 * 1024) { // 50MB
      return res.status(413).json({
        success: false,
        message: 'Imagen demasiado grande (máximo 50MB)',
        error: 'PAYLOAD_TOO_LARGE'
      });
    }

    // Crear archivo temporal en tu estructura
    const tempDir = path.join(__dirname, '../../public/uploads/temp');
    const uniqueId = crypto.randomUUID();
    tempFilePath = path.join(tempDir, `temp_${Date.now()}_${uniqueId}.jpg`);
    
    await fs.writeFile(tempFilePath, buffer);

    // Generar nombre final
    const fileName = requestedFileName || `img_${Date.now()}_${uniqueId}.jpg`;

    // Procesar en múltiples calidades
    const processedImages = await processImageQualities(tempFilePath, fileName);

    // Generar URLs
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const imageUrls = {};
    
    for (const [quality, relativePath] of Object.entries(processedImages)) {
      imageUrls[quality] = `${baseUrl}${relativePath}`;
    }

    // Obtener metadatos
    const metadata = await sharp(tempFilePath).metadata();

    // Limpiar archivo temporal
    await fs.unlink(tempFilePath);

    console.log('✅ Imagen Base64 procesada:', fileName);

    res.json({
      success: true,
      fileName: fileName,
      urls: imageUrls,
      metadata: {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        size: buffer.length
      },
      message: 'Imagen Base64 procesada exitosamente'
    });

  } catch (error) {
    console.error('❌ Error procesando Base64:', error);
    
    if (tempFilePath) {
      try {
        await fs.unlink(tempFilePath);
      } catch (cleanupError) {
        console.error('Error limpiando archivo temporal:', cleanupError);
      }
    }

    res.status(500).json({
      success: false,
      message: 'Error procesando imagen Base64',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    });
  }
});

/**
 * GET /api/upload/list
 * Lista todas las imágenes disponibles
 */
router.get('/list', async (req, res) => {
  try {
    const uploadDir = path.join(__dirname, '../../public/uploads');
    const images = [];

    for (const quality of Object.keys(IMAGE_QUALITIES)) {
      const qualityDir = path.join(uploadDir, quality);
      
      try {
        const files = await fs.readdir(qualityDir);
        for (const file of files) {
          if (file.match(/\.(jpg|jpeg|png|webp)$/i)) {
            const baseUrl = `${req.protocol}://${req.get('host')}`;
            images.push({
              fileName: file,
              quality: quality,
              url: `${baseUrl}/uploads/${quality}/${file}`
            });
          }
        }
      } catch (dirError) {
        // Directorio no existe, continuar
      }
    }

    res.json({
      success: true,
      images: images,
      total: images.length
    });
    
  } catch (error) {
    console.error('❌ Error listando imágenes:', error);
    res.status(500).json({
      success: false,
      message: 'Error listando imágenes',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    });
  }
});

/**
 * GET /api/upload/info/:fileName
 * Obtiene información de una imagen específica
 */
router.get('/info/:fileName', async (req, res) => {
  try {
    const { fileName } = req.params;
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const imageInfo = {
      fileName: fileName,
      urls: {}
    };

    for (const quality of Object.keys(IMAGE_QUALITIES)) {
      const imagePath = path.join(__dirname, `../../public/uploads/${quality}`, fileName);
      
      try {
        await fs.access(imagePath);
        imageInfo.urls[quality] = `${baseUrl}/uploads/${quality}/${fileName}`;
        
        // Obtener metadatos del archivo original si existe
        if (quality === 'original') {
          const metadata = await sharp(imagePath).metadata();
          imageInfo.metadata = {
            width: metadata.width,
            height: metadata.height,
            format: metadata.format
          };
        }
      } catch (fileError) {
        // Archivo no existe en esta calidad
      }
    }

    if (Object.keys(imageInfo.urls).length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Imagen no encontrada'
      });
    }

    res.json({
      success: true,
      ...imageInfo
    });
    
  } catch (error) {
    console.error('❌ Error obteniendo info de imagen:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo información de imagen',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    });
  }
});

/**
 * DELETE /api/upload/:fileName
 * Elimina una imagen y todas sus calidades
 */
router.delete('/:fileName', async (req, res) => {
  try {
    const { fileName } = req.params;
    const deletedFiles = [];
    const errors = [];

    for (const quality of Object.keys(IMAGE_QUALITIES)) {
      const imagePath = path.join(__dirname, `../../public/uploads/${quality}`, fileName);
      
      try {
        await fs.access(imagePath);
        await fs.unlink(imagePath);
        deletedFiles.push(`${quality}/${fileName}`);
      } catch (fileError) {
        errors.push(`Error eliminando ${quality}/${fileName}: ${fileError.message}`);
      }
    }

    if (deletedFiles.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Imagen no encontrada'
      });
    }

    console.log('✅ Imagen eliminada:', fileName, `(${deletedFiles.length} archivos)`);

    res.json({
      success: true,
      message: 'Imagen eliminada exitosamente',
      deletedFiles: deletedFiles,
      errors: errors.length > 0 ? errors : undefined
    });
    
  } catch (error) {
    console.error('❌ Error eliminando imagen:', error);
    res.status(500).json({
      success: false,
      message: 'Error eliminando imagen',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    });
  }
});

/**
 * GET /api/upload/health
 * Health check para el sistema de uploads
 */
router.get('/health', async (req, res) => {
  try {
    const uploadDir = path.join(__dirname, '../../public/uploads');
    const dirChecks = {};

    // Verificar directorios
    for (const quality of Object.keys(IMAGE_QUALITIES)) {
      const qualityDir = path.join(uploadDir, quality);
      try {
        await fs.access(qualityDir);
        dirChecks[quality] = 'OK';
      } catch {
        dirChecks[quality] = 'MISSING';
      }
    }

    res.json({
      success: true,
      status: 'UPLOAD_SYSTEM_OK',
      directories: dirChecks,
      limits: {
        maxFileSize: '50MB',
        maxFields: 100,
        maxFieldSize: '25MB'
      },
      qualities: IMAGE_QUALITIES,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error en health check de upload:', error);
    res.status(500).json({
      success: false,
      message: 'Error en sistema de uploads',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    });
  }
});

/**
 * POST /api/upload/direct
 * Endpoint alternativo para upload directo
 */
router.post('/direct', upload.single('image'), async (req, res) => {
  let tempFilePath = null;
  
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No se recibió archivo de imagen'
      });
    }

    console.log(`📎 Archivo subido directo: ${req.file.filename}, tamaño: ${req.file.size} bytes`);
    
    tempFilePath = req.file.path;
    const fileName = req.file.filename.replace('temp_', '').replace(/^\d+_/, '') || `image_${Date.now()}.jpg`;

    // Procesar en múltiples calidades
    const processedImages = await processImageQualities(tempFilePath, fileName);

    // Generar URLs completas
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const imageUrls = {};
    
    for (const [quality, relativePath] of Object.entries(processedImages)) {
      imageUrls[quality] = `${baseUrl}${relativePath}`;
    }

    // Obtener metadatos de la imagen
    const metadata = await sharp(tempFilePath).metadata();

    // Limpiar archivo temporal
    await fs.unlink(tempFilePath);

    console.log('✅ Upload directo procesado exitosamente:', fileName);

    res.json({
      success: true,
      fileName: fileName,
      urls: imageUrls,
      metadata: {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        size: req.file.size
      },
      message: 'Imagen subida directamente y procesada exitosamente'
    });

  } catch (error) {
    console.error('❌ Error en upload directo:', error);
    
    // Limpiar archivo temporal en caso de error
    if (tempFilePath) {
      try {
        await fs.unlink(tempFilePath);
      } catch (cleanupError) {
        console.error('Error limpiando archivo temporal:', cleanupError);
      }
    }

    res.status(500).json({
      success: false,
      message: 'Error procesando imagen directa',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    });
  }
});

module.exports = router;