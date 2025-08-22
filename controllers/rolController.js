const { Rol } = require('../models/rolModel');
const { Permission } = require('../models/permissionModel');
const { RolePermission } = require('../models/rolePermissionModel');

// Obtener todos los roles
exports.obtenerRoles = async (req, res) => {
    try {
        const roles = await Rol.findAll({
            order: [['nombre', 'ASC']]
        });
        res.json(roles);
    } catch (error) {
        console.error('Error al obtener roles:', error);
        res.status(500).json({ error: error.message });
    }
};

// Obtener un rol por ID
exports.obtenerRol = async (req, res) => {
    try {
        const { id } = req.params;
        const rol = await Rol.findByPk(id);
        
        if (!rol) {
            return res.status(404).json({ error: 'Rol no encontrado' });
        }
        
        res.json(rol);
    } catch (error) {
        console.error('Error al obtener rol:', error);
        res.status(500).json({ error: error.message });
    }
};

// Crear un nuevo rol
exports.crearRol = async (req, res) => {
    try {
        const { nombre, descripcion } = req.body;
        
        if (!nombre) {
            return res.status(400).json({ error: 'El nombre del rol es requerido' });
        }
        
        const rol = await Rol.create({
            nombre: nombre.trim(),
            descripcion: descripcion?.trim() || null
        });
        
        res.status(201).json(rol);
    } catch (error) {
        console.error('Error al crear rol:', error);
        if (error.name === 'SequelizeUniqueConstraintError') {
            res.status(400).json({ error: 'Ya existe un rol con este nombre' });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
};

// Actualizar un rol
exports.actualizarRol = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, descripcion } = req.body;
        
        const rol = await Rol.findByPk(id);
        if (!rol) {
            return res.status(404).json({ error: 'Rol no encontrado' });
        }
        
        await rol.update({
            nombre: nombre?.trim() || rol.nombre,
            descripcion: descripcion?.trim() || rol.descripcion
        });
        
        res.json(rol);
    } catch (error) {
        console.error('Error al actualizar rol:', error);
        if (error.name === 'SequelizeUniqueConstraintError') {
            res.status(400).json({ error: 'Ya existe un rol con este nombre' });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
};

// Eliminar un rol
exports.eliminarRol = async (req, res) => {
    try {
        const { id } = req.params;
        
        const rol = await Rol.findByPk(id);
        if (!rol) {
            return res.status(404).json({ error: 'Rol no encontrado' });
        }
        
        // Verificar si hay usuarios usando este rol
        const { Usuario } = require('../models/usuarioModel');
        const usuariosConRol = await Usuario.count({
            where: { id_rol: id }
        });
        
        if (usuariosConRol > 0) {
            return res.status(400).json({ 
                error: `No se puede eliminar el rol. Hay ${usuariosConRol} usuario(s) asignados a este rol.` 
            });
        }
        
        await rol.destroy();
        res.json({ message: 'Rol eliminado correctamente' });
    } catch (error) {
        console.error('Error al eliminar rol:', error);
        res.status(500).json({ error: error.message });
    }
};

// Obtener permisos de un rol
exports.obtenerPermisosRol = async (req, res) => {
    try {
        const { id } = req.params;
        
        const rol = await Rol.findByPk(id);
        if (!rol) {
            return res.status(404).json({ error: 'Rol no encontrado' });
        }
        
        // Usar la consulta que funciona (igual que en authController)
        const rolePermissions = await RolePermission.findAll({
            where: { role_id: id },
            include: [{
                model: Permission,
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
        
        res.json({
            rol: {
                id: rol.id,
                nombre: rol.nombre,
                descripcion: rol.descripcion
            },
            permisos: permisos
        });
    } catch (error) {
        console.error('Error al obtener permisos del rol:', error);
        res.status(500).json({ error: error.message });
    }
};

// Asignar permisos a un rol
exports.asignarPermisosRol = async (req, res) => {
    try {
        const { id } = req.params;
        const { permissionIds } = req.body;
        
        if (!Array.isArray(permissionIds)) {
            return res.status(400).json({ error: 'permissionIds debe ser un array' });
        }
        
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

