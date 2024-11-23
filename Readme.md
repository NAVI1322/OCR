# PDF Form Field Processor with OCR and AI Integration

## Overview
This project implements a comprehensive system to extract form fields from PDF documents, enhance them with AI-driven tooltips, and update the PDFs accordingly. It leverages technologies such as PDF.js, PDF-Lib, and OpenAI's GPT models.

## Features
- **PDF Field Extraction**: Extracts form fields from PDF documents using PDF.js.
- **AI-Enhanced Tooltips**: Integrates with OpenAI to generate concise tooltips based on the form field context.
- **PDF Updating**: Applies the new tooltips back into the PDF document using PDF-Lib.

## Installation
Clone the repository and install the dependencies:
```bash
git clone https://github.com/yourusername/pdf-field-processor.git
cd pdf-field-processor
npm install



Usage

Set up your OpenAI API key in your environment:


export OPEN_AI_KEY='Your-OpenAI-API-Key'

Run the script by specifying the path to your PDF:

 
node ocr.js



Contributions are welcome! Feel free to open an issue or submit a pull request.