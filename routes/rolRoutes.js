const { Router } = require('express');
const { 
    obtenerRoles, 
    obtenerRol, 
    crearRol, 
    actualizarRol, 
    eliminarRol,
    obtenerPermisosRol,
    asignarPermisosRol
} = require('../controllers/rolController');
const { verificarToken } = require('../middlewares/authMiddleware');

const router = Router();

// Aplicar middleware de autenticación a todas las rutas
router.use(verificarToken);

// Rutas básicas de roles
router.get('/', obtenerRoles);
router.get('/:id', obtenerRol);
router.post('/', crearRol);
router.put('/:id', actualizarRol);
router.delete('/:id', eliminarRol);

// Rutas de permisos por rol
router.get('/:id/permissions', obtenerPermisosRol);
router.post('/:id/permissions', asignarPermisosRol);

module.exports = router;
