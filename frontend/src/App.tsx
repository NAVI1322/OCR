import React, { useState } from 'react';
import { useDropzone, FileRejection } from 'react-dropzone';
import pdfToText from 'react-pdftotext';
import { AIApiCall } from './hooks/AI_apiCall';
import { generatePdf } from './hooks/CreatePdf';
import { Button } from './components/ui/button';
import { toast} from 'sonner';
import { getCurrentDate } from './hooks/CurrentDate';
import { LoadingAnimation } from './components/ui/loadingAnimation';

const FileUpload: React.FC = () => {
  const [_, setFiles] = useState<File[]>([]);
  const [text, setText] = useState<string>('');
  const [upload,Setupload]=useState(false);
  const maxFileSize = 4 * 1024 * 1024; // 4MB
  

  // if the pdf is accepted 
  const { getRootProps, getInputProps, acceptedFiles, fileRejections } = useDropzone({
    accept: { 'application/pdf': ['.pdf'] }, // Specify MIME type for PDF files
    maxSize: maxFileSize,
    onDrop: (acceptedFiles: File[]) => {
      setFiles(acceptedFiles);
      if (acceptedFiles.length > 0) {
        // sonner
        toast("File Uploaded Successfully",{
          description: getCurrentDate(),
          action:{
            label:"Undo",
            onClick:()=> console.log("Undo")
          }
        })
        extractText(acceptedFiles[0]);
      }
    },
    // if it is rejected
    onDropRejected: (rejectedFiles: FileRejection[]) => {
      rejectedFiles.forEach((file) => {
        if (file.errors[0].code === 'file-too-large') {
          toast('File size must be less than 4MB.',{
            description: getCurrentDate(),
          })
         
        } else if (file.errors[0].code === 'file-invalid-type') {
          
          toast('Only PDF files are allowed.',{
            description: getCurrentDate(),
          })
        }
      });
    },
  });

  const extractText = (file: File): void => {
    pdfToText(file)
      .then((text: string) => {
        setText(text);
        console.log(text);
      })
      .catch((error: any) => {
        console.error('Failed to extract text from pdf', error);
      });
  };

  const handleFileUpload = async (): Promise<void> => {
    Setupload(true);
    if (!text) {
      toast('No Data in the PDF',{
        description: getCurrentDate(),
      })
    Setupload(false);
      return;
    }
    
    try {
      const result = await AIApiCall(text);
      const summaryData = result.message;
      console.log(result.message + ' in app.js');

      Setupload(false);
      generatePdf(summaryData);
    } catch (error) {
      toast('Failed to upload or process file',{
        description: getCurrentDate(),
      })
      console.log('Failed to upload or process file', error);
      Setupload(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
        <h2 className="text-2xl mb-4 text-gray-800 text-center font-thin">
          Upload Your PDF File
        </h2>
        <div
          {...getRootProps({ className: 'dropzone' })}
          className="border-2 border-dashed border-gray-600 p-6 rounded-lg text-center cursor-pointer hover:bg-slate-100 transition"
        >
          <input
            {...getInputProps()}
            style={{ display: 'none' }} // Hide the file input
          />
          {acceptedFiles.length > 0 ? (
            <p className="text-gray-500 md:max-w-lg max-w-md">Selected File: {acceptedFiles[0].name}</p>
          ) : (
            <p className="text-gray-500">Drag & drop a PDF file here, or click to select one</p>
          )}
        </div>
        {fileRejections.length > 0 && (
          <p className="mt-4 text-red-500 text-sm">
            {fileRejections.map(({ file, errors }) => (
              <span key={file.name}>
                {errors.map((e) => (
                  <span key={e.code}>{e.message}</span>
                ))}
              </span>
            ))}
          </p>
        )}
        <div className='flex justify-center p-2 mt-2'>
        {upload ===false ?<Button variant={"default"} className='text-lg w-full' onClick={handleFileUpload}>Upload</Button>
        :<LoadingAnimation />} 
        </div>
      
      </div>
    </div>
  );
};

export default FileUpload;