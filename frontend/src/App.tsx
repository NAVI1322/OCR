import React, { useState, useEffect } from 'react';
import { useDropzone, FileRejection } from 'react-dropzone';
import { Post_File } from './hooks/Post_File';
import logo from './components/logo/logo.webp';
import { Button } from './components/ui/button';
import { toast } from 'sonner';
import { getCurrentDate } from './hooks/CurrentDate';
import { LoadingAnimation } from './components/ui/loadingAnimation';

const FileUpload: React.FC = () => {
  const [latestPdf, setLatestPdf] = useState<File | null>(null); // State to hold the latest PDF file
  const [fileUrl, setFileUrl] = useState<string | null>(null); // State to store the file URL after upload
  const [loading, SetLoading] = useState(false);
  const [timer, setTimer] = useState<number>(10); // State for the countdown timer
  const [showDownload, setShowDownload] = useState<boolean>(false); // State to control download visibility
  const maxFileSize = 4 * 1024 * 1024; // 4MB

  // Dropzone setup for file selection
  const { getRootProps, getInputProps, fileRejections } = useDropzone({
    accept: { 'application/pdf': ['.pdf'] },
    maxSize: maxFileSize,
    onDrop: (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        setLatestPdf(acceptedFiles[0]); // Update state with the latest PDF
        toast('File Uploaded Successfully', {
          description: getCurrentDate(),
        });
      }
    },
    onDropRejected: (rejectedFiles: FileRejection[]) => {
      rejectedFiles.forEach((file) => {
        const errorMessage =
          file.errors[0].code === 'file-too-large'
            ? 'File size must be less than 4MB.'
            : 'Only PDF files are allowed.';
        toast(errorMessage, {
          description: getCurrentDate(),
        });
      });
    },
  });

  // Handle file upload
  const handleFileUpload = async (): Promise<void> => {
    SetLoading(true);
    if (!latestPdf) {
      toast('No file uploaded', {
        description: getCurrentDate(),
      });
      SetLoading(false);
      return;
    }
  
    try {
      // Send the selected PDF file to the server
      console.log('Uploading PDF...');
      const result = await Post_File(latestPdf);
  
      // Type guard to check if result is a string (error message)
      if (typeof result === 'string') {
        // Handle error message
        toast(result, {
          description: getCurrentDate(),
        });
      } else {
        // At this point, result must be a FileUploadResponse
        if (result.fileUrl) {
          // Handle successful file upload and display file URL
          toast('File uploaded successfully', {
            description: result.fileUrl,
          });
          // Set the file URL and open it in a new tab
          setFileUrl(result.fileUrl);
          window.open(result.fileUrl, '_blank'); // Open the file in a new tab

          // Show the download link and start the timer
          setShowDownload(true);
          setTimer(10);
        } else {
          toast('File uploaded but no URL returned', {
            description: getCurrentDate(),
          });
        }
      }
  
      SetLoading(false);
    } catch (error) {
      toast('Failed to upload or process file', {
        description: getCurrentDate(),
      });
      console.log('Failed to upload or process file', error);
      SetLoading(false);
    }
  };

  // Countdown Timer for 10 seconds
  useEffect(() => {
    let countdown: NodeJS.Timeout;
    if (showDownload && timer > 0) {
      countdown = setInterval(() => {
        setTimer((prevTimer) => prevTimer - 1);
      }, 1000);
    } else if (timer === 0) {
      setShowDownload(false); // Hide download link after 10 seconds
    }

    return () => clearInterval(countdown); // Clean up the interval on component unmount or when timer reaches 0
  }, [showDownload, timer]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
        <div className="flex justify-center p-2">
          <img
            src={logo}
            alt="Logo"
            className="w-32 h-22 rounded-lg p-2"
          />
        </div>
        <h2 className="text-2xl mb-4 text-gray-800 text-center font-thin p-2">
          Upload Your PDF File
        </h2>
        <div
          {...getRootProps({ className: 'dropzone' })}
          className="border-2 border-dashed border-gray-600 p-6 rounded-lg text-center cursor-pointer hover:bg-slate-100 transition"
        >
          <input {...getInputProps()} style={{ display: 'none' }} /> {/* Hide file input */}
          {latestPdf ? (
            <p className="text-gray-500 md:max-w-lg max-w-md">
              Selected File: {latestPdf.name}
            </p>
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
        <div className="flex justify-center p-2 mt-2">
          {loading === false ? (
            <Button variant={'default'} className="text-lg w-full" onClick={handleFileUpload}>
              Upload
            </Button>
          ) : (
            <LoadingAnimation />
          )}
        </div>

        {/* Dynamic download link after file is uploaded */}
        {showDownload && fileUrl && (
          <div className="mt-4 text-center">
            <Button>
              <a href={fileUrl} download target='_blank'>
                Download Processed PDF
              </a>
            </Button>
            <p className="text-sm mt-2">{timer} seconds remaining</p> {/* Display timer */}
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUpload;