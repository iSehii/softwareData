const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Usuario } = require('../models/usuarioModel');
const { Permission } = require('../models/permissionModel');
const { RolePermission } = require('../models/rolePermissionModel');
const { UserPermission } = require('../models/userPermissionModel');

require("dotenv").config();

// Función auxiliar para obtener permisos del rol (para login)
async function obtenerPermisosPorRol(roleId) {
    try {
        if (!roleId) {
            console.log('⚠️ [AUTH] Usuario sin rol asignado');
            return [];
        }
        
        // Usar la consulta que funciona directamente
        const rolePermissions = await RolePermission.findAll({
            where: { role_id: roleId },
            include: [{
                model: Permission,
                attributes: ['id', 'module', 'action', 'descripcion']
            }]
        });
        
        const permisos = rolePermissions.map(rp => ({
            module: rp.Permission.module,
            action: rp.Permission.action,
            descripcion: rp.Permission.descripcion
        }));
        
        console.log(`🔑 [AUTH] Permisos del rol ${roleId}: ${permisos.length} permisos obtenidos`);
        
        return permisos;
    } catch (error) {
        console.error('❌ [AUTH] Error al obtener permisos del rol:', error);
        return [];
    }
}

// Función auxiliar para obtener permisos efectivos de un usuario (para consultas específicas)
async function obtenerPermisosEfectivosUsuario(userId, roleId) {
    try {
        // Obtener permisos del rol
        const permisosRol = await Permission.findAll({
            include: [{
                model: RolePermission,
                where: { role_id: roleId },
                attributes: []
            }],
            attributes: ['id', 'module', 'action', 'descripcion']
        });
        
        // Obtener overrides del usuario
        const overrides = await UserPermission.findAll({
            where: { usuario_id: userId },
            include: [{
                model: Permission,
                attributes: ['id', 'module', 'action', 'descripcion']
            }]
        });
        
        // Procesar permisos efectivos
        const permisosEfectivos = [];
        
        // Agregar permisos del rol
        permisosRol.forEach(permiso => {
            permisosEfectivos.push({
                module: permiso.module,
                action: permiso.action,
                descripcion: permiso.descripcion
            });
        });
        
        // Aplicar overrides
        overrides.forEach(override => {
            const permiso = override.Permission;
            const index = permisosEfectivos.findIndex(p => 
                p.module === permiso.module && p.action === permiso.action
            );
            
            if (override.allow) {
                // Permitir explícitamente
                if (index === -1) {
                    permisosEfectivos.push({
                        module: permiso.module,
                        action: permiso.action,
                        descripcion: permiso.descripcion
                    });
                }
            } else {
                // Denegar explícitamente
                if (index !== -1) {
                    permisosEfectivos.splice(index, 1);
                }
            }
        });
        
        return permisosEfectivos;
    } catch (error) {
        console.error('Error al obtener permisos efectivos del usuario:', error);
        return [];
    }
}

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

        // Obtener permisos del rol del usuario (para login)
        const permisos = await obtenerPermisosPorRol(user.id_rol);

        const token = jwt.sign(
            { 
                id: user.id, 
                username: user.username, 
                correo: user.correo, 
                id_rol: user.id_rol,
                permissions: permisos
            },
            process.env.JWT_SECRET,
            { expiresIn: "100h" }
        );

        console.log(`✅ [AUTH] Login exitoso para usuario ${user.username} con ${permisos.length} permisos del rol`);

        res.json({ 
            message: "Inicio de sesión exitoso", 
            token: token, 
            usuario: user,
            permissions: permisos
        });
    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ message: "Error en el login", error: error.message });
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

        // Obtener permisos del rol (para verificación de token)
        const permisos = await obtenerPermisosPorRol(user.id_rol);

        res.json({ 
            message: "Token válido", 
            usuario: user,
            permissions: permisos
        });
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

        // Obtener permisos del rol (para refresh de token)
        const permisos = await obtenerPermisosPorRol(user.id_rol);

        // Generate new token
        const newToken = jwt.sign(
            { 
                id: user.id, 
                username: user.username, 
                id_rol: user.id_rol,
                permissions: permisos
            },
            process.env.JWT_SECRET,
            { expiresIn: "100h" }
        );

        res.json({ 
            message: "Token renovado exitosamente", 
            newToken: newToken,
            usuario: user,
            permissions: permisos
        });
    } catch (error) {
        console.log('Token refresh error:', error);
        res.status(401).json({ message: "Token inválido o expirado", error: error.message });
    }
};

// Exportar la función para uso en middleware
exports.obtenerPermisosPorRol = obtenerPermisosPorRol;