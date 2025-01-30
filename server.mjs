import express from 'express';
import * as db from './database.js';  
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;  

app.use(express.json());
app.use(express.static(path.join(__dirname, 'src')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'index.html'));
});

app.post('/addEvent', async (req, res) => {
    try {
        const { title, description, location, date, start, end } = req.body;
        console.log("Event received:", { title, description, location, date, start, end });

        const start_time = `${date}T${start}:00`;
        const end_time = `${date}T${end}:00`;

        await db.addEvent( title, description, location, start_time, end_time );  
        
        res.status(200).json( { title, description, location, date, start, end } );
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

app.get('/events', async (req, res) => {
    res.status(200).json(await db.getAllEvents());
}); 

app.listen(PORT, (error) => {
    if (!error) {
        console.log(`Server is running at: http://localhost:${PORT}`);
    } else {
        console.log("Error occurred, server can't start", error);
    }
});
