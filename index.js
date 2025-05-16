import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import { PORT } from './src/config/env-configs.js';
import { connectDB } from './src/config/mongo-config.js';
const app = express();
import http from 'http';
const server = http.Server(app);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
connectDB();
console.log(process.env);


// app.use("/", portalRoutes)
app.set('port', PORT);

server.listen(app.get('port'), () => {
    console.log(`server started successfully on port ${PORT}...`);
})