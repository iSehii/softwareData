const { text } = require("body-parser");
const mongoose = require("mongoose");

const feedbackSchema = new mongoose.Schema({
  comentario: { type: String, required: false }, 
  id_usuario: { type: String, required: false }, 
  imagen: { type: String, required: false }, 
  id_imperfeccion: { type: String, required: false }, 
});

const Feedback = mongoose.model("Feedback", feedbackSchema);

module.exports = Feedback;
