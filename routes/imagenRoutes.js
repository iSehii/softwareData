const { Router } = require('express');

const { subirImagen, obtenerImagenes, obtenerImagenPorId, obtenerImagenAnalizadaPorId, obtenerDatosPorId, actualizarImagen, eliminarImagen } = require("../controllers/imagenController");

const router = Router();

router.post("/", subirImagen);         
router.get("/", obtenerImagenes);            
router.get("/:id", obtenerImagenPorId);     
router.get("/analizadas/imagen/:id", obtenerImagenAnalizadaPorId);
router.get("/analizadas/:id", obtenerDatosPorId);
router.put("/:id", actualizarImagen);       
router.delete("/:id", eliminarImagen);      


module.exports = router;
