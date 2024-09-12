import { PDFDocument, PDFFont, rgb, StandardFonts } from 'pdf-lib';
import pkg from 'file-saver';
const { saveAs } = pkg;

// Function to generate and download the PDF
export async function generatePdf(aiResponse: string) {
  const pdfDoc = await PDFDocument.create();

  // Embed both regular and bold fonts
  const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const timesRomanBoldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

  // Create a new page
  const page = pdfDoc.addPage([600, 800]); // Increase page size to fit more content
  const { height } = page.getSize();
  const fontSize = 12;
  let currentY = height - 50;

  // Add Bold Title to PDF
  page.drawText('Extracted Information:', {
    x: 50,
    y: currentY,
    size: 18,
    font: timesRomanBoldFont,  // Bold font for title
    color: rgb(0, 0, 0),
  });

  currentY -= 40;

  // Function to wrap text within the page
  const wrapText = (text: string, font: PDFFont, fontSize: number, maxWidth: number) => {
    const words = text.split(' ');
    let lines = [];
    let currentLine = '';

    words.forEach((word) => {
      const lineTest = currentLine + word + ' ';
      const width = font.widthOfTextAtSize(lineTest, fontSize);
      if (width > maxWidth) {
        lines.push(currentLine.trim());
        currentLine = word + ' ';
      } else {
        currentLine = lineTest;
      }
    });

    lines.push(currentLine.trim());
    return lines;
  };

  // Remove unsupported characters (e.g., tab) from AI response
  const sanitizedResponse = aiResponse.replace(/\t/g, '    '); // Replace tabs with 4 spaces
  const lines = sanitizedResponse.split('\n');
  
  // Add AI response text to PDF
  lines.forEach((line) => {
    // Split long lines into multiple lines that fit the page width
    const wrappedLines = wrapText(line.trim(), timesRomanFont, fontSize, 500);

    wrappedLines.forEach((wrappedLine) => {
      if (currentY <= 50) {
        // Add a new page if content exceeds the current page
        const newPage = pdfDoc.addPage([600, 800]);
        currentY = newPage.getSize().height - 50;
      }

      // Draw text in normal font (change font for specific lines if needed)
      page.drawText(wrappedLine, {
        x: 50,
        y: currentY,
        size: fontSize,
        font: timesRomanFont,
        color: rgb(0, 0, 0),
      });

      currentY -= 20; // Move down for the next line
    });
  });

  // Serialize the PDFDocument to bytes (a Uint8Array)
  const pdfBytes = await pdfDoc.save();

  // Save the PDF using file-saver
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  saveAs(blob, 'ai-response.pdf');
}