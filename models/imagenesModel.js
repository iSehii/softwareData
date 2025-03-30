const mongoose = require("mongoose");

const imagenSchema = new mongoose.Schema({
  imagen: { type: Buffer, required: true }, 
  contentType: { type: String, required: true }, 
});

const Imagen = mongoose.model("Imagen", imagenSchema);

module.exports = Imagen;
