import axios from "axios";
import { toast } from "sonner";

const Key = import.meta.env.VITE_STATIC_API_KEY;

interface FileUploadResponse {
  fileUrl?: string;
}

type PostFileResult = FileUploadResponse | string;

export async function Post_File(file: File): Promise<PostFileResult> {
  try {
    console.log(file);
    console.log("working postFile 1");

    // Create a FormData object
    const formData = new FormData();
    formData.append("file", file); // Append the file to formData

    console.log(formData.values);

    // Send the file to the server
    const response = await axios.post(
      `http://localhost:3000/api/v1/pdfUpload/PerformORC`, // Update the URL to your upload route
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data', // Important for file upload
          'x-api-key': Key,
        },
      }
    );

    // If the server returns a file URL or any relevant data, return it
    if (response.data && response.data.fileUrl) {
      console.log("File uploaded successfully", response.data);
      return { fileUrl: response.data.fileUrl }; // Return an object containing the fileUrl
    } else {
      toast('File uploaded but no URL returned', {
        description: "The server didn't return the processed file URL.",
      });
      return "File uploaded but no URL returned"; // Return a string if no URL is returned
    }
  } catch (e) {
    console.log(e);
    toast('Something went wrong', {
      description: "API-Key is wrong or there was an error while sending payload",
    });
    return "something went wrong"; // Return an error string
  }
}