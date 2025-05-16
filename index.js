import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import { PORT } from './src/config/env-configs.js';
import { connectDB } from './src/config/mongo-config.js';
const app = express();
import http from 'http';
import clientPages from './src/client-pages/controller.js';
const server = http.Server(app);
import ApiRoutes from './src/routes.js';
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
connectDB();

// init routes
app.use('/', clientPages);

app.use('/api', ApiRoutes)
  
app.set('port', PORT);

server.listen(app.get('port'), () => {
    console.log(`server started successfully on port ${PORT}...`);
})