require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs-extra');
const { errorHandler } = require('./middleware/errorHandler');
const pdfRoutes = require('./routes/pdfRoutes');
const emailRoutes = require('./routes/emailRoutes');

const app = express();

// Debug middleware to log all requests
app.use((req, res, next) => {
  console.log(`\n📥 Incoming ${req.method} request to ${req.originalUrl}`);
  console.log('Request body:', req.body);
  next();
});

// CORS configuration
app.use(cors({
  origin: 'https://pickra.vercel.app',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
fs.ensureDirSync(uploadsDir);

// Welcome message at root
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Pickra Backend API' });
});

// Routes
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is running' });
});

// PDF routes
app.use('/api/pdf', pdfRoutes);

// Email routes
console.log('Mounting email routes at /api/email');
app.use('/api/email', emailRoutes);

// Error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 4000;

const server = app.listen(PORT, () => {
  console.log('\n🚀 Server is running!');
  console.log(`📡 Listening on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  console.log(`📧 Email API: http://localhost:${PORT}/api/email/send-email`);
  console.log(`📄 PDF API: http://localhost:${PORT}/api/pdf/extract-text`);
  console.log(`🖼️ Image API: http://localhost:${PORT}/api/image/extract-text\n`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Please try a different port or kill the process using this port.`);
    process.exit(1);
  } else {
    console.error('Error starting server:', err);
    process.exit(1);
  }
}); 