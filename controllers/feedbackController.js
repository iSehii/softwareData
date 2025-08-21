const { Feedback } = require('../models/feedbackModel');

exports.obtenerFeedbacks = async (req, res) => {
    try {
        const feedbacks = await Feedback.findAll();
        res.json(feedbacks);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

exports.obtenerFeedback = async (req, res) => {
    try {
        const { id } = req.params;
        const feedback = await Feedback.findByPk(id);
        res.json(feedback);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

exports.crearFeedback = async (req, res) => {
    try {
        const { comentario, id_usuario, imagen, id_imperfeccion } = req.body;
        const feedback = await Feedback.create({ comentario, id_usuario, imagen, id_imperfeccion });
        res.json(feedback);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

exports.actualizarFeedback = async (req, res) => {
    try {
        const { id } = req.params;
        const { comentario, id_usuario, imagen, id_imperfeccion } = req.body;
        const feedback = await Feedback.update({ comentario, id_usuario, imagen, id_imperfeccion }, { where: { id } });
        res.json(feedback);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

exports.eliminarFeedback = async (req, res) => {
    try {
        const { id } = req.params;
        await Feedback.destroy({ where: { id } });
        res.json({ message: 'Feedback eliminado correctamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}