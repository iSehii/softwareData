const mongoose = require("mongoose");

const imagenSchema = new mongoose.Schema({
  s3_key: { type: String, required: true }, // Clave de la imagen en S3
  contentType: { type: String, required: true }, 
});

const Imagen = mongoose.model("Imagen", imagenSchema);

module.exports = Imagen;
