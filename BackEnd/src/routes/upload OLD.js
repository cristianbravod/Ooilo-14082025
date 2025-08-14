// src/routes/upload.js - Rutas de upload adaptadas a tu estructura
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

router.post('/direct', upload.single('image'), async (req, res) => {
  let tempFilePath = null;
  
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No se recibió ninguna imagen'
      });
    }

    tempFilePath = req.file.path;
    console.log('📤 Procesando imagen:', req.file.originalname);

    // Generar nombre final único
    const uniqueId = crypto.randomUUID();
    const timestamp = Date.now();
    const fileName = `img_${timestamp}_${uniqueId}.jpg`;

    // Procesar imagen en múltiples calidades
    const processedImages = await processImageQualities(tempFilePath, fileName);

    // Generar URLs completas (adaptadas a tu servidor)
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const imageUrls = {};
    
    for (const [quality, relativePath] of Object.entries(processedImages)) {
      imageUrls[quality] = `${baseUrl}${relativePath}`;
    }

    // Metadatos de la imagen
    const metadata = await sharp(tempFilePath).metadata();
    
    // Limpiar archivo temporal
    await fs.unlink(tempFilePath);
    
    console.log('✅ Imagen procesada exitosamente:', fileName);

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
      message: 'Imagen procesada en múltiples calidades'
    });

  } catch (error) {
    console.error('❌ Error en upload:', error);
    
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

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB máximo
    files: 1
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos de imagen'));
    }
  }
});

// Función para procesar imagen en múltiples calidades
async function processImageQualities(inputPath, fileName) {
  // Ruta adaptada: BackEnd/public/uploads/
  const uploadsDir = path.join(__dirname, '../../public/uploads');
  const processedImages = {};
  
  try {
    // Crear subdirectorios para cada calidad
    for (const quality of Object.keys(IMAGE_QUALITIES)) {
      const qualityDir = path.join(uploadsDir, quality);
      try {
        await fs.access(qualityDir);
      } catch {
        await fs.mkdir(qualityDir, { recursive: true });
        console.log(`📁 Directorio creado: ${quality}`);
      }
    }

    // Procesar imagen para cada calidad
    for (const [qualityName, config] of Object.entries(IMAGE_QUALITIES)) {
      const outputPath = path.join(uploadsDir, qualityName, fileName);
      
      let sharpInstance = sharp(inputPath);
      
      if (qualityName !== 'original') {
        sharpInstance = sharpInstance.resize(config.width, config.height, {
          fit: 'cover',
          position: 'center'
        });
      }
      
      await sharpInstance
        .jpeg({ 
          quality: config.quality,
          progressive: true,
          mozjpeg: true 
        })
        .toFile(outputPath);
      
      processedImages[qualityName] = `/uploads/${qualityName}/${fileName}`;
      console.log(`✅ Procesada calidad ${qualityName}: ${fileName}`);
    }
    
    return processedImages;
  } catch (error) {
    console.error('❌ Error procesando imagen:', error);
    throw error;
  }
}

/**
 * POST /api/upload/image
 * Sube una imagen y genera múltiples calidades
 */
router.post('/image', upload.single('image'), async (req, res) => {
  let tempFilePath = null;
  
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No se recibió ninguna imagen'
      });
    }

    tempFilePath = req.file.path;
    console.log('📤 Procesando imagen:', req.file.originalname);

    // Generar nombre final único
    const uniqueId = crypto.randomUUID();
    const timestamp = Date.now();
    const fileName = `img_${timestamp}_${uniqueId}.jpg`;

    // Procesar imagen en múltiples calidades
    const processedImages = await processImageQualities(tempFilePath, fileName);

    // Generar URLs completas (adaptadas a tu servidor)
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const imageUrls = {};
    
    for (const [quality, relativePath] of Object.entries(processedImages)) {
      imageUrls[quality] = `${baseUrl}${relativePath}`;
    }

    // Metadatos de la imagen
    const metadata = await sharp(tempFilePath).metadata();
    
    // Limpiar archivo temporal
    await fs.unlink(tempFilePath);
    
    console.log('✅ Imagen procesada exitosamente:', fileName);

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
      message: 'Imagen procesada en múltiples calidades'
    });

  } catch (error) {
    console.error('❌ Error en upload:', error);
    
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

    // Validar formato Base64
    const matches = imageData.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({
        success: false,
        message: 'Formato Base64 inválido'
      });
    }

    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');

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
 * DELETE /api/upload/:fileName
 * Elimina todas las versiones de una imagen
 */
router.delete('/:fileName', async (req, res) => {
  try {
    const fileName = req.params.fileName;
    const uploadsDir = path.join(__dirname, '../../public/uploads');
    let deletedFiles = 0;

    // Eliminar todas las calidades de la imagen
    for (const quality of Object.keys(IMAGE_QUALITIES)) {
      const filePath = path.join(uploadsDir, quality, fileName);
      
      try {
        await fs.unlink(filePath);
        deletedFiles++;
        console.log(`🗑️ Eliminado: ${quality}/${fileName}`);
      } catch (error) {
        if (error.code !== 'ENOENT') {
          console.error(`Error eliminando ${quality}/${fileName}:`, error);
        }
      }
    }

    if (deletedFiles === 0) {
      return res.status(404).json({
        success: false,
        message: 'Imagen no encontrada'
      });
    }

    res.json({
      success: true,
      message: `Imagen eliminada (${deletedFiles} archivos)`,
      deletedFiles: deletedFiles
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
 * GET /api/upload/info/:fileName
 * Obtiene información de todas las versiones de una imagen
 */
router.get('/info/:fileName', async (req, res) => {
  try {
    const fileName = req.params.fileName;
    const uploadsDir = path.join(__dirname, '../../public/uploads');
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    
    const imageInfo = {
      fileName: fileName,
      qualities: {},
      exists: false
    };

    // Verificar cada calidad
    for (const quality of Object.keys(IMAGE_QUALITIES)) {
      const filePath = path.join(uploadsDir, quality, fileName);
      
      try {
        const stats = await fs.stat(filePath);
        imageInfo.qualities[quality] = {
          url: `${baseUrl}/uploads/${quality}/${fileName}`,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime
        };
        imageInfo.exists = true;
      } catch (error) {
        // Archivo no existe para esta calidad
      }
    }

    if (!imageInfo.exists) {
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
    console.error('❌ Error obteniendo info:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo información',
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
    const uploadsDir = path.join(__dirname, '../../public/uploads/medium');
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    
    try {
      const files = await fs.readdir(uploadsDir);
      const images = [];

      for (const file of files) {
        if (file.endsWith('.jpg') || file.endsWith('.jpeg') || file.endsWith('.png')) {
          const filePath = path.join(uploadsDir, file);
          const stats = await fs.stat(filePath);
          
          images.push({
            fileName: file,
            url: `${baseUrl}/uploads/medium/${file}`,
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime
          });
        }
      }

      // Ordenar por fecha de creación (más recientes primero)
      images.sort((a, b) => new Date(b.created) - new Date(a.created));

      res.json({
        success: true,
        images: images,
        total: images.length
      });
    } catch (dirError) {
      // Directorio no existe aún
      res.json({
        success: true,
        images: [],
        total: 0,
        message: 'No hay imágenes disponibles'
      });
    }

  } catch (error) {
    console.error('❌ Error listando imágenes:', error);
    res.status(500).json({
      success: false,
      message: 'Error listando imágenes',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    });
  }
});

module.exports = router;