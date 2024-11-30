import { Router } from "express";
import {  PostFile} from "../controller/multerFIle.js";
import { apiKeyMiddleware } from "../middleware/Middleware.js";



const router = new Router();

router.post('/PerformORC',apiKeyMiddleware,PostFile);




export default router;
