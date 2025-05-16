import dotenv from 'dotenv';
dotenv.config();

export const PORT = process.env.PORT || 5001;
export const MONGO_CONNECTION_STRING = process.env.MONGO_CONNECTION_STRING || 'mongodb+srv://susee:tTD4SizdvQP6Q1hN@vyapar-hackathon.w11hp1b.mongodb.net/?retryWrites=true&w=majority&appName=vyapar-hackathon';
