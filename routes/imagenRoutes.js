const { Router } = require('express');

const { subirImagen, obtenerImagenes, obtenerImagenPorId, actualizarImagen, eliminarImagen } = require("../controllers/imagenController");

const router = Router();

router.post("/crear", subirImagen);         
router.get("/", obtenerImagenes);            
router.get("/:id", obtenerImagenPorId);     
router.put("/:id", actualizarImagen);       
router.delete("/:id", eliminarImagen);      


module.exports = router;
