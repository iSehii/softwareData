const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Usuario } = require('../models/usuarioModel');

require("dotenv").config();

exports.register = async (req, res) => {
    try {
        const { username, nombre, correo, clave, id_rol, id_usuario } = req.body;

        if (!username || !nombre || !correo || !clave || !id_rol || !id_usuario) {
            return res.status(400).json({ message: "Todos los campos son obligatorios" });
        }

        const claveEncriptada = await bcrypt.hash(clave, 10);
        const user = await Usuario.create({ 
            username, 
            nombre, 
            correo, 
            clave: claveEncriptada, 
            id_rol, 
            id_usuario 
        });

        res.json({ message: "Usuario registrado exitosamente", user });
    } catch (error) {
        res.status(500).json({ message: "Error en el registro", error });
    }
};

exports.login = async (req, res) => {
    try {
        const { username, clave } = req.body;

        if (!username || !clave) {
            return res.status(400).json({ message: "Usuario y contraseña son requeridos" });
        }

        const user = await Usuario.findOne({ where: { username } });

        if (!user) {
            return res.status(400).json({ message: "Usuario no encontrado" });
        }

        const isMatch = await bcrypt.compare(clave, user.clave);
        if (!isMatch) {
            return res.status(400).json({ message: "Contraseña incorrecta" });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, id_rol: user.id_rol },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );

        res.json({ message: "Inicio de sesión exitoso", token: token, usuario: user });
    } catch (error) {
        res.status(500).json({ message: "Error en el login", error });
    }
};

