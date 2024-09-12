import axios from "axios";


export async function AIApiCall(data:string)
{

try{
   
        const res = await axios.post(`https://neatpdf.onrender.com/api/v1/pdfSum/Summarizer`,{
            prompt:data,
        })

        
        return res.data;
        
    }
    catch(e)
    {
        console.log(e);
        alert("something went wrong while sending data to AI modal")
        return "something went wrong"
    }
 
       
}