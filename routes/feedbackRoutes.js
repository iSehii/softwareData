const { Router } = require('express');
const { obtenerFeedbacks, obtenerFeedback, crearFeedback, actualizarFeedback, eliminarFeedback } = require('../controllers/feedbackController');

const router = Router();

router.get('/', obtenerFeedbacks);
router.get('/:id', obtenerFeedback);
router.post('/', crearFeedback);
router.put('/:id', actualizarFeedback);
router.delete('/:id', eliminarFeedback);

module.exports = router;