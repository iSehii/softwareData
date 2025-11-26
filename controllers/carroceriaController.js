const { Carroceria } = require('../models/carroceriaModel');
const { Imperfeccion } = require('../models/imperfeccionModel'); // Ajusta las importaciones de tus modelos
const Imagen = require('../models/imagenesModel');
const { Reporte } = require('../models/reporteModel');
const ImagenesAnalizadas = require('../models/ImagenesAnalizadasModel');
const { subirImagen: subirImagenS3 } = require('../services/s3Service');

const multer = require("multer");
const axios = require('axios')
const storage = multer.memoryStorage();
// Configurar límites: permitir imágenes de hasta 250MB (S3 puede manejar mucho más)
const upload = multer({ 
    storage,
    limits: {
        fileSize: 250 * 1024 * 1024 // 250MB en bytes
    }
}).single("id_imagen");


exports.obtenerCarrocerias = async (req, res) => {
    try {
        const carrocerias = await Carroceria.findAll();
        
        // Para cada carrocería, verificar si tiene reporte asociado
        const carroceriasConReporte = await Promise.all(
            carrocerias.map(async (carroceria) => {
                const reporte = await Reporte.findOne({
                    where: { id_carrocerias: carroceria.id },
                    order: [['createdAt', 'DESC']]
                });
                
                return {
                    ...carroceria.toJSON(),
                    tiene_reporte: !!reporte
                };
            })
        );
        
        return res.json(carroceriasConReporte);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

exports.obtenerCarroceria = async (req, res) => {
    try {
        const { id } = req.params;
        let carroceria;
        if (!isNaN(id)) {
            carroceria = await Carroceria.findByPk(id);
        } else {
            carroceria = await Carroceria.findOne({ where: { folio: id } });
        }

        if (!carroceria) {
            return res.status(404).json({ message: 'Carrocería no encontrada' });
        }

        // Verificar si tiene reporte asociado
        const reporte = await Reporte.findOne({
            where: { id_carrocerias: carroceria.id }
        });
        console.log(reporte);

        const carroceriaConReporte = {
            ...carroceria.toJSON(),
            tiene_reporte: !!reporte,
            id_reporte: reporte?.id
        };

        return res.json(carroceriaConReporte);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

const ia_api = process.env.IA_API_URL; 

exports.crearCarroceria = (req, res) => {
    upload(req, res, async (err) => {
        if (err) {
            console.error("Error al subir la imagen:", err);
            return res.status(500).json({ error: "Error al subir la imagen", details: err.message });
        }

        try {
            const {
                no_parte,
                color,
                panel,
                descripcion,
                folio,
                lote,
                estado,
                id_usuario,
                id_prioridad 
            } = req.body;

            let id_imagen = null;

            if (req.file) {
                try {
                    // Subir imagen a S3
                    const { key } = await subirImagenS3(
                        req.file.buffer,
                        req.file.mimetype
                    );

                    // Guardar referencia en MongoDB
                    const nuevaImagen = new Imagen({
                        s3_key: key,
                        contentType: req.file.mimetype,
                    });
                    const imagenGuardada = await nuevaImagen.save();
                    id_imagen = imagenGuardada._id.toString();
                } catch (error) {
                    console.error("Error al guardar imagen en DB:", error);
                    return res.status(500).json({ error: "Error al guardar la imagen en la base de datos" });
                }
            }

            let nuevoFolio = folio;
            if (!nuevoFolio) { 
                const ultima = await Carroceria.findOne({ order: [['id', 'DESC']] });
                const siguienteId = ultima ? ultima.id + 1 : 1;
                nuevoFolio = `CAR-${siguienteId}`;
            }
            
            let existe = await Carroceria.findOne({ where: { folio: nuevoFolio } });
            while (existe) {
                const siguienteId = (await Carroceria.findOne({ order: [['id', 'DESC']] })).id + 1;
                nuevoFolio = `CAR-${siguienteId}`; // Genera uno nuevo si el proporcionado ya existe
                existe = await Carroceria.findOne({ where: { folio: nuevoFolio } });
            }

            const nuevaCarroceria = await Carroceria.create({
                no_parte,
                color: color || "#FFFFFF",
                panel,
                descripcion,
                folio: nuevoFolio,
                id_imagen,
                lote,
                estado: estado == 1 || estado === true,
                id_usuario
            });

            if (id_imagen) {
                console.log("Programando generación de reporte para la carrocería:", nuevaCarroceria.id);

                // Crear el reporte en estado Pendiente antes del análisis
                const nuevoReporte = await Reporte.create({
                    id_prioridad: id_prioridad || null,
                    descripcion: descripcion || "Reporte generado automáticamente",
                    id_imperfecciones: null,
                    id_carrocerias: nuevaCarroceria.id,
                    id_usuario
                });

                setImmediate(async () => {
                    try {
                        // Obtener s3_key de la imagen para enviarla a la API
                        const imagenDoc = await Imagen.findById(id_imagen);
                        if (!imagenDoc || !imagenDoc.s3_key) {
                            console.error("No se encontró la imagen o su s3_key");
                            return;
                        }

                        const analizarImagen = await axios.post(`${ia_api}/analizar`, {
                            s3_key: imagenDoc.s3_key,
                            color_referencia: color
                        });

                        let id_imperfecciones = null;

                        if (analizarImagen.data.imperfecciones_detectadas > 0) {
                            try {
                                const { coordenadas, id_resultado, s3_key, color_dominante, detalles } = analizarImagen.data;
                                
                                // Validar que id_resultado (s3_key) exista antes de crear la imperfección
                                if (!id_resultado && !s3_key) {
                                    console.warn("No se recibió id_resultado/s3_key del análisis de IA");
                                    return;
                                }

                                const resultado_s3_key = s3_key || id_resultado;
                                
                                // Guardar imagen analizada en MongoDB
                                const nuevaImagenAnalizada = new ImagenesAnalizadas({
                                    imagen_original_s3_key: imagenDoc.s3_key,
                                    imagen_resultado_s3_key: resultado_s3_key,
                                    color_dominante: color_dominante || color,
                                    imperfecciones: detalles || coordenadas || [],
                                    contentType: "image/png"
                                });
                                const imagenAnalizadaGuardada = await nuevaImagenAnalizada.save();
                                
                                // Crear imperfección con referencia a la imagen analizada
                                const nuevaImperfeccion = await Imperfeccion.create({
                                    coordenadas: JSON.stringify(coordenadas || detalles || []),
                                    id_severidad: null,
                                    id_imagen_procesada: imagenAnalizadaGuardada._id.toString(),
                                    id_usuario: id_usuario
                                });
                                id_imperfecciones = nuevaImperfeccion.id;
                                console.log("Imperfección creada con ID:", id_imperfecciones);

                                // Actualizar el reporte con la imperfección y marcar como Completado
                                await nuevoReporte.update({
                                    id_imperfecciones: id_imperfecciones,
                                    status: 'Completado'
                                });
                            } catch (errorImperfeccion) {
                                console.error("Error al guardar la imperfección:", errorImperfeccion);
                            }
                        }

                        console.log("Reporte actualizado exitosamente para la carrocería:", nuevaCarroceria.id);
                    } catch (errorReporte) {
                        console.warn("Advertencia: La carrocería se creó, pero falló la generación del reporte:", errorReporte.message);
                    }
                });
            }

            return res.status(201).json(nuevaCarroceria);

        } catch (error) {
            console.error("Error en el proceso de crear carrocería:", error);
            return res.status(500).json({ error: "Error interno del servidor", details: error.message });
        }
    });
};

exports.actualizarCarroceria = (req, res) => {
    upload(req, res, async (err) => {
        if (err) {
            console.log(err);
            return res.status(500).json({ error: "Error al subir la imagen", err });
        }

        try {
            const { id } = req.params;
            const {
                no_parte, color, panel, descripcion,
                lote, estado, id_usuario
            } = req.body;

            const carroceria = await Carroceria.findByPk(id);
            if (!carroceria) {
                return res.status(404).json({ message: 'Carrocería no encontrada' });
            }

            let id_imagen = carroceria.id_imagen;

            if (req.file) {
                try {
                    // Si hay una imagen anterior, obtener su s3_key para reemplazarla
                    let s3_key_existente = null;
                    if (id_imagen) {
                        const imagenAnterior = await Imagen.findById(id_imagen);
                        if (imagenAnterior) {
                            s3_key_existente = imagenAnterior.s3_key;
                        }
                    }

                    // Subir nueva imagen a S3 (reutilizando la clave si existe)
                    const { key } = await subirImagenS3(
                        req.file.buffer,
                        req.file.mimetype,
                        s3_key_existente
                    );

                    // Si existe imagen anterior, actualizarla; si no, crear nueva
                    if (id_imagen) {
                        const imagenAnterior = await Imagen.findById(id_imagen);
                        if (imagenAnterior) {
                            imagenAnterior.s3_key = key;
                            imagenAnterior.contentType = req.file.mimetype;
                            await imagenAnterior.save();
                        }
                    } else {
                        const nuevaImagen = new Imagen({
                            s3_key: key,
                            contentType: req.file.mimetype,
                        });
                        await nuevaImagen.save();
                        id_imagen = nuevaImagen._id.toString();
                    }
                    console.log("Imagen actualizada:", id_imagen);
                } catch (error) {
                    console.log(error);
                    return res.status(500).json({ error: "Error al guardar la imagen en la BD" });
                }
            }

            await carroceria.update({
                no_parte,
                color,
                panel,
                descripcion,
                id_imagen,
                lote,
                estado: estado == 1 ? true : false,
                id_usuario
            });

            return res.json(carroceria);
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    });
};

exports.eliminarCarroceria = async (req, res) => {
    try {
        const { id } = req.params;
        const carroceria = await Carroceria.findByPk(id);
        if (!carroceria) {
            return res.status(404).json({ message: 'Carrocería no encontrada' });
        }
        await carroceria.destroy();
        return res.json({ message: 'Carrocería eliminada correctamente' });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

exports.obtenerFolio = async (req, res) => {
    try {
        const ultima = await Carroceria.findOne({ order: [['id', 'DESC']] });
        const siguienteId = ultima ? ultima.id + 1 : 1;
        const folio = `CAR-${siguienteId}`;
        return res.json({ folio });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

exports.generarReporte = async (req, res) => {
    try {
        const { id } = req.params;
        const { id_prioridad, descripcion, id_usuario } = req.body;

        const [carroceria, reporteExistente] = await Promise.all([
            Carroceria.findByPk(id),
            Reporte.findOne({ where: { id_carrocerias: id } })
        ]);

        if (!carroceria) {
            return res.status(404).json({ message: 'Carrocería no encontrada' });
        }

        if (reporteExistente) {
            return res.status(400).json({ message: 'Esta carrocería ya tiene un reporte generado' });
        }

        if (!carroceria.id_imagen) {
            return res.status(400).json({ message: 'La carrocería debe tener una imagen para generar el reporte' });
        }

        console.log("Generando reporte manualmente para la carrocería:", id);
        
        const nuevoReporte = await Reporte.create({
            id_prioridad: id_prioridad || null,
            descripcion: descripcion || "Reporte generado manualmente",
            id_imperfecciones: null, 
            id_carrocerias: id,
            id_usuario
        });

        setImmediate(async () => {
            try {
                // Obtener s3_key de la imagen para enviarla a la API
                const imagenDoc = await Imagen.findById(carroceria.id_imagen);
                if (!imagenDoc || !imagenDoc.s3_key) {
                    console.error("No se encontró la imagen o su s3_key");
                    return;
                }

                const analizarImagen = await axios.post(`${ia_api}/analizar`, {
                    s3_key: imagenDoc.s3_key,
                    color_referencia: carroceria.color
                });

                if (analizarImagen?.data?.imperfecciones_detectadas > 0) {
                    try {
                        const { coordenadas, id_resultado, s3_key, color_dominante, detalles } = analizarImagen.data;
                        
                        // Validar que id_resultado (s3_key) exista antes de crear la imperfección
                        if (!id_resultado && !s3_key) {
                            console.warn("No se recibió id_resultado/s3_key del análisis de IA");
                            return;
                        }

                        const resultado_s3_key = s3_key || id_resultado;
                        
                        // Guardar imagen analizada en MongoDB
                        const nuevaImagenAnalizada = new ImagenesAnalizadas({
                            imagen_original_s3_key: imagenDoc.s3_key,
                            imagen_resultado_s3_key: resultado_s3_key,
                            color_dominante: color_dominante || carroceria.color,
                            imperfecciones: detalles || coordenadas || [],
                            contentType: "image/png"
                        });
                        const imagenAnalizadaGuardada = await nuevaImagenAnalizada.save();
                        
                        // Crear imperfección con referencia a la imagen analizada
                        const nuevaImperfeccion = await Imperfeccion.create({
                            coordenadas: JSON.stringify(coordenadas || detalles || []),
                            id_severidad: null,
                            id_imagen_procesada: imagenAnalizadaGuardada._id.toString(),
                            id_usuario: id_usuario
                        });
                        
                        await nuevoReporte.update({ id_imperfecciones: nuevaImperfeccion.id, status: 'Completado' });
                        
                        console.log("Imperfección creada con ID:", nuevaImperfeccion.id);
                    } catch (errorImperfeccion) {
                        console.error("Error al guardar la imperfección:", errorImperfeccion);
                    }
                }
            } catch (error) {
                console.error("Error en análisis de IA:", error);
            }
        });

        return res.status(201).json({
            ...nuevoReporte.toJSON(),
            message: "Reporte creado exitosamente. El análisis de IA se está procesando en background."
        });

    } catch (error) {
        console.error("Error al generar reporte:", error);
        return res.status(500).json({ error: error.message });
    }
};