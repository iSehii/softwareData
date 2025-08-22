const Feedback = require('../models/feedbackModel');
const multer = require("multer");

const storage = multer.memoryStorage();
const upload = multer({ storage }).single("imagen");

// Middleware de logging para todas las requests
const logRequest = (req, res, next) => {
    console.log('🌐 [FEEDBACK] Request recibida:', {
        method: req.method,
        url: req.url,
        headers: req.headers,
        body: req.body,
        file: req.file
    });
    next();
};

exports.obtenerFeedbacks = async (req, res) => {
    console.log('=== INICIO obtenerFeedbacks ===');
    console.log('🔍 [FEEDBACK] obtenerFeedbacks llamado');
    try {
        const feedbacks = await Feedback.find();
        console.log(`✅ [FEEDBACK] ${feedbacks.length} feedbacks encontrados`);
        res.json(feedbacks);
    } catch (error) {
        console.error('❌ [FEEDBACK] Error en obtenerFeedbacks:', error);
        res.status(500).json({ error: error.message });
    }
}

exports.obtenerFeedback = async (req, res) => {
    console.log('=== INICIO obtenerFeedback ===');
    console.log('🔍 [FEEDBACK] obtenerFeedback llamado con ID:', req.params.id);
    try {
        const { id } = req.params;
        const feedback = await Feedback.findById(id);
        if (!feedback) {
            console.log('❌ [FEEDBACK] Feedback no encontrado con ID:', id);
            return res.status(404).json({ message: 'Feedback no encontrado' });
        }
        
        
        // Si tiene imagen, convertirla a base64
        if (feedback.imagen && feedback.imagen.data) {
            console.log('🖼️ [FEEDBACK] Convirtiendo imagen a base64');
            const base64 = feedback.imagen.data.toString("base64");
            const dataUri = `data:${feedback.imagen.contentType};base64,${base64}`;
            
            return res.json({
                ...feedback.toObject(),
                imagenBase64: dataUri
            });
        }
        
        res.json(feedback);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

exports.crearFeedback = (req, res) => {
    
    upload(req, res, async (err) => {
        if (err) {
            return res.status(500).json({ error: "Error al subir la imagen", details: err.message });
        }

        try {
            
            const { comentario, id_usuario } = req.body;
            let imagenData = null;

            if (req.file) {
                
                
                imagenData = {
                    data: req.file.buffer,
                    contentType: req.file.mimetype
                };
                
            } else {
                
            }

            console.log('📝 [FEEDBACK] Creando feedback con datos:', {
                comentario,
                id_usuario,
                tieneImagen: !!imagenData,
                status: 'Pendiente',
                respuesta: null
            });

            const feedback = await Feedback.create({ 
                comentario, 
                id_usuario, 
                imagen: imagenData,
                status: 'Pendiente',
                respuesta: null
            });
            
            console.log('✅ [FEEDBACK] Feedback creado exitosamente con ID:', feedback._id);
            res.json(feedback);
        } catch (error) {
            console.error('❌ [FEEDBACK] Error al crear feedback:', error);
            res.status(500).json({ error: error.message });
        }
    });
};

exports.actualizarFeedback = (req, res) => {
    console.log('=== INICIO actualizarFeedback ===');
    console.log('🔄 [FEEDBACK] actualizarFeedback llamado con ID:', req.params.id);
    console.log('📋 [FEEDBACK] Headers recibidos:', req.headers);
    console.log('📦 [FEEDBACK] Body recibido:', req.body);
    console.log('📁 [FEEDBACK] File recibido:', req.file);
    
    upload(req, res, async (err) => {
        if (err) {
            console.error("❌ [FEEDBACK] Error al subir la imagen:", err);
            return res.status(500).json({ error: "Error al subir la imagen", details: err.message });
        }

        try {
            console.log('✅ [FEEDBACK] Upload completado exitosamente');
            console.log('📋 [FEEDBACK] Body después del upload:', req.body);
            console.log('📁 [FEEDBACK] File después del upload:', req.file);
            
            const { id } = req.params;
            const { comentario, id_usuario, status, respuesta } = req.body;
            let imagenData = null;

            if (req.file) {
                console.log('🖼️ [FEEDBACK] Archivo detectado, procesando imagen');
                console.log('📊 [FEEDBACK] Tamaño del archivo:', req.file.size, 'bytes');
                console.log('🎯 [FEEDBACK] Tipo MIME:', req.file.mimetype);
                
                imagenData = {
                    data: req.file.buffer,
                    contentType: req.file.mimetype
                };
                console.log('💾 [FEEDBACK] Imagen procesada, tamaño del buffer:', imagenData.data.length);
            } else {
                console.log('⚠️ [FEEDBACK] No se detectó archivo en la request');
            }

            console.log('📝 [FEEDBACK] Actualizando feedback con datos:', {
                comentario,
                id_usuario,
                status,
                respuesta,
                tieneImagen: !!imagenData
            });

            const updateData = { comentario, id_usuario };
            if (status) updateData.status = status;
            if (respuesta) updateData.respuesta = respuesta;
            if (imagenData) updateData.imagen = imagenData;

            const feedback = await Feedback.findByIdAndUpdate(
                id,
                updateData,
                { new: true }
            );
            if (!feedback) {
                console.log('❌ [FEEDBACK] Feedback no encontrado para actualizar con ID:', id);
                return res.status(404).json({ message: 'Feedback no encontrado' });
            }
            
            console.log('✅ [FEEDBACK] Feedback actualizado exitosamente con ID:', feedback._id);
            res.json(feedback);
        } catch (error) {
            console.error('❌ [FEEDBACK] Error al actualizar feedback:', error);
            res.status(500).json({ error: error.message });
        }
    });
};

exports.eliminarFeedback = async (req, res) => {
    console.log('=== INICIO eliminarFeedback ===');
    console.log('🗑️ [FEEDBACK] eliminarFeedback llamado con ID:', req.params.id);
    try {
        const { id } = req.params;
        const deleted = await Feedback.findByIdAndDelete(id);
        if (!deleted) {
            console.log('❌ [FEEDBACK] Feedback no encontrado para eliminar con ID:', id);
            return res.status(404).json({ message: 'Feedback no encontrado' });
        }
        
        console.log('✅ [FEEDBACK] Feedback eliminado exitosamente con ID:', id);
        res.json({ message: 'Feedback eliminado correctamente' });
    } catch (error) {
        console.error('❌ [FEEDBACK] Error al eliminar feedback:', error);
        res.status(500).json({ error: error.message });
    }
}

exports.responderFeedback = async (req, res) => {
    console.log('=== INICIO responderFeedback ===');
    console.log('💬 [FEEDBACK] responderFeedback llamado con ID:', req.params.id);
    console.log('📦 [FEEDBACK] Body recibido:', req.body);
    
    try {
        const { id } = req.params;
        const { respuesta, status = 'Respondido' } = req.body;
        
        if (!respuesta) {
            console.log('❌ [FEEDBACK] Respuesta es requerida');
            return res.status(400).json({ error: 'La respuesta es requerida' });
        }

        console.log('📝 [FEEDBACK] Respondiendo feedback con datos:', {
            id,
            respuesta,
            status
        });

        const feedback = await Feedback.findByIdAndUpdate(
            id,
            { 
                respuesta, 
                status 
            },
            { new: true }
        );
        
        if (!feedback) {
            console.log('❌ [FEEDBACK] Feedback no encontrado para responder con ID:', id);
            return res.status(404).json({ message: 'Feedback no encontrado' });
        }
        
        console.log('✅ [FEEDBACK] Feedback respondido exitosamente con ID:', feedback._id);
        res.json(feedback);
    } catch (error) {
        console.error('❌ [FEEDBACK] Error al responder feedback:', error);
        res.status(500).json({ error: error.message });
    }
}