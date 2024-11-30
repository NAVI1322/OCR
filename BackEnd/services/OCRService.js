import fs from 'fs';
import { PDFDocument } from 'pdf-lib';
import pkg from 'pdfjs-dist/legacy/build/pdf.js';
import { fileURLToPath } from 'url';
import path from 'path';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const { getDocument, GlobalWorkerOptions } = pkg;
GlobalWorkerOptions.workerSrc = 'pdfjs-dist/legacy/build/pdf.worker.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Main function to extract and process form fields
export async function  extractAndValidateFormFields(pdfPath) {
    console.log("Starting PDF form field extraction...");

    if (!fs.existsSync(pdfPath)) {
        console.error(`PDF file not found: ${pdfPath}`);
        return;
    }

    let pdfDocument;
    try {
        const loadingTask = getDocument(pdfPath);
        pdfDocument = await loadingTask.promise;
    } catch (error) {
        console.error('Error loading PDF document:', error.message);
        return;
    }

    const formFieldsList = await extractFormFields(pdfDocument);

    // Save the initial annotations before processing
    await saveFormFieldsToFile(formFieldsList, "annotationsBeforeProcessing.json");

    // Process annotations in batches and update tooltips
    await processFormFieldsInBatchesWithLoading(pdfDocument, formFieldsList, 15);

    // Save the updated annotations after processing
    await saveFormFieldsToFile(formFieldsList, "annotationsAfterProcessing.json");

    // Update the PDF with the new tooltips
    await updatePdfWithTooltips(pdfPath, formFieldsList);

    console.log("PDF processing completed successfully.");
}
// Extract form fields from the PDF
async function extractFormFields(pdfDocument) {
    const formFieldsList = [];

    for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
        const page = await pdfDocument.getPage(pageNum);
        const annotations = await page.getAnnotations();
        const textContent = await page.getTextContent();

        for (const annotation of annotations) {
            if (annotation.subtype === 'Widget') {
                const fieldType = annotation.fieldType || 'Unknown';
                const fieldName = annotation.fieldName ? annotation.fieldName.trim() : '';
                const rect = annotation.rect || [];
                const surroundingText = rect.length === 4
                    ? extractLeftRightWithFallback(rect, textContent.items, fieldName)
                    : '';

                formFieldsList.push({
                    id: annotation.id,
                    fieldType,
                    fieldName,
                    value: annotation.fieldValue || '',
                    rect,
                    page: pageNum,
                    surroundingText,
                    tooltip: '' // Placeholder for tooltip
                });

                console.log(`Extracted Field: ${fieldName} on Page ${pageNum}`);
            }
        }
    }

    return formFieldsList;
}

// Save form fields to a JSON file
function saveFormFieldsToFile(fields, filename) {
    const outputDir = `${__dirname}/output`;
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir);
    }

    const filePath = `${outputDir}/${filename}`;
    fs.writeFileSync(filePath, JSON.stringify(fields, null, 2));
    console.log(`Form fields saved to ${filePath}`);
}

// Extract text surrounding a field for context
function extractLeftRightWithFallback(rect, textItems, fieldName, wordLimit = 10, proximityThreshold = 80) {
    let leftText = '', rightText = '';
    const [x, y, w, h] = rect;

    // Sort text items based on horizontal position
    textItems.sort((a, b) => a.transform[4] - b.transform[4]);

    // Find immediate left and right text items
    let leftTextItems = textItems.filter(item => item.transform[4] < x && Math.abs(item.transform[5] - y) < proximityThreshold);
    let rightTextItems = textItems.filter(item => item.transform[4] > x + w && Math.abs(item.transform[5] - y) < proximityThreshold);

    // If no left text found, look in the previous line
    if (leftTextItems.length === 0) {
        const previousLineItems = textItems.filter(item => item.transform[5] < y - h);
        leftTextItems = previousLineItems.filter(item => Math.abs(item.transform[4] - x) < proximityThreshold * 2);
    }

    // If no right text found, look in the next line
    if (rightTextItems.length === 0) {
        const nextLineItems = textItems.filter(item => item.transform[5] > y + h);
        rightTextItems = nextLineItems.filter(item => Math.abs(item.transform[4] - (x + w)) < proximityThreshold * 2);
    }

    // Concatenate and format the extracted left and right text
    leftText = leftTextItems.slice(-wordLimit).map(item => item.str).join(' ').trim() || 'N/A';
    rightText = rightTextItems.slice(0, wordLimit).map(item => item.str).join(' ').trim() || 'N/A';

    return `Left: ${leftText} ## fieldName:${fieldName} ## Right: ${rightText}`;
}

