const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const { createWorker } = require('tesseract.js');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Ensure uploads directory exists
    const uploadDir = 'uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    console.log('Processing file:', file.originalname);
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Create a safe filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname);
    console.log('Generated filename:', filename);
    cb(null, filename);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    console.log('File type:', file.mimetype);
    // Allow PDF and image files
    if (file.mimetype === 'application/pdf' || 
        file.mimetype.startsWith('image/')) {
      console.log('File accepted:', file.originalname);
      cb(null, true);
    } else {
      console.log('File rejected:', file.originalname);
      cb(new Error('Only PDF and image files are allowed'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Route to handle multiple file uploads
router.post('/upload-multiple', upload.array('files', 10), async (req, res) => {
  try {
    console.log('Number of files received:', req.files.length);
    
    if (!req.files || req.files.length === 0) {
      console.log('No files uploaded');
      return res.status(400).json({ 
        success: false,
        error: 'Please upload at least one file' 
      });
    }

    const results = [];
    const worker = await createWorker();
    await worker.loadLanguage('eng');
    await worker.initialize('eng');

    for (const file of req.files) {
      console.log('Processing file:', file.originalname);
      try {
        let extractedText = '';
        let fileType = '';

        if (file.mimetype === 'application/pdf') {
          console.log('Processing PDF file:', file.originalname);
          const pdfBuffer = fs.readFileSync(file.path);
          const data = await pdfParse(pdfBuffer);
          extractedText = data.text;
          fileType = 'pdf';
        } else if (file.mimetype.startsWith('image/')) {
          console.log('Processing image file:', file.originalname);
          const { data } = await worker.recognize(file.path);
          extractedText = data.text;
          fileType = 'image';
        }

        // Clean up: Delete the file after processing
        fs.unlinkSync(file.path);

        results.push({
          filename: file.originalname,
          type: fileType,
          text: extractedText,
          size: file.size,
          mimetype: file.mimetype
        });

        console.log('Successfully processed:', file.originalname);
      } catch (error) {
        console.error('Error processing file:', file.originalname, error);
        // Clean up: Delete the file if it exists
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
        results.push({
          filename: file.originalname,
          error: error.message
        });
      }
    }

    await worker.terminate();

    res.json({
      success: true,
      message: 'Files processed successfully',
      results: results
    });

  } catch (error) {
    console.error('Error in multiple file upload:', error);
    res.status(500).json({
      success: false,
      error: 'Error processing files',
      details: error.message
    });
  }
});

// Route to extract text from PDF
router.post('/extract-text', upload.single('pdf'), async (req, res) => {
  try {
    console.log('PDF extraction request received');
    
    if (!req.file) {
      console.log('No PDF file uploaded');
      return res.status(400).json({ 
        success: false,
        error: 'Please upload a PDF file' 
      });
    }

    console.log('Processing PDF:', req.file.originalname);
    const pdfBuffer = fs.readFileSync(req.file.path);
    const data = await pdfParse(pdfBuffer);

    // Clean up: Delete the file after processing
    fs.unlinkSync(req.file.path);

    console.log('PDF processed successfully');
    res.json({
      success: true,
      text: data.text,
      pages: data.numpages,
      info: {
        title: data.info.Title,
        author: data.info.Author,
        creationDate: data.info.CreationDate,
      },
    });
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    // Clean up: Delete the file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({
      success: false,
      error: 'Error extracting text from PDF',
      details: error.message,
    });
  }
});

// Route to extract text from image
router.post('/extract-image-text', upload.single('image'), async (req, res) => {
  try {
    console.log('Image extraction request received');
    
    if (!req.file) {
      console.log('No image file uploaded');
      return res.status(400).json({ 
        success: false,
        error: 'Please upload an image file' 
      });
    }

    console.log('Processing image:', req.file.originalname);
    const worker = await createWorker();
    await worker.loadLanguage('eng');
    await worker.initialize('eng');

    const { data } = await worker.recognize(req.file.path);
    await worker.terminate();

    // Clean up: Delete the file after processing
    fs.unlinkSync(req.file.path);

    console.log('Image processed successfully');
    res.json({
      success: true,
      text: data.text,
      confidence: data.confidence,
      language: 'eng'
    });
  } catch (error) {
    console.error('Error extracting text from image:', error);
    // Clean up: Delete the file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({
      success: false,
      error: 'Error extracting text from image',
      details: error.message,
    });
  }
});

module.exports = router; 