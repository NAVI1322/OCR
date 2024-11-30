import express from 'express';
import cors from 'cors';
import PerformOCR from './routes/PerformOCR.js';
import multer from 'multer';
import { fileURLToPath } from 'url';  // Import the fileURLToPath function
import path from 'path';  // Import the 'path' module
import { scheduleFileDeletion, clearScheduledDeletions, deletionMap } from './services/file_deletion.js'

const Port = 3000;
const app = express();

// Use fileURLToPath to get the __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename); // Get the directory name

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads'); // Specify the uploads directory
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname); // Retain the original file name
  }
});

export const uploadFile = multer({ storage: storage }).single('file'); // Use 'file' for the field name in frontend

app.use(cors());
app.use(express.json());
app.use('/api/v1/pdfUpload', PerformOCR);
console.log(path.join(__dirname, 'uploads')); // Check if this points to the correct uploads folder
app.use('/uploads', express.static(path.join(__dirname, '/uploads')));


// Visually show the data for deletion
// API endpoint to get the scheduled deletions
app.get('/scheduled-deletions', (req, res) => {
    const deletionData = [];
    
    deletionMap.forEach((deletionTime, fileName) => {
        // Convert the deletionTime to a readable string format
        const formattedDeletionTime = new Date(deletionTime).toLocaleString();
        
        deletionData.push({
            fileName,
            deletionTime: `(${formattedDeletionTime})` // Add brackets around the formatted date
        });
    });

    res.json(deletionData);  // Send back the scheduled deletions in JSON format
});

// Sample route to schedule file deletions (for testing)
app.post('/schedule-deletion', (req, res) => {
    const filePath = path.join(__dirname, 'uploads', 'sample.pdf'); // Example file path
    const fileName = 'sample.pdf';  // Example file name
    const delay = 5000; // Delay of 5 seconds (for testing)

    scheduleFileDeletion(filePath, fileName, delay);
    res.send('File deletion scheduled');
});

// Route to clear scheduled deletions manually (optional)
app.post('/clear-deletions', (req, res) => {
    clearScheduledDeletions();  // Call the function to clear the deletions
    res.send('Scheduled deletions cleared.');
});

app.listen(Port, () => {
  console.log(`Server running at http://localhost:${Port}`);
});