import axios from "axios";
import { toast } from "sonner";


const Key = import.meta.env.VITE_STATIC_API_KEY;


export async function AIApiCall(data:string)
{

try{
   
    const res = await axios.post(
        `https://neatpdf.onrender.com/api/v1/pdfSum/Summarizer`, // http instead of https
        {
          prompt: data,
        },
        {
          headers: {
            'x-api-key': Key, // Ensure Key is correctly set
          },
        }
      );
      
      return res.data;
        
    }
    catch(e)
    {
        console.log(e);
        toast('Something went wrong ',{
            description: "API-Key is Wrong or Error While Sending Payload",
          })
        return "something went wrong"
    }
 
       
}