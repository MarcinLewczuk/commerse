import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../private/.env') });

import express, { Request, Response } from 'express';
import cors from 'cors';
import mysql from 'mysql2';
import bodyParser from 'body-parser';
import { selectAll } from './queries'; // Adjust path if needed

const server = express();
server.use(bodyParser.json());
server.use(cors());

// Database connection
const db = mysql.createConnection({
  host: process.env['DB_HOST'],
  port: Number(process.env['DB_PORT']),
  user: process.env['DB_USER'],
  password: process.env['DB_PASS'],
  database: process.env['DB_NAME']
});

// For use in queries.ts
export { db };

// Test DB connection
db.connect((error: mysql.QueryError | null) => {
  if (error) {
    console.error('Error connecting to database:', error);
  } else {
    console.log('Connected to database.');
  }
});

// Test server connection
server.listen(process.env['PORT'], (error?: Error) => {
  if (error) {
    console.error('Error starting server:', error);
  } else {
    console.log(`Server is running on port ${process.env['PORT']}`);
  }
});

// --- Routes ---
// Users
server.get('/users', (req: Request, res: Response) => {
  selectAll('users')(req, res);
});

// Products
server.get('/products', (req: Request, res: Response) => {
  selectAll('products')(req, res);
});