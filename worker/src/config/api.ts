import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

export const apiClient = axios.create({
  baseURL: process.env.API_URL || 'http://localhost:3001',
  timeout: 10000,
});

