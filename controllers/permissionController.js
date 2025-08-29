const { Permission } = require('../models/permissionModel');
const { RolePermission } = require('../models/rolePermissionModel');
const { UserPermission } = require('../models/userPermissionModel');
const { Usuario } = require('../models/usuarioModel');
const { Rol } = require('../models/rolModel');

// Obtener todos los permisos (catálogo global)
exports.obtenerPermisos = async (req, res) => {
    try {
        const permisos = await Permission.findAll({
            order: [['module', 'ASC'], ['action', 'ASC']]
        });
        res.json(permisos);
    } catch (error) {
        console.error('Error al obtener permisos:', error);
        res.status(500).json({ error: error.message });
    }
};

// Obtener permisos de un rol específico
exports.obtenerPermisosRol = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Obtener permisos del rol usando la relación correcta
        const rolePermissions = await RolePermission.findAll({
            where: { role_id: id },
            include: [{
                model: Permission,
                as: 'Permission',
                attributes: ['id', 'module', 'action', 'descripcion']
            }],
            order: [['permission_id', 'ASC']]
        });
        
        const permisos = rolePermissions.map(rp => ({
            id: rp.Permission.id,
            module: rp.Permission.module,
            action: rp.Permission.action,
            descripcion: rp.Permission.descripcion
        }));
        
        res.json(permisos);
    } catch (error) {
        console.error('Error al obtener permisos del rol:', error);
        res.status(500).json({ error: error.message });
    }
};

// Asignar permisos a un rol (reemplaza asignaciones existentes)
exports.asignarPermisosRol = async (req, res) => {
    try {
        const { id } = req.params;
        const { permissionIds } = req.body;
        
        if (!Array.isArray(permissionIds)) {
            return res.status(400).json({ error: 'permissionIds debe ser un array' });
        }
        
        // Verificar que el rol existe
        const rol = await Rol.findByPk(id);
        if (!rol) {
            return res.status(404).json({ error: 'Rol no encontrado' });
        }
        
        // Verificar que todos los permisos existen
        const permisos = await Permission.findAll({
            where: { id: permissionIds }
        });
        
        if (permisos.length !== permissionIds.length) {
            return res.status(400).json({ error: 'Algunos permisos no existen' });
        }
        
        // Eliminar asignaciones existentes
        await RolePermission.destroy({
            where: { role_id: id }
        });
        
        // Crear nuevas asignaciones
        const asignaciones = permissionIds.map(permissionId => ({
            role_id: id,
            permission_id: permissionId
        }));
        
        await RolePermission.bulkCreate(asignaciones);
        
        res.json({ 
            message: 'Permisos asignados correctamente',
            rol: rol.nombre,
            permisosAsignados: permisos.length
        });
    } catch (error) {
        console.error('Error al asignar permisos al rol:', error);
        res.status(500).json({ error: error.message });
    }
};

// Obtener permisos efectivos de un usuario (incluyendo overrides)
exports.obtenerPermisosUsuario = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Verificar que el usuario existe
        const usuario = await Usuario.findByPk(id, {
            include: [{
                model: Rol,
                as: 'rol'
            }]
        });
        
        if (!usuario) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        
        // Obtener permisos del rol usando las relaciones many-to-many
        const rol = await Rol.findByPk(usuario.id_rol, {
            include: [{
                model: Permission,
                as: 'permissions',
                attributes: ['id', 'module', 'action', 'descripcion']
            }]
        });
        
        const permisosRol = rol ? rol.permissions : [];
        
        // Obtener overrides del usuario usando las relaciones many-to-many
        const usuarioConPermisos = await Usuario.findByPk(id, {
            include: [{
                model: Permission,
                as: 'userPermissions',
                attributes: ['id', 'module', 'action', 'descripcion']
            }]
        });
        
        const overrides = usuarioConPermisos ? usuarioConPermisos.userPermissions : [];
        
        // Procesar permisos efectivos
        const permisosEfectivos = [];
        
        // Agregar permisos del rol
        permisosRol.forEach(permiso => {
            permisosEfectivos.push({
                module: permiso.module,
                action: permiso.action,
                descripcion: permiso.descripcion,
                source: 'role'
            });
        });
        
        // Aplicar overrides
        overrides.forEach(override => {
            const permiso = override;
            const index = permisosEfectivos.findIndex(p => 
                p.module === permiso.module && p.action === permiso.action
            );
            
            if (override.allow) {
                // Permitir explícitamente
                if (index === -1) {
                    permisosEfectivos.push({
                        module: permiso.module,
                        action: permiso.action,
                        descripcion: permiso.descripcion,
                        source: 'user_allow'
                    });
                }
            } else {
                // Denegar explícitamente
                if (index !== -1) {
                    permisosEfectivos.splice(index, 1);
                }
            }
        });
        
        res.json({
            usuario: {
                id: usuario.id,
                username: usuario.username,
                id_rol: usuario.id_rol
            },
            permisos: permisosEfectivos
        });
    } catch (error) {
        console.error('Error al obtener permisos del usuario:', error);
        res.status(500).json({ error: error.message });
    }
};

// Crear un nuevo permiso
exports.crearPermiso = async (req, res) => {
    try {
        const { module, action, descripcion } = req.body;
        
        if (!module || !action) {
            return res.status(400).json({ error: 'module y action son requeridos' });
        }
        
        const permiso = await Permission.create({
            module: module.toUpperCase(),
            action: action.toUpperCase(),
            descripcion
        });
        
        res.status(201).json(permiso);
    } catch (error) {
        console.error('Error al crear permiso:', error);
        if (error.name === 'SequelizeUniqueConstraintError') {
            res.status(400).json({ error: 'Ya existe un permiso con este módulo y acción' });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
};
