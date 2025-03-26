const { Reporte } = require('../models/reporteModel');


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
        return res.json(reporte);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

exports.crearReporte = async (req, res) => {
    try {
        const {
            id_prioridad, descripcion,
            id_imperfecciones, id_carrocerias, id_usuario
        } = req.body;
        const nuevoReporte = await Reporte.create({
            id_prioridad,
            descripcion,
            id_imperfecciones,
            id_carrocerias,
            id_usuario
        });
        return res.status(201).json(nuevoReporte);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

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
