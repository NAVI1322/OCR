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
async function extractAndValidateFormFields(pdfPath) {
    if (!fs.existsSync(pdfPath)) {
        console.error(`PDF file not found: ${pdfPath}`);
        return;
    }

    if (!process.env.OPEN_AI_KEY) {
        console.error('OpenAI API key is missing. Please configure your environment variables.');
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
    await saveFormFieldsToFile(formFieldsList, "beforeAnnotations.json");

    await processFormFieldsInBatchesWithLoading(formFieldsList, 15);

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
                const surroundingText = extractLeftRightWithFallback(rect, textContent.items, fieldName);

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

// Enhanced text extraction logic for surrounding text
function extractLeftRightWithFallback(rect, textItems, fieldName, wordLimit = 10, proximityThreshold = 80) {
    let leftText = '', rightText = '';
    const [x, y, w, h] = rect;

    textItems.sort((a, b) => a.transform[4] - b.transform[4]);

    const leftTextItems = textItems.filter(item => item.transform[4] < x && Math.abs(item.transform[5] - y) < proximityThreshold);
    const rightTextItems = textItems.filter(item => item.transform[4] > x + w && Math.abs(item.transform[5] - y) < proximityThreshold);

    leftText = leftTextItems.map(item => item.str).join(' ').trim().split(/\s+/).slice(-wordLimit).join(' ') || 'N/A';
    rightText = rightTextItems.map(item => item.str).join(' ').trim().split(/\s+/).slice(0, wordLimit).join(' ') || 'N/A';

    return `Left: ${leftText} ## ${fieldName} ## Right: ${rightText}`;
}

// Process form fields in batches and request tooltips from AI
async function processFormFieldsInBatchesWithLoading(formFieldsList, batchSize) {
    const totalBatches = Math.ceil(formFieldsList.length / batchSize);

    for (let i = 0; i < formFieldsList.length; i += batchSize) {
        const batch = formFieldsList.slice(i, i + batchSize);
        const batchNumber = Math.floor(i / batchSize) + 1;

        displayLoading(batchNumber, totalBatches);

        const aiResponse = await callOpenAiForTooltips(batch);

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
async function callOpenAiForTooltips(formFieldsBatch) {
    const openaiApiKey = process.env.OPEN_AI_KEY;
    if (!openaiApiKey) {
        console.error('OpenAI API key is missing.');
        return null;
    }

    const prompt = `Given the following list of form field annotations, provide concise tooltips for each annotation. Here are the annotations:`;
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

// Update the PDF with new tooltips
async function updatePdfWithTooltips(pdfPath, formFieldsList) {
    try {
        const pdfBytes = fs.readFileSync(pdfPath);
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const form = pdfDoc.getForm();

        formFieldsList.forEach(({ fieldName, tooltip }) => {
            const field = form.getField(fieldName);
            if (field) {
                field.setText(tooltip);
                console.log(`Updated tooltip for field: ${fieldName}`);
            }
        });

        const updatedPdfBytes = await pdfDoc.save();
        const updatedPath = pdfPath.replace('.pdf', '_updated.pdf');
        fs.writeFileSync(updatedPath, updatedPdfBytes);
        console.log(`Updated PDF saved at ${updatedPath}`);
    } catch (error) {
        console.error('Error updating PDF:', error.message);
    }
}

// Display progress bar for batch processing
function displayLoading(progress, total) {
    const percentage = Math.floor((progress / total) * 100);
    const bar = `[${'='.repeat(percentage / 5)}${' '.repeat(20 - percentage / 5)}]`;
    process.stdout.clearLine();
    process.stdout.cursorTo(0);
    process.stdout.write(`${bar} ${percentage}% Processed ${progress}/${total} batches`);
}

const pdfPath = 'pdf1.pdf'; // Replace with your actual PDF path
extractAndValidateFormFields(pdfPath).catch(console.error);