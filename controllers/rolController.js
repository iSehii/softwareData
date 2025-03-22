const { Rol }  = require('../models/rolModel');


exports.obtenerRoles = async (req, res) => {
    try {
        const roles = await Rol.findAll();
        return res.json(roles);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

exports.obtenerRol = async (req, res) => {
    try {
        const { id } = req.params;
        const rol = await Rol.findByPk(id);
        if (!rol) {
            return res.status(404).json({ message: 'Rol no encontrado' });
        }
        return res.json(rol);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

exports.crearRol = async (req, res) => {
    try {
        const { nombre } = req.body;
        const nuevoRol = await Rol.create({ nombre });
        return res.status(201).json(nuevoRol);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

exports.actualizarRol = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre } = req.body;
        const rol = await Rol.findByPk(id);
        if (!rol) {
            return res.status(404).json({ message: 'Rol no encontrado' });
        }
        await rol.update({ nombre });
        return res.json(rol);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

exports.eliminarRol = async (req, res) => {
    try {
        const { id } = req.params;
        const rol = await Rol.findByPk(id);
        if (!rol) {
            return res.status(404).json({ message: 'Rol no encontrado' });
        }
        await rol.destroy();
        return res.json({ message: 'Rol eliminado correctamente' });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

