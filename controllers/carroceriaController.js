const { Carroceria } = require('../models/carroceriaModel');
const { Imperfeccion } = require('../models/imperfeccionModel'); // Ajusta las importaciones de tus modelos
const Imagen = require('../models/imagenesModel');
const { Reporte } = require('../models/reporteModel');

const multer = require("multer");
const axios = require('axios')
const storage = multer.memoryStorage();
const upload = multer({ storage }).single("id_imagen");


exports.obtenerCarrocerias = async (req, res) => {
    try {
        const carrocerias = await Carroceria.findAll();
        
        // Para cada carrocería, verificar si tiene reporte asociado
        const carroceriasConReporte = await Promise.all(
            carrocerias.map(async (carroceria) => {
                const reporte = await Reporte.findOne({
                    where: { id_carrocerias: carroceria.id }
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

        const carroceriaConReporte = {
            ...carroceria.toJSON(),
            tiene_reporte: !!reporte
        };

        return res.json(carroceriaConReporte);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

const ia_api = process.env.IA_API_URL; // Asegúrate de tener la URL de la API en tus variables de entorno

exports.crearCarroceria = (req, res) => {
    upload(req, res, async (err) => {
        if (err) {
            console.error("Error al subir la imagen:", err);
            return res.status(500).json({ error: "Error al subir la imagen", details: err.message });
        }

        try {
            // 1. Extraer datos del cuerpo de la solicitud
            const {
                no_parte,
                color,
                panel,
                descripcion,
                folio,
                lote,
                estado,
                id_usuario,
                id_prioridad // Se necesita para el reporte
            } = req.body;

            let id_imagen = null;

            // 2. Guardar la imagen si existe
            if (req.file) {
                try {
                    const nuevaImagen = new Imagen({
                        imagen: req.file.buffer,
                        contentType: req.file.mimetype,
                    });
                    const imagenGuardada = await nuevaImagen.save();
                    id_imagen = imagenGuardada._id.toString();
                } catch (error) {
                    console.error("Error al guardar imagen en DB:", error);
                    return res.status(500).json({ error: "Error al guardar la imagen en la base de datos" });
                }
            }

            // 3. Verificar y generar un folio único
            let nuevoFolio = folio;
            if (!nuevoFolio) { // Si no se provee un folio, se genera uno
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

            // 4. Crear la nueva carrocería
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

            // 5. Generar reporte automáticamente si se adjuntó una imagen
            if (id_imagen) {
                console.log("Iniciando la generación de reporte para la carrocería:", nuevaCarroceria.id);
                try {
                    // Llamada a la API de IA para analizar la imagen
                    const analizarImagen = await axios.post(`${ia_api}/analizar`, {
                        id: id_imagen,
                        color_referencia: color // Usamos el color de la carrocería
                    });

                    let id_imperfecciones = null;
                    console.log("Analizar imagen:", analizarImagen);
                    console.log("Analizar imagen:2", analizarImagen.data.imperfecciones_detectadas);
                    console.log("Analizar imagen:2", analizarImagen.data.detalles);
                    console.log("Analizar imagen:2", analizarImagen.data.cuadricula_afectada);
                    // Si la IA detecta imperfecciones, las guardamos
                    if (analizarImagen.data.imperfecciones_detectadas > 0) {
                        try {
                            const { coordenadas, id_resultado } = analizarImagen.data;
                            const nuevaImperfeccion = await Imperfeccion.create({
                                coordenadas: coordenadas,
                                id_severidad: null, // Asignar después si es necesario
                                id_imagen_procesada: id_resultado,
                                id_usuario: id_usuario // Se puede asignar el mismo usuario
                            });
                            id_imperfecciones = nuevaImperfeccion.id;
                            console.log("Imperfección creada con ID:", id_imperfecciones);
                        } catch (errorImperfeccion) {
                            // Si falla la creación de la imperfección, solo lo registramos pero no detenemos el flujo
                             console.error("Error al guardar la imperfección:", errorImperfeccion);
                        }
                    }

                    // Crear el registro del reporte
                    await Reporte.create({
                        id_prioridad: id_prioridad || null,
                        descripcion: descripcion || "Reporte generado automáticamente",
                        id_imperfecciones,
                        id_carrocerias: nuevaCarroceria.id, 
                        id_usuario
                    });
                     console.log("Reporte generado exitosamente para la carrocería:", nuevaCarroceria.id);

                } catch (errorReporte) {
                    console.warn("Advertencia: La carrocería se creó, pero falló la generación del reporte:", errorReporte.message);
                }
            }

            // 6. Enviar respuesta exitosa con la carrocería creada
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
                    const nuevaImagen = new Imagen({
                        imagen: req.file.buffer,
                        contentType: req.file.mimetype,
                    });
                    await nuevaImagen.save();
                    id_imagen = nuevaImagen._id.toString();
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

        // Verificar que la carrocería existe
        const carroceria = await Carroceria.findByPk(id);
        if (!carroceria) {
            return res.status(404).json({ message: 'Carrocería no encontrada' });
        }

        // Verificar si ya tiene un reporte
        const reporteExistente = await Reporte.findOne({
            where: { id_carrocerias: id }
        });

        if (reporteExistente) {
            return res.status(400).json({ message: 'Esta carrocería ya tiene un reporte generado' });
        }

        // Verificar que tenga imagen
        if (!carroceria.id_imagen) {
            return res.status(400).json({ message: 'La carrocería debe tener una imagen para generar el reporte' });
        }

        console.log("Generando reporte manualmente para la carrocería:", id);
        
        // Llamada a la API de IA para analizar la imagen
        const analizarImagen = await axios.post(`${ia_api}/analizar`, {
            id: carroceria.id_imagen,
            color_referencia: carroceria.color
        });

        let id_imperfecciones = null;

        // Si la IA detecta imperfecciones, las guardamos
        if (analizarImagen?.data?.imperfecciones_detectadas > 0) {
            try {
                const { coordenadas, imagen_resultado } = analizarImagen.data;
                const nuevaImperfeccion = await Imperfeccion.create({
                    coordenadas: coordenadas,
                    id_severidad: null,
                    id_imagen_procesada: imagen_resultado,
                    id_usuario: id_usuario
                });
                id_imperfecciones = nuevaImperfeccion.id;
                console.log("Imperfección creada con ID:", id_imperfecciones);
            } catch (errorImperfeccion) {
                console.error("Error al guardar la imperfección:", errorImperfeccion);
            }
        }

        // Crear el registro del reporte
        const nuevoReporte = await Reporte.create({
            id_prioridad: id_prioridad || null,
            descripcion: descripcion || "Reporte generado manualmente",
            id_imperfecciones,
            id_carrocerias: id,
            id_usuario
        });

        console.log("Reporte generado exitosamente para la carrocería:", id);
        return res.status(201).json(nuevoReporte);

    } catch (error) {
        console.error("Error al generar reporte:", error);
        return res.status(500).json({ error: error.message });
    }
};