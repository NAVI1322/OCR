import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const prompt = `You are an AI system that will receive a PDF document as input. Your task is to extract specific information from the PDF and return it in a clear and structured format. Focus on extracting the following details: Name, Age, and any other key attributes specified in the input document. The output should be structured in such a way that it can be easily formatted into a new PDF.

Format for output:

	•	Name: [Extracted Name]
	•	Age: [Extracted Age]
	•	Any other relevant details that are found in the PDF.

Ensure the data is accurate, concise, and formatted to make it easy for further processing into a new PDF document.
if there is nothing like patients Name or age Just Sent Unvalid pdf data.
if there is any other language change it to english`


export async function Summarizer(req, res) {
  const openaiApiKey = process.env.OPEN_AI_KEY;


  const query = req.body.prompt;
  
  try {
    // Use the correct API endpoint for chat models
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o',  // Specify the model to use
        messages: [
          { role: 'system', content:prompt },
          { role: 'user', content: query }
        ],
        max_tokens: 1000,
        temperature: 0.7,
      },
      {
        headers: {
          Authorization: `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const result = response.data.choices[0].message.content.trim();
    
    return res.status(200).json({ message: result });
  } catch (error) {
    console.error('Error fetching response from OpenAI API:', error.message);
    return res.status(500).json({
      error: 'I am sorry, but I am unable to provide an answer at the moment.',
    });
  }
}