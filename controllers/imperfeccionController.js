const { Imperfeccion } = require('../models/imperfeccionModel'); 

exports.obtenerImperfecciones = async (req, res) => {
    try {
        const imperfecciones = await Imperfeccion.findAll();
        if (!imperfecciones) {
            return res.status(404).json({ message: 'No hay imperfecciones registradas' });
        }
        return res.json(imperfecciones);
    } catch (error) {
        console.log(error)
        return res.status(500).json({ error: error.message });
    }
}

exports.obtenerImperfeccion = async (req, res) => {
    try {
        const { id } = req.params;
        const imperfeccion = await Imperfeccion.findByPk(id);
        if (!imperfeccion) {
            return res.status(404).json({ message: 'Imperfección no encontrada' });
        }
        return res.json(imperfeccion);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

exports.crearImperfeccion = async (req, res) => {
    try {
        const { coordenadas, severidad, created_by } = req.body;
        const nuevaImperfeccion = await Imperfeccion.create({
            coordenadas,
            severidad,
            created_by
        });
        return res.status(201).json(nuevaImperfeccion);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

exports.actualizarImperfeccion = async (req, res) => {
    try {
        const { id } = req.params;
        const { coordenadas, severidad, created_by } = req.body;
        const imperfeccion = await Imperfeccion.findByPk(id);
        if (!imperfeccion) {
            return res.status(404).json({ message: 'Imperfección no encontrada' });
        }
        await imperfeccion.update({
            coordenadas,
            severidad,
            created_by
        });
        return res.json(imperfeccion);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

exports.eliminarImperfeccion = async (req, res) => {
    try {
        const { id } = req.params;
        const imperfeccion = await Imperfeccion.findByPk(id);
        if (!imperfeccion) {
            return res.status(404).json({ message: 'Imperfección no encontrada' });
        }
        await imperfeccion.destroy();
        return res.json({ message: 'Imperfección eliminada correctamente' });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}