import { uploadFile } from "../index.js";
import { extractAndValidateFormFields } from "../services/OCRService.js";
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { scheduleFileDeletion } from "../services/file_deletion.js";

// Use fileURLToPath to get the __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function PostFile(req, res) {
    console.log("Server OCR working");

    uploadFile(req, res, async (err) => {
        if (err) {
            console.error("Upload error:", err);
            return res.status(500).json({ message: "Error uploading file." });
        }

        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded." });
        }

        const OgName = req.file.originalname;
        const inputPDF = path.join(__dirname, '../uploads', OgName);

        console.log(`Received file: ${OgName}`);

        try {
            console.log("Starting OCR processing...");
            await extractAndValidateFormFields(inputPDF);

            console.log("OCR processing completed.");

            const updatedPDFPath = inputPDF.replace('.pdf', '_updated.pdf');
            if (fs.existsSync(updatedPDFPath)) {
                const fileUrl = `http://localhost:3000/uploads/${encodeURIComponent(OgName.replace('.pdf', '_updated.pdf'))}`;
                res.status(200).json({
                    message: "File processed successfully",
                    fileUrl: fileUrl,
                });

                // Schedule deletion for the uploaded file (after 1 minute for testing) and the updated file (after 1 hour)
                scheduleFileDeletion(inputPDF, OgName, 20000); // 1 minute delay for testing
                scheduleFileDeletion(updatedPDFPath, OgName.replace('.pdf', '_updated.pdf'), 60000); // 1 hour delay
            } else {
                return res.status(500).json({ message: "Updated file not found." });
            }
        } catch (error) {
            console.error("Error during processing:", error);
            // In case of error, delete the uploaded file
            scheduleFileDeletion(inputPDF, OgName, 60000); // Clean up uploaded file
            return res.status(500).json({ message: "Error processing file." });
        }
    });
}