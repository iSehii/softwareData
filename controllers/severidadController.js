const { Severidad }  = require('../models/severidadModel');


exports.obtenerSeveridades = async (req, res) => {
    try {
        const severidades = await Severidad.findAll();
        return res.json(severidades);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

exports.obtenerSeveridad = async (req, res) => {
    try {
        const { id } = req.params;
        const severidad = await Severidad.findByPk(id);
        if (!severidad) {
            return res.status(404).json({ message: 'Severidad no encontrado' });
        }
        return res.json(severidad);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

exports.crearSeveridad = async (req, res) => {
    try {
        const { descripcion } = req.body;
        const nuevoSeveridad = await Severidad.create({ descripcion });
        return res.status(201).json(nuevoSeveridad);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

exports.actualizarSeveridad = async (req, res) => {
    try {
        const { id } = req.params;
        const { descripcion } = req.body;
        const severidad = await Severidad.findByPk(id);
        if (!severidad) {
            return res.status(404).json({ message: 'Severidad no encontrado' });
        }
        await severidad.update({ descripcion });
        return res.json(severidad);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

exports.eliminarSeveridad = async (req, res) => {
    try {
        const { id } = req.params;
        const severidad = await Severidad.findByPk(id);
        if (!severidad) {
            return res.status(404).json({ message: 'Severidad no encontrado' });
        }
        await severidad.destroy();
        return res.json({ message: 'Severidad eliminado correctamente' });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

