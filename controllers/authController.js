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
            { expiresIn: "100h" }
        );


        res.json({ message: "Inicio de sesión exitoso", token: token, usuario: user });
    } catch (error) {
        res.status(500).json({ message: "Error en el login", error });
    }
};


exports.verifyToken = async (req, res) => {
    try {
        const authHeader = req.headers.authorization; // Espera 'Bearer TOKEN'

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.log(req.headers.authorization)
            return res.status(401).json({ message: "Token no proporcionado o formato incorrecto" });
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await Usuario.findOne({ where: { id: decoded.id } });

        if (!user) {
            return res.status(404).json({ message: "Usuario no encontrado" });
        }

        res.json({ message: "Token válido", usuario: user });
    } catch (error) {
        console.log(error)
        console.log(req.headers)
        res.status(401).json({ message: "Token inválido o expirado", error: error.message });
    }
};

exports.refreshToken = async (req, res) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: "Token no proporcionado" });
        }

        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await Usuario.findOne({ where: { id: decoded.id } });

        if (!user) {
            return res.status(404).json({ message: "Usuario no encontrado" });
        }

        // Generate new token
        const newToken = jwt.sign(
            { id: user.id, username: user.username, id_rol: user.id_rol },
            process.env.JWT_SECRET,
            { expiresIn: "100h" }
        );

        res.json({ 
            message: "Token renovado exitosamente", 
            newToken: newToken,
            usuario: user 
        });
    } catch (error) {
        console.log('Token refresh error:', error);
        res.status(401).json({ message: "Token inválido o expirado", error: error.message });
    }
};