import express from "express";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import dotenv from "dotenv"
import cors from "cors"
import path from "path"
import { fileURLToPath } from 'url';

dotenv.config();

import authRouter from './routes/auth.router.js';
import userRouter from './routes/user.router.js';
import { verifyJWT } from "./middleware/verifyJWT.js";
import mongoose from "mongoose";


const app = express();
const PORT= process.env.PORT;

// app.use(cors({
//   origin: process.env.ORIGIN || 'http://localhost:3000',
//   credentials: true
// }));

app.use(express.json());
app.use(bodyParser.json({ limit: "5kb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "10kb" }));
app.use(cookieParser());

// build path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const buildPath = path.join(__dirname, '../public/build');
app.use(express.static(buildPath));

app.use('/auth', authRouter); 
app.use('/user',verifyJWT,userRouter);


mongoose.connect(process.env.DB_URI).then(() => {
  app.listen(PORT);
}).catch(err => {
  console.error('Database connection failed:', err);
});
