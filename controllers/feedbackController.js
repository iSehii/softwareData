const Feedback = require('../models/feedbackModel');

exports.obtenerFeedbacks = async (req, res) => {
    try {
        const feedbacks = await Feedback.find();
        res.json(feedbacks);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

exports.obtenerFeedback = async (req, res) => {
    try {
        const { id } = req.params;
        const feedback = await Feedback.findById(id);
        if (!feedback) return res.status(404).json({ message: 'Feedback no encontrado' });
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
        const feedback = await Feedback.findByIdAndUpdate(
            id,
            { comentario, id_usuario, imagen, id_imperfeccion },
            { new: true }
        );
        if (!feedback) return res.status(404).json({ message: 'Feedback no encontrado' });
        res.json(feedback);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

exports.eliminarFeedback = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await Feedback.findByIdAndDelete(id);
        if (!deleted) return res.status(404).json({ message: 'Feedback no encontrado' });
        res.json({ message: 'Feedback eliminado correctamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}