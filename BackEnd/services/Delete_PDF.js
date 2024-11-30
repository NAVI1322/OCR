import fs from 'fs';
import path from 'path';

// File deletion function
export function Delete_file(inputPDF, OgName) {
    // Deleting the file from the file system
    const filePath = path.join(__dirname, '../uploads', OgName);
    fs.unlink(filePath, (err) => {
        if (err) {
            console.error(`Error deleting file ${filePath}:`, err);
        } else {
            console.log(`File ${filePath} deleted successfully.`);
        }
    });
}