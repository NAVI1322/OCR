import { Router } from "express";
import { Summarizer } from "../controller/AISummarizer.js";
import { apiKeyMiddleware } from "../controller/Middleware.js";


const router = new Router();

router.post('/Summarizer',apiKeyMiddleware,Summarizer);

export default router;
