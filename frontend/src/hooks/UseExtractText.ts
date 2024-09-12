import pdfToText from 'react-pdftotext'

export function UseExtractText(file:any) {
    pdfToText(file)
        .then((text:string) => 
        {
        return text;
        })
        .catch((error: any) => console.error("Failed to extract text from pdf" + error))
}