// Process form fields in batches
async function processFormFieldsInBatchesWithLoading(pdfDocument, formFieldsList, batchSize) {
    const totalBatches = Math.ceil(formFieldsList.length / batchSize);

    for (let i = 0; i < formFieldsList.length; i += batchSize) {
        const batch = formFieldsList.slice(i, i + batchSize);
        const batchNumber = Math.floor(i / batchSize) + 1;

        displayLoading(batchNumber, totalBatches);

        // Use the correct OpenAI function
        const aiResponse = await callOpenAiForTooltipsWithPDFText(pdfDocument, batch);

        if (aiResponse && Array.isArray(aiResponse)) {
            batch.forEach((formField, j) => {
                const aiField = aiResponse.find(ai => ai.id === formField.id);
                if (aiField && aiField.tooltip) {
                    formField.tooltip = aiField.tooltip;
                    console.log(`Updated tooltip for field ID: ${formField.id}`);
                }
            });
        }
    }

    console.log('\nAll batches processed.');
}

// Call OpenAI API for tooltips
// Extract all text from the PDF
async function extractFullTextFromPDF(pdfDocument) {
    let fullText = '';
    for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
        const page = await pdfDocument.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + ' ';  // Append space for separation between pages
    }
    return fullText;
}

// Function to call OpenAI with text from PDF included
async function callOpenAiForTooltipsWithPDFText(pdfDocument, formFieldsBatch) {
    const openaiApiKey = process.env.OPEN_AI_KEY;
    if (!openaiApiKey) {
        console.error('OpenAI API key is missing.');
        return null;
    }

    // Extract text from PDF
    const pdfText = await extractFullTextFromPDF(pdfDocument);

    // Formulate the prompt with PDF text included
    const prompt = `Here is the text from the PDF document: ${pdfText} Given the following list of form field annotations, use the left and right text to create appropriate tooltips. Return the form field ID along with the tooltip. Here are the annotations:`;
    const batchStr = JSON.stringify(formFieldsBatch, null, 2);

    try {
        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: 'gpt-4',
                messages: [
                    { role: 'system', content: prompt },
                    { role: 'user', content: batchStr }
                ],
                max_tokens: 1000,
                temperature: 0.3,
            },
            {
                headers: {
                    Authorization: `Bearer ${openaiApiKey}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        return JSON.parse(response.data.choices[0].message.content.trim());
    } catch (error) {
        console.error('Error fetching response from OpenAI:', error.message);
        return null;
    }
}




async function updatePdfWithTooltips(pdfPath, formFieldsList) {
    const pdfBytes = fs.readFileSync(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();

    formFieldsList.forEach(({ fieldName, tooltip }) => {
        try {
            const field = form.getField(fieldName);
            if (field) {
                field.setText(tooltip);
                console.log(`Updated tooltip for field: ${fieldName}`);
            }
        } catch (error) {
            console.error(`Error updating field '${fieldName}': ${error.message}`);
        }
    });
    const updatedPdfBytes = await pdfDoc.save();
    fs.writeFileSync(pdfPath.replace('.pdf', '_updated.pdf'), updatedPdfBytes); // Save updated PDF
}


// Display progress bar for batch processing
function displayLoading(progress, total) {
    const percentage = Math.floor((progress / total) * 100);
    const bar = `[${'='.repeat(percentage / 5)}${' '.repeat(20 - percentage / 5)}]`;
    process.stdout.clearLine();
    process.stdout.cursorTo(0);
    process.stdout.write(`${bar} ${percentage}% Processed ${progress}/${total} batches`);
}

// Entry point
// const pdfPath = 'pdf1.pdf'; // Replace with your PDF path
// extractAndValidateFormFields(pdfPath).catch(console.error);