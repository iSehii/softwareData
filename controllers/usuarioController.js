const { Usuario } = require('../models/usuarioModel');

exports.obtenerUsuarios = async (req, res) => {
    try {
        const usuarios = await Usuario.findAll();
        return res.json(usuarios);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

exports.obtenerUsuario = async (req, res) => {
    try {
        const { id } = req.params;
        const usuario = await Usuario.findByPk(id);
        if (!usuario) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }
        return res.json(usuario);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

exports.crearUsuario = async (req, res) => {
    try {
        const { username, nombre, correo, clave, rol_id, created_by } = req.body;
        const nuevoUsuario = await Usuario.create({
            username,
            nombre,
            correo,
            clave,
            rol_id,
            created_by
        });
        return res.status(201).json(nuevoUsuario);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

exports.actualizarUsuario = async (req, res) => {
    try {
        const { id } = req.params;
        const { username, nombre, correo, clave, rol_id, created_by } = req.body;

        const usuario = await Usuario.findByPk(id);
        if (!usuario) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        await usuario.update({
            username,
            nombre,
            correo,
            clave,
            rol_id,
            created_by
        });

        return res.json(usuario);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

exports.eliminarUsuario = async (req, res) => {
    try {
        const { id } = req.params;
        const usuario = await Usuario.findByPk(id);
        if (!usuario) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        await usuario.destroy();
        return res.json({ message: 'Usuario eliminado correctamente' });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
