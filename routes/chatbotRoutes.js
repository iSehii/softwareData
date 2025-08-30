const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middlewares/authMiddleware');
const { checkPermission } = require('../middlewares/permissionMiddleware');
const chatbotController = require('../controllers/chatbotController');

// Ruta principal del chat (requiere autenticación)
router.post('/chat', verificarToken, chatbotController.chat);

// Ruta para obtener estadísticas del chatbot (requiere autenticación)
router.post('/stats', verificarToken, chatbotController.getChatbotStats);

// Ruta para obtener historial completo de un usuario específico
router.post('/user-history', verificarToken, chatbotController.getUserHistory);

// Ruta de prueba para verificar relaciones
router.post('/test-relations', verificarToken, chatbotController.testRelations);

// Ruta de prueba para verificar que el chatbot esté funcionando
router.post('/health', verificarToken, (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Chatbot funcionando correctamente',
        timestamp: new Date().toISOString(),
        usuario: req.body.id
    });
});

module.exports = router;
