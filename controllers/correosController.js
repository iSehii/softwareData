const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST, 
  port: 465,             
  secure: true,          
  auth: {
    user: process.env.EMAIL_USER, 
    pass: process.env.EMAIL_PASS, 
  },
});

const sendEmail = async (to, subject, html, attachments = []) => {
  try {
    const mailOptions = {
      from: `"Lumet Inspection" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    };

    // Agregar archivos adjuntos si existen
    if (attachments && attachments.length > 0) {
      mailOptions.attachments = attachments;
      console.log(`Enviando email con ${attachments.length} archivo(s) adjunto(s)`);
    }

    const info = await transporter.sendMail(mailOptions);

    console.log("Correo enviado:", info.messageId);
    return { success: true, info };
  } catch (error) {
    console.error("Error al enviar correo:", error);
    return { success: false, error };
  }
};

module.exports = { sendEmail };