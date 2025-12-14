import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../private/.env') });

import express, { Request, Response } from 'express';
import cors from 'cors';
import mysql from 'mysql2';
import bodyParser from 'body-parser';
import multer from 'multer';
import fs from 'fs';
import { insert, selectAll, selectColumn, loginUser, selectById, getShopByAuth0UserId, getUserByAuth0Id, upsertUserByAuth0Id, createShop, getAllShopsWithProducts, getShopDetail, updateProduct, updateProductImages, deleteProduct, createProduct } from './queries'; // Adjust path if needed

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

// Configure multer for image uploads
const uploadsDir = path.resolve(__dirname, '../../public/images/products');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'product-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB max
});

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

// Get all products with images
server.get('/products', (req: Request, res: Response) => {
  db.query(
    `SELECT p.id, p.shop_id, p.name, p.description, p.price, p.stock_quantity, p.sku, p.created_at, p.updated_at,
            GROUP_CONCAT(pi.image_url ORDER BY pi.display_order) as image_urls
     FROM products p
     LEFT JOIN product_images pi ON p.id = pi.product_id
     GROUP BY p.id
     ORDER BY p.created_at DESC`,
    (error: mysql.QueryError | null, results: any[]) => {
      if (error) {
        console.error('GET all products failed:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }
      // Convert comma-separated image strings to arrays and prepend full URL
      const apiUrl = `http://localhost:${process.env['PORT']}`;
      const productsWithImages = results.map((p: any) => {
        const result = {
          ...p,
          image_urls: p.image_urls 
            ? p.image_urls.split(',').map((url: string) => `${apiUrl}${url}`)
            : []
        };
        return result;
      });
      return res.json(productsWithImages);
    }
  );
});

// Get product by ID with images
server.get('/products/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ error: 'Product ID is required' });
  }
  db.query(
    `SELECT p.id, p.shop_id, p.name, p.description, p.price, p.stock_quantity, p.sku, p.created_at, p.updated_at,
            GROUP_CONCAT(pi.image_url ORDER BY pi.display_order) as image_urls
     FROM products p
     LEFT JOIN product_images pi ON p.id = pi.product_id
     WHERE p.id = ?
     GROUP BY p.id
     LIMIT 1`,
    [id],
    (error: mysql.QueryError | null, results: any[]) => {
      if (error) {
        console.error(`GET product by id failed:`, error);
        return res.status(500).json({ error: 'Internal server error' });
      }
      if (!results || results.length === 0) {
        return res.status(404).json({ error: 'Product not found' });
      }
      const product = results[0];
      // Convert comma-separated image strings to arrays and prepend full URL
      const apiUrl = `http://localhost:${process.env['PORT']}`;
      product.image_urls = product.image_urls 
        ? product.image_urls.split(',').map((url: string) => `${apiUrl}${url}`)
        : [];
      return res.json(product);
    }
  );
});

// Slug route: match product by slugified name
server.get('/products/slug/:slug', (req: Request, res: Response) => {
  const { slug } = req.params;
  db.query(
    `SELECT p.id, p.shop_id, p.name, p.description, p.price, p.stock_quantity, p.sku, p.created_at, p.updated_at,
            GROUP_CONCAT(pi.image_url ORDER BY pi.display_order) as image_urls
     FROM products p
     LEFT JOIN product_images pi ON p.id = pi.product_id
     GROUP BY p.id`,
    (error: mysql.QueryError | null, results: any[]) => {
      if (error) {
        console.error('Products slug fetch failed:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }
      const match = results.find((p: any) => slugify(p.name || '') === slug);
      if (!match) {
        return res.status(404).json({ error: 'product not found' });
      }
      // Convert comma-separated image strings to arrays and prepend full URL
      const apiUrl = `http://localhost:${process.env['PORT']}`;
      match.image_urls = match.image_urls 
        ? match.image_urls.split(',').map((url: string) => `${apiUrl}${url}`)
        : [];
      return res.json(match);
    }
  );
});

// Get products by shop ID
server.get('/shops/:shopId/products', (req: Request, res: Response) => {
  const { shopId } = req.params;
  if (!shopId) {
    return res.status(400).json({ error: 'shopId required' });
  }
  db.query(
    `SELECT p.id, p.shop_id, p.name, p.description, p.price, p.stock_quantity, p.sku,
            GROUP_CONCAT(pi.image_url ORDER BY pi.display_order) as image_urls
     FROM products p
     LEFT JOIN product_images pi ON p.id = pi.product_id
     WHERE p.shop_id = ?
     GROUP BY p.id
     ORDER BY p.created_at DESC`,
    [shopId],
    (error: mysql.QueryError | null, results: any[]) => {
      if (error) {
        console.error('Products fetch by shop failed:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }
      // Convert comma-separated image strings to arrays and prepend full URL
      const apiUrl = `http://localhost:${process.env['PORT']}`;
      const productsWithImages = results.map((p: any) => {
        const result = {
          ...p,
          image_urls: p.image_urls 
            ? p.image_urls.split(',').map((url: string) => `${apiUrl}${url}`)
            : []
        };
        return result;
      });
      return res.json(productsWithImages);
    }
  );
});

// Upsert user by Auth0 ID (auto-insert on login)
server.post('/users/upsert', upsertUserByAuth0Id());

// Create a new shop
server.post('/shops', createShop());

// Get all shops with sample products
server.get('/shops', getAllShopsWithProducts());

// Get single shop with all products (must come after /shops route)
server.get('/shops/:shopId', getShopDetail());

// Update a product by ID
server.put('/products/:id', updateProduct());

// Update product images by product ID
server.put('/products/:id/images', updateProductImages());

// Delete a product by ID
server.delete('/products/:id', deleteProduct());

// Create a new product
server.post('/products', createProduct());

// Upload product images
server.post('/upload', upload.array('images', 10), (req: Request, res: Response) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No images uploaded' });
  }

  const imageUrls = (req.files as Express.Multer.File[]).map(file => {
    return `/images/products/${file.filename}`;
  });

  return res.status(200).json({
    message: 'Images uploaded successfully',
    imageUrls
  });
});
