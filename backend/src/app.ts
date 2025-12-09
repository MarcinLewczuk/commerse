import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../private/.env') });

import express, { Request, Response } from 'express';
import cors from 'cors';
import mysql from 'mysql2';
import bodyParser from 'body-parser';
import { insert, selectAll, selectColumn, loginUser, selectById, getShopByAuth0UserId, getUserByAuth0Id, upsertUserByAuth0Id, createShop } from './queries'; // Adjust path if needed

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
// Serve static product images from root public/images folder
server.use('/images', express.static(path.resolve(__dirname, '../../public/images')));

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

// Get shop by Auth0 user ID
server.get('/shops/by-user/:auth0Id', (req: Request, res: Response) => {
  getShopByAuth0UserId('users')(req, res);
});

// Get user info by Auth0 ID
server.get('/users/by-auth0/:auth0Id', (req: Request, res: Response) => {
  getUserByAuth0Id('users')(req, res);
});

server.get('/users/email', (req: Request, res: Response) => {
  selectColumn('users', 'email')(req, res);
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

// Get products by shop ID
server.get('/shops/:shopId/products', (req: Request, res: Response) => {
  const { shopId } = req.params;
  if (!shopId) {
    return res.status(400).json({ error: 'shopId required' });
  }
  db.query(
    'SELECT id, shop_id, name, description, price, image_url, stock_quantity, sku FROM products WHERE shop_id = ? ORDER BY created_at DESC',
    [shopId],
    (error: mysql.QueryError | null, results: any[]) => {
      if (error) {
        console.error('Products fetch by shop failed:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }
      return res.json(results);
    }
  );
});

// Upsert user by Auth0 ID (auto-insert on login)
server.post('/users/upsert', upsertUserByAuth0Id());

// Create a new shop
server.post('/shops', createShop());
