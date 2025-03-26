const { Prioridad }  = require('../models/prioridadModel');


exports.obtenerPrioridades = async (req, res) => {
    try {
        const prioridades = await Prioridad.findAll();
        return res.json(prioridades);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

exports.obtenerPrioridad = async (req, res) => {
    try {
        const { id } = req.params;
        const prioridad = await Prioridad.findByPk(id);
        if (!prioridad) {
            return res.status(404).json({ message: 'Prioridad no encontrado' });
        }
        return res.json(prioridad);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

exports.crearPrioridad = async (req, res) => {
    try {
        const { descripcion } = req.body;
        const nuevoPrioridad = await Prioridad.create({ descripcion });
        return res.status(201).json(nuevoPrioridad);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

exports.actualizarPrioridad = async (req, res) => {
    try {
        const { id } = req.params;
        const { descripcion } = req.body;
        const prioridad = await Prioridad.findByPk(id);
        if (!prioridad) {
            return res.status(404).json({ message: 'Prioridad no encontrado' });
        }
        await prioridad.update({ descripcion });
        return res.json(prioridad);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

exports.eliminarPrioridad = async (req, res) => {
    try {
        const { id } = req.params;
        const prioridad = await Prioridad.findByPk(id);
        if (!prioridad) {
            return res.status(404).json({ message: 'Prioridad no encontrado' });
        }
        await prioridad.destroy();
        return res.json({ message: 'Prioridad eliminado correctamente' });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

