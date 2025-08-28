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

router.use(verificarToken);

router.get('/', obtenerPermisos);
router.post('/', crearPermiso);
router.get('/roles/:id', obtenerPermisosRol);
router.post('/roles/:id', asignarPermisosRol);
router.get('/usuarios/:id', obtenerPermisosUsuario);

module.exports = router;
