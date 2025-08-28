const { Router } = require('express');
const { 
    getCalidadPorDia, 
    getCalidadUltimaSemana, 
    getTendenciasCalidad 
} = require('../controllers/kpiController');
const { verificarToken } = require('../middlewares/authMiddleware');

const router = Router();

router.use(verificarToken);

router.get('/calidad-dia', getCalidadPorDia);

router.get('/calidad-semana', getCalidadUltimaSemana);

router.get('/tendencias', getTendenciasCalidad);

module.exports = router;
