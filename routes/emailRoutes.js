const express = require('express');
const nodemailer = require('nodemailer');
const router = express.Router();

// Debug middleware for email routes
router.use((req, res, next) => {
  console.log('Email route accessed:', req.method, req.originalUrl);
  console.log('Request body:', req.body);
  next();
});

// Email validation regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Validation middleware
const validateEmail = (email) => {
  return emailRegex.test(email);
};

const validateEmailRequest = (req, res, next) => {
  const { to, subject, text, html, cc, bcc } = req.body;

  // Validate email addresses if provided
  if (to && !validateEmail(to)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid recipient email address format'
    });
  }

  if (cc && !validateEmail(cc)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid CC email address format'
    });
  }

  if (bcc && !validateEmail(bcc)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid BCC email address format'
    });
  }

  // Validate subject length if provided
  if (subject && subject.length > 100) {
    return res.status(400).json({
      success: false,
      error: 'Subject line too long (maximum 100 characters)'
    });
  }

  // Validate content length if provided
  if (text && text.length > 10000) {
    return res.status(400).json({
      success: false,
      error: 'Text content too long (maximum 10000 characters)'
    });
  }

  if (html && html.length > 50000) {
    return res.status(400).json({
      success: false,
      error: 'HTML content too long (maximum 50000 characters)'
    });
  }

  next();
};

/* Commenting out attachment validation
const validateAttachment = (req, res, next) => {
  const { attachment } = req.body;

  if (!attachment) {
    return next(); // Skip attachment validation if no attachment
  }

  // Validate attachment properties if attachment is provided
  if (!attachment.filename || !attachment.content || !attachment.contentType) {
    return res.status(400).json({
      success: false,
      error: 'Attachment must include filename, content, and contentType'
    });
  }

  // Validate file size (assuming content is base64 encoded)
  const base64Content = attachment.content.split(',')[1] || attachment.content;
  const fileSize = Math.ceil((base64Content.length * 3) / 4);
  const maxSize = 5 * 1024 * 1024; // 5MB

  if (fileSize > maxSize) {
    return res.status(400).json({
      success: false,
      error: 'Attachment size exceeds 5MB limit'
    });
  }

  // Validate file type
  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  if (!allowedTypes.includes(attachment.contentType)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid file type. Allowed types: PDF, JPEG, PNG, GIF, DOC, DOCX'
    });
  }

  next();
};
*/

// Create reusable transporter object using SMTP transport
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Route to send email
router.post('/send-email', validateEmailRequest, async (req, res) => {
  console.log('Processing send-email request');
  try {
    const { to, subject, text, html, cc, bcc } = req.body;
    console.log('Email request details:', { to, subject, cc, bcc });

    // Email options
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: to,
      cc: cc,
      bcc: bcc,
      subject: subject || 'No Subject',
      text: text,
      html: html
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);

    res.json({
      success: true,
      message: 'Email sent successfully',
      messageId: info.messageId
    });

  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({
      success: false,
      error: 'Error sending email',
      details: error.message
    });
  }
});

/* Commenting out route for sending email with attachment
router.post('/send-email-with-attachment', validateEmailRequest, validateAttachment, async (req, res) => {
  try {
    const { to, subject, text, html, cc, bcc, attachment } = req.body;

    // Email options with attachment
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: to,
      cc: cc,
      bcc: bcc,
      subject: subject || 'No Subject',
      text: text,
      html: html,
      attachments: attachment ? [{
        filename: attachment.filename,
        content: attachment.content,
        contentType: attachment.contentType
      }] : []
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);
    console.log('Email with attachment sent:', info.messageId);

    res.json({
      success: true,
      message: 'Email with attachment sent successfully',
      messageId: info.messageId
    });

  } catch (error) {
    console.error('Error sending email with attachment:', error);
    res.status(500).json({
      success: false,
      error: 'Error sending email with attachment',
      details: error.message
    });
  }
});
*/

module.exports = router; 