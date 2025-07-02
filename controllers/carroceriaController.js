const { Carroceria } = require('../models/carroceriaModel');
const Imagen = require("../models/imagenesModel");
const multer = require("multer");

const storage = multer.memoryStorage();
const upload = multer({ storage }).single("id_imagen");

exports.obtenerCarrocerias = async (req, res) => {
    try {
        const carrocerias = await Carroceria.findAll();
        return res.json(carrocerias);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

exports.obtenerCarroceria = async (req, res) => {
    try {
        const { id } = req.params;
        let carroceria;

        if (!isNaN(id)) {
            carroceria = await Carroceria.findByPk(id);
        } else {
            carroceria = await Carroceria.findOne({ where: { folio: id } });
        }

        if (!carroceria) {
            return res.status(404).json({ message: 'Carrocería no encontrada' });
        }

        return res.json(carroceria);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

exports.crearCarroceria = (req, res) => {
    upload(req, res, async (err) => {
        if (err) {
            res.status(500).json({ error: "Error al subir la imagen", err })
            console.log(err)
        }

        try {
            const {
                no_parte, color, panel, descripcion, folio,
                lote, estado, id_usuario
            } = req.body;
            
            console.log(req.file)
            let id_imagen = null;

            if (req.file) {
                try {
                    const nuevaImagen = new Imagen({
                        imagen: req.file.buffer,
                        contentType: req.file.mimetype,
                    });
                    await nuevaImagen.save();
                    id_imagen = nuevaImagen._id.toString();
                    console.log(id_imagen)
                } catch (error) {
            console.log(error)
                    
                    return res.status(500).json({ error: "Error al guardar la imagen en la BD" });
                }
            }

            let nuevoFolio = folio;
            let existe = await Carroceria.findOne({ where: { folio: nuevoFolio } });
            while (existe) {
                const ultima = await Carroceria.findOne({ order: [['id', 'DESC']] });
                const siguienteId = ultima ? ultima.id + 1 : 1;
                nuevoFolio = `CAR-${siguienteId}`;
                existe = await Carroceria.findOne({ where: { folio: nuevoFolio } });
            }

            const nuevaCarroceria = await Carroceria.create({
                no_parte,
                color,
                folio: nuevoFolio,
                panel,
                descripcion,
                id_imagen,
                lote,
                estado: estado == 1 ? true : false,
                id_usuario
            });
            return res.status(201).json(nuevaCarroceria);
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    });
};

exports.actualizarCarroceria = (req, res) => {
    upload(req, res, async (err) => {
        if (err) {
            console.log(err);
            return res.status(500).json({ error: "Error al subir la imagen", err });
        }

        try {
            const { id } = req.params;
            const {
                no_parte, color, panel, descripcion,
                lote, estado, id_usuario
            } = req.body;

            const carroceria = await Carroceria.findByPk(id);
            if (!carroceria) {
                return res.status(404).json({ message: 'Carrocería no encontrada' });
            }

            let id_imagen = carroceria.id_imagen;

            if (req.file) {
                try {
                    const nuevaImagen = new Imagen({
                        imagen: req.file.buffer,
                        contentType: req.file.mimetype,
                    });
                    await nuevaImagen.save();
                    id_imagen = nuevaImagen._id.toString();
                    console.log("Imagen actualizada:", id_imagen);
                } catch (error) {
                    console.log(error);
                    return res.status(500).json({ error: "Error al guardar la imagen en la BD" });
                }
            }

            await carroceria.update({
                no_parte,
                color,
                folio,
                panel,
                descripcion,
                id_imagen,
                lote,
                estado: estado == 1 ? true : false,
                id_usuario
            });

            return res.json(carroceria);
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    });
};

exports.eliminarCarroceria = async (req, res) => {
    try {
        const { id } = req.params;
        const carroceria = await Carroceria.findByPk(id);
        if (!carroceria) {
            return res.status(404).json({ message: 'Carrocería no encontrada' });
        }
        await carroceria.destroy();
        return res.json({ message: 'Carrocería eliminada correctamente' });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

exports.obtenerFolio = async (req, res) => {
    try {
        const ultima = await Carroceria.findOne({ order: [['id', 'DESC']] });
        const siguienteId = ultima ? ultima.id + 1 : 1;
        const folio = `CAR-${siguienteId}`;
        return res.json({ folio });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};