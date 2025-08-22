const { Router } = require('express');
const { obtenerFeedbacks, obtenerFeedback, crearFeedback, actualizarFeedback, eliminarFeedback, responderFeedback } = require('../controllers/feedbackController');

const router = Router();

router.get('/', obtenerFeedbacks);
router.get('/:id', obtenerFeedback);
router.post('/', crearFeedback);
router.put('/:id', actualizarFeedback);
router.delete('/:id', eliminarFeedback);
router.post('/:id/responder', responderFeedback);

module.exports = router;