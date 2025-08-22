const { Router } = require('express');
const { 
    obtenerPermisos, 
    obtenerPermisosRol, 
    asignarPermisosRol, 
    obtenerPermisosUsuario,
    crearPermiso
} = require('../controllers/permissionController');
const { verificarToken } = require('../middlewares/authMiddleware');

const router = Router();

// Aplicar middleware de autenticación a todas las rutas
router.use(verificarToken);

// Rutas de permisos
router.get('/', obtenerPermisos); // Catálogo global de permisos
router.post('/', crearPermiso); // Crear nuevo permiso

// Rutas de permisos por rol
router.get('/roles/:id', obtenerPermisosRol); // Obtener permisos de un rol
router.post('/roles/:id', asignarPermisosRol); // Asignar permisos a un rol

// Rutas de permisos por usuario
router.get('/usuarios/:id', obtenerPermisosUsuario); // Obtener permisos efectivos de un usuario

module.exports = router;
