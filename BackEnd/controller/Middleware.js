import dotenv from 'dotenv';
dotenv.config();

export const apiKeyMiddleware = (req, res, next) => {
    const userApiKey = req.headers['x-api-key']; // Check the request header for 'x-api-key'
    
    if (userApiKey && userApiKey === process.env.STATIC_API_KEY) {
      next(); 
    } else {
      res.status(403).json({ error: 'Forbidden: Invalid API key' }); // Invalid key, reject request
    }
  };
  