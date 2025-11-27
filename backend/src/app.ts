import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../private/.env') });

import express, { Request, Response } from 'express';
import cors from 'cors';
import mysql from 'mysql2';
import bodyParser from 'body-parser';
import { insert, selectAll, selectColumn, loginUser, selectById } from './queries'; // Adjust path if needed

// Simple in-memory slug formatter (duplicate logic kept server-side for single fetch by slug)
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .trim();
}
import { hashPassword, sanitizeUser } from './security/password';

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

server.get('/users/email', (req: Request, res: Response) => {
  selectColumn('users', 'email')(req, res);
});

server.post('/users', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password required' });
    }
    const username = email.split('@')[0];
    const hashed = await hashPassword(password);

    // Rebuild request body with hashed password
    req.body = { email, password: hashed, username };
    insert('users', ['email', 'password', 'username'])(req, {
      status: (code: number) => ({
        json: (payload: any) => res.status(code).json(sanitizeUser(payload))
      })
    } as Response); // Wrap to intercept response and sanitize
  } catch (e) {
    console.error('User creation failed:', e);
    res.status(500).json({ error: 'internal error' });
  }
});

// Products
server.get('/products', (req: Request, res: Response) => {
  selectAll('products')(req, res);
});

// Deprecated id route retained temporarily (could remove later)
server.get('/products/:id', (req: Request, res: Response) => {
  selectById('products')(req, res);
});

// Slug route: match product by slugified name
server.get('/products/slug/:slug', (req: Request, res: Response) => {
  const { slug } = req.params;
  db.query('SELECT * FROM products', (error: mysql.QueryError | null, results: any[]) => {
    if (error) {
      console.error('Products slug fetch failed:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
    const match = results.find((p: any) => slugify(p.name || '') === slug);
    if (!match) {
      return res.status(404).json({ error: 'product not found' });
    }
    return res.json(match);
  });
});

// Login route (credential check via email + password). Returns 200 with user info or 401 invalid credentials.
server.post('/users/login', loginUser('users'));


