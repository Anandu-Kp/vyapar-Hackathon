import dotenv from 'dotenv';
dotenv.config();

export const PORT = process.env.PORT || 5001;
export const MONGO_CONNECTION_STRING = process.env.MONGO_CONNECTION_STRING || 'mongodb+srv://susee:tTD4SizdvQP6Q1hN@vyapar-hackathon.w11hp1b.mongodb.net/?retryWrites=true&w=majority&appName=vyapar-hackathon';
export const MODEL_API = process.env.MODEL_API || '';
export const MODEL_API_KEY = process.env.MODEL_API_KEY || '';
export const MODEL_NAME = process.env.MODEL_NAME || '';
export const MAX_TOKENS = process.env.MAX_TOKENS || 2048;