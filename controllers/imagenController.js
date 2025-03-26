const Imagen = require("../models/imagenesModel");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const storage = multer.diskStorage({
  destination: "./uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); 
  },
});

const upload = multer({ storage }).single("imagen");

const subirImagen = async (req, res) => {
  upload(req, res, async (err) => {
    if (err) return res.status(500).json({ error: "Error al subir la imagen" });

    try {
      const nuevaImagen = new Imagen({ imagen: req.file.filename });
      await nuevaImagen.save();
      res.json({ mensaje: "Imagen guardada", id: nuevaImagen.id });
    } catch (error) {
      res.status(500).json({ error: "Error al guardar en la BD" });
    }
  });
};

const obtenerImagenes = async (req, res) => {
  try {
    const imagenes = await Imagen.find();
    res.json(imagenes);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener las imágenes" });
  }
};

const obtenerImagenPorId = async (req, res) => {
  try {
    const imagen = await Imagen.findOne({ id: req.params.id });
    if (!imagen) return res.status(404).json({ error: "Imagen no encontrada" });
    res.json(imagen);
  } catch (error) {
    res.status(500).json({ error: "Error al buscar la imagen" });
  }
};

const actualizarImagen = async (req, res) => {
  upload(req, res, async (err) => {
    if (err) return res.status(500).json({ error: "Error al subir la nueva imagen" });

    try {
      const imagen = await Imagen.findOne({ id: req.params.id });
      if (!imagen) return res.status(404).json({ error: "Imagen no encontrada" });

      if (imagen.imagen) fs.unlinkSync(`./uploads/${imagen.imagen}`);

      imagen.imagen = req.file.filename;
      await imagen.save();
      res.json({ mensaje: "Imagen actualizada", id: imagen.id });
    } catch (error) {
      res.status(500).json({ error: "Error al actualizar la imagen" });
    }
  });
};

const eliminarImagen = async (req, res) => {
  try {
    const imagen = await Imagen.findOneAndDelete({ id: req.params.id });
    if (!imagen) return res.status(404).json({ error: "Imagen no encontrada" });

    if (imagen.imagen) fs.unlinkSync(`./uploads/${imagen.imagen}`);

    res.json({ mensaje: "Imagen eliminada", id: imagen.id });
  } catch (error) {
    res.status(500).json({ error: "Error al eliminar la imagen" });
  }
};

module.exports = { subirImagen, obtenerImagenes, obtenerImagenPorId, actualizarImagen, eliminarImagen };
