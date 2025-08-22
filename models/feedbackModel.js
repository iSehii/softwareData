const { text } = require("body-parser");
const mongoose = require("mongoose");

const feedbackSchema = new mongoose.Schema({
  comentario: { type: String, required: false }, 
  id_usuario: { type: String, required: false }, 
  imagen: {
    data: { type: Buffer, required: false },
    contentType: { type: String, required: false }
  },
  id_imperfeccion: { type: String, required: false },
  status: { 
    type: String, 
    required: false, 
    default: 'Pendiente',
    enum: ['Pendiente', 'Respondido', 'Cerrado']
  },
  respuesta: { type: String, required: false, default: null }
});

const Feedback = mongoose.model("Feedback", feedbackSchema);

module.exports = Feedback;
