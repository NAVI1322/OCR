import { Router } from "express";
import { Summarizer } from "../controller/AISummarizer.js";


const router = new Router();

router.post('/Summarizer', Summarizer);

export default router;
