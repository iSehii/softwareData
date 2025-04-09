const Imagen = require("../models/imagenesModel");
const ImagenesAnalizadas = require("../models/ImagenesAnalizadasModel");
const multer = require("multer");

// Configurar multer para almacenar la imagen en memoria (no en el disco)
const storage = multer.memoryStorage();
const upload = multer({ storage }).single("imagen");

const subirImagen = async (req, res) => {
  upload(req, res, async (err) => {
    if (err) return res.status(500).json({ error: "Error al subir la imagen" });

    try {
      const nuevaImagen = new Imagen({
        imagen: req.file.buffer, // Guarda la imagen como Buffer
        contentType: req.file.mimetype, // Guarda el tipo de archivo (jpeg, png, etc.)
      });

      await nuevaImagen.save();
      res.json({ mensaje: "Imagen guardada", id: nuevaImagen._id });
    } catch (error) {
      console.log(error);
      res.status(500).json({ error: "Error al guardar en la BD" });
    }
  });
};

// Obtener todas las imágenes (solo IDs y tipos de contenido)
const obtenerImagenes = async (req, res) => {
  try {
    const imagenes = await Imagen.find({}, "_id contentType");
    res.json(imagenes);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener las imágenes" });
  }
};

// Obtener una imagen por ID y devolverla en formato binario
const obtenerImagenPorId = async (req, res) => {
  try {
    const imagen = await Imagen.findById(req.params.id);
    if (!imagen) return res.status(404).json({ error: "Imagen no encontrada" });

    res.set("Content-Type", imagen.contentType); // Especificar el tipo de imagen
    res.send(imagen.imagen); // Enviar la imagen binaria
  } catch (error) {
    res.status(500).json({ error: "Error al buscar la imagen" });
  }
};

const obtenerDatosPorId = async (req, res) => {
  try {
    const imagenes = await Imagen.find({}, "_id contentType");
    res.json(imagenes);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener las imágenes" });
  }
};

// Obtener una imagen por ID y devolverla en formato binario
const obtenerImagenAnalizadaPorId = async (req, res) => {
  try {
    const imagen = await ImagenesAnalizadas.findById(req.params.id);
    if (!imagen) return res.status(404).json({ error: "Imagen no encontrada" });

    res.set("Content-Type", imagen.contentType); // Especificar el tipo de imagen
    res.send(imagen.imagen_resultado); // Enviar la imagen binaria
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

      imagen.imagen = req.file.buffer; // Reemplazar la imagen con el nuevo Buffer
      imagen.contentType = req.file.mimetype;

      await imagen.save();
      res.json({ mensaje: "Imagen actualizada", id: imagen._id });
    } catch (error) {
      res.status(500).json({ error: "Error al actualizar la imagen" });
    }
  });
};

// Eliminar una imagen
const eliminarImagen = async (req, res) => {
  try {
    const imagen = await Imagen.findByIdAndDelete(req.params.id);
    if (!imagen) return res.status(404).json({ error: "Imagen no encontrada" });

    res.json({ mensaje: "Imagen eliminada", id: req.params.id });
  } catch (error) {
    res.status(500).json({ error: "Error al eliminar la imagen" });
  }
};

module.exports = { subirImagen, obtenerImagenes, obtenerImagenPorId, actualizarImagen, eliminarImagen, obtenerImagenAnalizadaPorId, obtenerDatosPorId };
