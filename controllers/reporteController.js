const Imagen = require("../models/imagenesModel");
const { Imperfeccion } = require('../models/imperfeccionModel'); 
const ImagenesAnalizadas = require("../models/ImagenesAnalizadasModel");
const { Reporte } = require('../models/reporteModel');

const ia_api = process.env.IA_API;

exports.obtenerReportes = async (req, res) => {
    try {
        const reportes = await Reporte.findAll();
        return res.json(reportes);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

exports.obtenerReporte = async (req, res) => {
    try {
        const { id } = req.params;
        const reporte = await Reporte.findByPk(id);
        if (!reporte) {
            return res.status(404).json({ message: 'Reporte no encontrado' });
        }

        let imperfecciones = null;
        let imagen_analizada = null;

        // Solo buscar imperfecciones si el reporte tiene id_imperfecciones
        if (reporte.id_imperfecciones) {
            imperfecciones = await Imperfeccion.findByPk(reporte.id_imperfecciones);
            
            // Solo buscar imagen analizada si la imperfección tiene id_imagen_procesada
            if (imperfecciones && imperfecciones.id_imagen_procesada) {
                imagen_analizada = await ImagenesAnalizadas
                    .findById(imperfecciones.id_imagen_procesada)
                    .select('-imagen_resultado'); // Excluir el binario de la imagen procesada
            }
        }

        return res.json({ 
            reporte, 
            imperfecciones, 
            imagen_analizada,
            tiene_imagen: !!imagen_analizada,
            tiene_imperfecciones: !!imperfecciones
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: error.message });
    }
}

exports.crearReporte = async (req, res) => {
    try {
        const {
            id_prioridad, descripcion,
            color_referencia,
            id_carrocerias, id_usuario
        } = req.body;

        const carroceria = await Carroceria.findByPk(id_carrocerias);
        if (!carroceria) {
            return res.status(404).json({ error: "No se encontró la carrocería." });
        }

        if (!carroceria.id_imagen) {
            return res.status(400).json({ error: "No se encontró imagen, por favor agregue una imagen para generar el reporte." });
        }

        const imagen = await Imagen.findById(carroceria.id_imagen);
        if (!imagen) {
            return res.status(400).json({ error: "No se encontró imagen, por favor agregue una imagen para generar el reporte." });
        }

        const analizarImagen = await axios.post(`${ia_api}/analizar`, {
            id: carroceria.id_imagen,
            color_referencia: color_referencia
        });

        let id_imperfecciones = null;

        if (analizarImagen?.data?.ok) {
            if (analizarImagen.data.imperfecciones_detectadas !== 0) {
                try {
                    const { coordenadas, id_resultado } = analizarImagen.data;
                    const nuevaImperfeccion = await Imperfeccion.create({
                        coordenadas: coordenadas,
                        id_severidad: null,
                        id_imagen_procesada: id_resultado,
                        id_usuario: null
                    });
                    id_imperfecciones = nuevaImperfeccion.id;
                } catch (error) {
                    return res.status(500).json({ error: error.message });
                }
            }
        }

        const nuevoReporte = await Reporte.create({
            id_prioridad: id_prioridad || null,
            descripcion: descripcion || "Sin descripción",
            id_imperfecciones,
            id_carrocerias,
            id_usuario
        });

        return res.status(201).json(nuevoReporte);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

exports.actualizarReporte = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            id_prioridad, descripcion,
            id_imperfecciones, id_carrocerias, id_usuario
        } = req.body;
        const reporte = await Reporte.findByPk(id);
        if (!reporte) {
            return res.status(404).json({ message: 'Reporte no encontrado' });
        }
        await reporte.update({
            id_prioridad,
            descripcion,
            id_imperfecciones,
            id_carrocerias,
            id_usuario
        });
        return res.json(reporte);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

exports.eliminarReporte = async (req, res) => {
    try {
        const { id } = req.params;
        const reporte = await Reporte.findByPk(id);
        if (!reporte) {
            return res.status(404).json({ message: 'Reporte no encontrado' });
        }
        await reporte.destroy();
        return res.json({ message: 'Reporte eliminado correctamente' });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
