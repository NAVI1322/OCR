import express from 'express'
import cors from 'cors'
import SummarizerRoute from './routes/SummarizerRoute.js';


const Port = 3000;
const app = express();


app.use(cors());
app.use(express.json());

app.use('/api/v1/pdfSum',SummarizerRoute);

app.listen(Port,()=>{
    console.log(`server running at ${Port}`);
})