const Imagen = require("../models/imagenesModel");
const ImagenesAnalizadas = require("../models/ImagenesAnalizadasModel");
const multer = require("multer");
const { subirImagen: subirImagenS3, obtenerImagen, obtenerUrlFirmada, eliminarImagen: eliminarImagenS3 } = require("../services/s3Service");

const storage = multer.memoryStorage();
// Configurar límites: permitir imágenes de hasta 250MB (S3 puede manejar mucho más)
const upload = multer({ 
    storage,
    limits: {
        fileSize: 250 * 1024 * 1024 // 250MB en bytes
    }
}).single("imagen");

const subirImagen = async (req, res) => {
  upload(req, res, async (err) => {
    if (err) return res.status(500).json({ error: "Error al subir la imagen" });

    try {
      // Subir imagen a S3
      const { key, url } = await subirImagenS3(
        req.file.buffer,
        req.file.mimetype
      );

      // Guardar referencia en MongoDB
      const nuevaImagen = new Imagen({
        s3_key: key,
        contentType: req.file.mimetype,
      });

      await nuevaImagen.save();
      res.json({ mensaje: "Imagen guardada", id: nuevaImagen._id, s3_key: key, url });
    } catch (error) {
      console.log(error);
      res.status(500).json({ error: "Error al guardar en la BD" });
    }
  });
};

// Obtener todas las imágenes (solo IDs y tipos de contenido)
const obtenerImagenes = async (req, res) => {
  try {
    const imagenes = await Imagen.find({}, "_id contentType s3_key");
    // Generar URLs firmadas para cada imagen
    const imagenesConUrl = await Promise.all(
      imagenes.map(async (img) => {
        const url = await obtenerUrlFirmada(img.s3_key);
        return {
          _id: img._id,
          contentType: img.contentType,
          // Campos adicionales (opcionales para el frontend)
          s3_key: img.s3_key,
          url
        };
      })
    );
    res.json(imagenesConUrl);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener las imágenes" });
  }
};

// Obtener una imagen por ID y devolverla en formato binario
const obtenerImagenPorId = async (req, res) => {
  try {
    const imagen = await Imagen.findById(req.params.id);
    if (!imagen) return res.status(404).json({ error: "Imagen no encontrada" });

    // Obtener imagen de S3
    const { buffer, contentType } = await obtenerImagen(imagen.s3_key);
    const base64 = buffer.toString("base64");
    const dataUri = `data:${contentType || imagen.contentType};base64,${base64}`;

    res.json({
      _id: imagen._id,
      contentType: contentType || imagen.contentType,
      imagenBase64: dataUri,
      s3_key: imagen.s3_key,
    });
  } catch (error) {
    res.status(500).json({ error: "Error al buscar la imagen" });
  }
};


const obtenerDatosPorId = async (req, res) => {
  try {
    const imagenes = await Imagen.find({}, "_id contentType s3_key");
    res.json(imagenes);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener las imágenes" });
  }
};

const obtenerImagenAnalizadaPorId = async (req, res) => {
  try {
    const imagen = await ImagenesAnalizadas.findById(req.params.id);
    if (!imagen) return res.status(404).json({ error: "Imagen no encontrada" });

    // Obtener imagen de S3
    const { buffer, contentType } = await obtenerImagen(imagen.imagen_resultado_s3_key);
    const base64 = buffer.toString("base64");
    const dataUri = `data:${contentType || imagen.contentType};base64,${base64}`;

    res.json({
      _id: imagen._id,
      contentType: contentType || imagen.contentType,
      imagenBase64: dataUri,
      s3_key: imagen.imagen_resultado_s3_key,
    });
  } catch (error) {
    res.status(500).json({ error: "Error al buscar la imagen" });
  }
};

// Actualizar una imagen
const actualizarImagen = async (req, res) => {
  upload(req, res, async (err) => {
    if (err) return res.status(500).json({ error: "Error al subir la nueva imagen" });

    try {
      const imagen = await Imagen.findById(req.params.id);
      if (!imagen) return res.status(404).json({ error: "Imagen no encontrada" });

      // Eliminar imagen anterior de S3
      if (imagen.s3_key) {
        try {
          await eliminarImagenS3(imagen.s3_key);
        } catch (error) {
          console.warn("Error al eliminar imagen anterior de S3:", error);
        }
      }

      // Subir nueva imagen a S3
      const { key, url } = await subirImagenS3(
        req.file.buffer,
        req.file.mimetype,
        imagen.s3_key // Reutilizar la misma clave si existe
      );

      imagen.s3_key = key;
      imagen.contentType = req.file.mimetype;

      await imagen.save();
      res.json({ mensaje: "Imagen actualizada", id: imagen._id, s3_key: key, url });
    } catch (error) {
      res.status(500).json({ error: "Error al actualizar la imagen" });
    }
  });
};

// Eliminar una imagen
const eliminarImagen = async (req, res) => {
  try {
    const imagen = await Imagen.findById(req.params.id);
    if (!imagen) return res.status(404).json({ error: "Imagen no encontrada" });

    // Eliminar imagen de S3
    if (imagen.s3_key) {
      try {
        await eliminarImagenS3(imagen.s3_key);
      } catch (error) {
        console.warn("Error al eliminar imagen de S3:", error);
      }
    }

    // Eliminar referencia de MongoDB
    await Imagen.findByIdAndDelete(req.params.id);

    res.json({ mensaje: "Imagen eliminada", id: req.params.id });
  } catch (error) {
    res.status(500).json({ error: "Error al eliminar la imagen" });
  }
};

module.exports = { subirImagen, obtenerImagenes, obtenerImagenPorId, actualizarImagen, eliminarImagen, obtenerImagenAnalizadaPorId, obtenerDatosPorId };
