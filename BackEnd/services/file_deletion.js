// services/fileDeletion.js
import fs from 'fs';
import path from 'path';

// Store the file names and their scheduled deletion times
export const deletionMap = new Map(); // Export the map so it can be accessed elsewhere

// Function to schedule a file deletion
export function scheduleFileDeletion(filePath, fileName, delay) {

    const deletionTime = Date.now() + delay;
    deletionMap.set(fileName, deletionTime);

    console.log(`Scheduled file ${fileName} for deletion at ${new Date(deletionTime)}`);

    // Set timeout for file deletion
    setTimeout(() => {
        deleteFile(filePath, fileName);
    }, delay);
}

// Function to delete the file
function deleteFile(filePath, fileName) {
    const fileExists = fs.existsSync(filePath);
    if (fileExists) {
        fs.unlinkSync(filePath);  // Delete the file
        console.log(`File ${fileName} deleted.`);
    } else {
        console.log(`File ${fileName} not found, unable to delete.`);
    }

    // Remove from the deletionMap after file is deleted
    deletionMap.delete(fileName);
}

// Function to clear the scheduled deletions (optional for manual cleanup)
export function clearScheduledDeletions() {
    const now = Date.now();
    deletionMap.forEach((deletionTime, fileName) => {
        if (now >= deletionTime) {
            const filePath = path.join(__dirname, '../uploads', fileName);
            deleteFile(filePath, fileName);  // Delete file if scheduled time has passed
        }
    });
}