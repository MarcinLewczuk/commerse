import path from 'path';
import dotenv from 'dotenv';
import Stripe from 'stripe';
import twilio from 'twilio';
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
const productsUploadDir = path.resolve(__dirname, '../../public/images/products');
const servicesUploadDir = path.resolve(__dirname, '../../public/images/services');

if (!fs.existsSync(productsUploadDir)) {
  fs.mkdirSync(productsUploadDir, { recursive: true });
}
if (!fs.existsSync(servicesUploadDir)) {
  fs.mkdirSync(servicesUploadDir, { recursive: true });
}

// Storage configuration for products
const productStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, productsUploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'product-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Storage configuration for services
const serviceStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, servicesUploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'service-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const uploadProduct = multer({
  storage: productStorage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB max
});

const uploadService = multer({
  storage: serviceStorage,
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

// Twilio Verification
const twilioClient = twilio(process.env['TWILIO_ACCOUNT_SID'], process.env['TWILIO_AUTH_TOKEN']);

server.post('/users/verify-phone/send', async (req: Request, res: Response) => {
  const { phone_number } = req.body;
  if (!phone_number) return res.status(400).json({ error: 'phone_number required' });

  try {
    const serviceSid = process.env['TWILIO_VERIFY_SERVICE_SID']!;
    const verification = await twilioClient.verify.v2.services(serviceSid)
      .verifications.create({ to: phone_number, channel: 'sms' });
    res.json({ success: true, status: verification.status });
  } catch (error: any) {
    console.error('Twilio Send Error:', error);
    res.status(500).json({ error: error.message || 'Failed to send verification code' });
  }
});

server.post('/users/verify-phone/confirm', async (req: Request, res: Response) => {
  const { auth0_id, phone_number, code } = req.body;
  if (!auth0_id || !phone_number || !code) {
    return res.status(400).json({ error: 'auth0_id, phone_number, and code required' });
  }

  try {
    const serviceSid = process.env['TWILIO_VERIFY_SERVICE_SID']!;
    const verificationCheck = await twilioClient.verify.v2.services(serviceSid)
      .verificationChecks.create({ to: phone_number, code });

    if (verificationCheck.status === 'approved') {
      // Update DB
      db.query(
        'UPDATE users SET phone_number = ?, is_phone_verified = true WHERE auth0_id = ?',
        [phone_number, auth0_id],
        (error) => {
          if (error) {
            console.error('Update phone status failed:', error);
            return res.status(500).json({ error: 'Database update failed' });
          }
          res.json({ success: true, message: 'Phone verified successfully' });
        }
      );
    } else {
      res.status(400).json({ error: 'Invalid verification code' });
    }
  } catch (error: any) {
    console.error('Twilio Confirm Error:', error);
    res.status(500).json({ error: error.message || 'Failed to verify code' });
  }
});

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

// --- SERVICES ROUTES ---
// Get all services
server.get('/services', (req: Request, res: Response) => {
  db.query(
    `SELECT s.id, s.shop_id, s.name, s.description, s.price, s.duration_minutes, s.service_code,
            GROUP_CONCAT(si.image_url ORDER BY si.display_order) as image_urls,
            s.created_at, s.updated_at
     FROM services s
     LEFT JOIN service_images si ON s.id = si.service_id
     GROUP BY s.id
     ORDER BY s.created_at DESC`,
    (error: mysql.QueryError | null, results: any[]) => {
      if (error) {
        console.error('GET all services failed:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }
      const apiUrl = `http://localhost:${process.env['PORT']}`;
      const servicesWithImages = results.map((s: any) => ({
        ...s,
        image_urls: s.image_urls
          ? s.image_urls.split(',').map((url: string) => `${apiUrl}${url}`)
          : []
      }));
      return res.json(servicesWithImages);
    }
  );
});

// Get service by ID
server.get('/services/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ error: 'Service ID required' });
  }
  db.query(
    `SELECT s.id, s.shop_id, s.name, s.description, s.price, s.duration_minutes, s.service_code,
            GROUP_CONCAT(si.image_url ORDER BY si.display_order) as image_urls,
            s.created_at, s.updated_at
     FROM services s
     LEFT JOIN service_images si ON s.id = si.service_id
     WHERE s.id = ?
     GROUP BY s.id`,
    [id],
    (error: mysql.QueryError | null, results: any[]) => {
      if (error) {
        console.error(`GET service by id failed:`, error);
        return res.status(500).json({ error: 'Internal server error' });
      }
      if (results.length === 0) {
        return res.status(404).json({ error: 'Service not found' });
      }
      const apiUrl = `http://localhost:${process.env['PORT']}`;
      const service = {
        ...results[0],
        image_urls: results[0].image_urls
          ? results[0].image_urls.split(',').map((url: string) => `${apiUrl}${url}`)
          : []
      };
      return res.json(service);
    }
  );
});

// Get service by slug
server.get('/services/slug/:slug', (req: Request, res: Response) => {
  const { slug } = req.params;
  if (!slug) {
    return res.status(400).json({ error: 'Service slug required' });
  }
  db.query(
    `SELECT s.id, s.shop_id, s.name, s.description, s.price, s.duration_minutes, s.service_code,
            GROUP_CONCAT(si.image_url ORDER BY si.display_order) as image_urls,
            s.created_at, s.updated_at
     FROM services s
     LEFT JOIN service_images si ON s.id = si.service_id
     GROUP BY s.id`,
    (error: mysql.QueryError | null, results: any[]) => {
      if (error) {
        console.error('Services slug fetch failed:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }
      const apiUrl = `http://localhost:${process.env['PORT']}`;
      const service = results.find((s: any) => slugify(s.name) === slug);
      if (!service) {
        return res.status(404).json({ error: 'Service not found' });
      }
      const serviceWithImages = {
        ...service,
        image_urls: service.image_urls
          ? service.image_urls.split(',').map((url: string) => `${apiUrl}${url}`)
          : []
      };
      return res.json(serviceWithImages);
    }
  );
});

// Get services by shop ID
server.get('/services/shop/:shopId', (req: Request, res: Response) => {
  const { shopId } = req.params;
  if (!shopId) {
    return res.status(400).json({ error: 'shopId required' });
  }
  db.query(
    `SELECT s.id, s.shop_id, s.name, s.description, s.price, s.duration_minutes, s.service_code,
            GROUP_CONCAT(si.image_url ORDER BY si.display_order) as image_urls,
            s.created_at, s.updated_at
     FROM services s
     LEFT JOIN service_images si ON s.id = si.service_id
     WHERE s.shop_id = ?
     GROUP BY s.id
     ORDER BY s.created_at DESC`,
    [shopId],
    (error: mysql.QueryError | null, results: any[]) => {
      if (error) {
        console.error('Services fetch by shop failed:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }
      const apiUrl = `http://localhost:${process.env['PORT']}`;
      const servicesWithImages = results.map((s: any) => ({
        ...s,
        image_urls: s.image_urls
          ? s.image_urls.split(',').map((url: string) => `${apiUrl}${url}`)
          : []
      }));
      return res.json(servicesWithImages);
    }
  );
});

// Create a new service
server.post('/services', (req: Request, res: Response) => {
  const { shop_id, name, description, price, duration_minutes, service_code, imageUrls } = req.body;

  console.log('Creating service with data:', { shop_id, name, description, price, duration_minutes, service_code, imageUrls });

  if (!shop_id || !name || !price) {
    return res.status(400).json({ error: 'shop_id, name, and price are required' });
  }

  db.query(
    'INSERT INTO services (shop_id, name, description, price, duration_minutes, service_code) VALUES (?, ?, ?, ?, ?, ?)',
    [shop_id, name, description || null, price, duration_minutes || null, service_code || null],
    (error: mysql.QueryError | null, result: any) => {
      if (error) {
        console.error('Create service failed:', error);
        console.error('Error details:', {
          code: error.code,
          errno: error.errno,
          message: error.message
        });
        return res.status(500).json({ error: 'Internal server error', details: error.message });
      }

      const serviceId = result.insertId;

      // Insert service images if provided
      if (imageUrls && Array.isArray(imageUrls) && imageUrls.length > 0) {
        const imageValues = imageUrls.map((url: string, index: number) => [serviceId, url, index]);
        db.query(
          'INSERT INTO service_images (service_id, image_url, display_order) VALUES ?',
          [imageValues],
          (imgError: mysql.QueryError | null) => {
            if (imgError) {
              console.error('Insert service images failed:', imgError);
            }
          }
        );
      }

      return res.status(201).json({ id: serviceId, message: 'Service created successfully' });
    }
  );
});

// Update a service
server.put('/services/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, description, price, duration_minutes } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'Service ID required' });
  }

  const updates: string[] = [];
  const values: any[] = [];

  if (name !== undefined) {
    updates.push('name = ?');
    values.push(name);
  }
  if (description !== undefined) {
    updates.push('description = ?');
    values.push(description);
  }
  if (price !== undefined) {
    updates.push('price = ?');
    values.push(price);
  }
  if (duration_minutes !== undefined) {
    updates.push('duration_minutes = ?');
    values.push(duration_minutes);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  values.push(id);

  db.query(
    `UPDATE services SET ${updates.join(', ')} WHERE id = ?`,
    values,
    (error: mysql.QueryError | null) => {
      if (error) {
        console.error('Update service failed:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }
      return res.json({ message: 'Service updated successfully' });
    }
  );
});

// Update service images
server.put('/services/:id/images', (req: Request, res: Response) => {
  const { id } = req.params;
  const { imageUrls } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'Service ID required' });
  }

  if (!Array.isArray(imageUrls)) {
    return res.status(400).json({ error: 'imageUrls must be an array' });
  }

  // Delete existing images
  db.query('DELETE FROM service_images WHERE service_id = ?', [id], (delError: mysql.QueryError | null) => {
    if (delError) {
      console.error('Delete service images failed:', delError);
      return res.status(500).json({ error: 'Failed to delete old images' });
    }

    // Insert new images
    if (imageUrls.length > 0) {
      const imageValues = imageUrls.map((url: string, index: number) => {
        const cleanUrl = url.replace(/^https?:\/\/[^\/]+/, '');
        return [id, cleanUrl, index];
      });

      db.query(
        'INSERT INTO service_images (service_id, image_url, display_order) VALUES ?',
        [imageValues],
        (imgError: mysql.QueryError | null) => {
          if (imgError) {
            console.error('Insert service images failed:', imgError);
            return res.status(500).json({ error: 'Failed to insert new images' });
          }
          return res.json({ message: 'Service images updated successfully' });
        }
      );
    } else {
      return res.json({ message: 'Service images cleared' });
    }
  });
});

// Delete a service
server.delete('/services/:id', (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ error: 'Service ID required' });
  }

  db.query('DELETE FROM services WHERE id = ?', [id], (error: mysql.QueryError | null, result: any) => {
    if (error) {
      console.error('Delete service failed:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Service not found' });
    }

    return res.json({ message: 'Service deleted successfully' });
  });
});

// Upload product images
server.post('/upload/products', uploadProduct.array('images', 10), (req: Request, res: Response) => {
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

// Upload service images
server.post('/upload/services', uploadService.array('images', 10), (req: Request, res: Response) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No images uploaded' });
  }

  const imageUrls = (req.files as Express.Multer.File[]).map(file => {
    return `/images/services/${file.filename}`;
  });

  return res.status(200).json({
    message: 'Images uploaded successfully',
    imageUrls
  });
});

// ============================================
// SERVICE BOOKINGS ENDPOINTS
// ============================================

// Get all bookings for a seller's shop
server.get('/seller/bookings/:shopId', (req: Request, res: Response) => {
  const { shopId } = req.params;

  if (!shopId) {
    return res.status(400).json({ error: 'Shop ID required' });
  }

  db.query(
    `SELECT 
      sb.id,
      sb.service_id,
      sb.booking_date,
      sb.start_time,
      sb.end_time,
      sb.status,
      sb.customer_name,
      sb.customer_email,
      sb.notes,
      sb.created_at,
      s.name as service_name,
      s.duration_minutes,
      s.price
    FROM service_bookings sb
    JOIN services s ON sb.service_id = s.id
    WHERE sb.shop_id = ?
    ORDER BY sb.booking_date DESC, sb.start_time DESC`,
    [shopId],
    (error: mysql.QueryError | null, results: any[]) => {
      if (error) {
        console.error('Fetch seller bookings failed:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }
      return res.json(results);
    }
  );
});

// Create a new booking (for customers)
server.post('/bookings', (req: Request, res: Response) => {
  const {
    service_id,
    shop_id,
    customer_id,
    booking_date,
    start_time,
    end_time,
    customer_name,
    customer_email,
    notes
  } = req.body;

  if (!service_id || !shop_id || !customer_id || !booking_date || !start_time) {
    return res.status(400).json({
      error: 'service_id, shop_id, customer_id, booking_date, and start_time are required'
    });
  }

  db.query(
    `INSERT INTO service_bookings 
    (service_id, shop_id, customer_id, booking_date, start_time, end_time, customer_name, customer_email, notes) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [service_id, shop_id, customer_id, booking_date, start_time, end_time || null, customer_name || null, customer_email || null, notes || null],
    (error: mysql.QueryError | null, result: any) => {
      if (error) {
        console.error('Create booking failed:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }
      return res.status(201).json({
        id: result.insertId,
        message: 'Booking created successfully'
      });
    }
  );
});

// Update booking status
server.put('/bookings/:id/status', (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!id || !status) {
    return res.status(400).json({ error: 'Booking ID and status are required' });
  }

  const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status value' });
  }

  db.query(
    'UPDATE service_bookings SET status = ? WHERE id = ?',
    [status, id],
    (error: mysql.QueryError | null, result: any) => {
      if (error) {
        console.error('Update booking status failed:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Booking not found' });
      }

      return res.json({ message: 'Booking status updated successfully' });
    }
  );
});

// Update booking details
server.put('/bookings/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { booking_date, start_time, end_time, customer_name, customer_email, notes, status } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'Booking ID required' });
  }

  const updates: string[] = [];
  const values: any[] = [];

  if (booking_date !== undefined) {
    updates.push('booking_date = ?');
    values.push(booking_date);
  }
  if (start_time !== undefined) {
    updates.push('start_time = ?');
    values.push(start_time);
  }
  if (end_time !== undefined) {
    updates.push('end_time = ?');
    values.push(end_time || null);
  }
  if (customer_name !== undefined) {
    updates.push('customer_name = ?');
    values.push(customer_name || null);
  }
  if (customer_email !== undefined) {
    updates.push('customer_email = ?');
    values.push(customer_email || null);
  }
  if (notes !== undefined) {
    updates.push('notes = ?');
    values.push(notes || null);
  }
  if (status !== undefined) {
    const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }
    updates.push('status = ?');
    values.push(status);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  values.push(id);

  db.query(
    `UPDATE service_bookings SET ${updates.join(', ')} WHERE id = ?`,
    values,
    (error: mysql.QueryError | null, result: any) => {
      if (error) {
        console.error('Update booking failed:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Booking not found' });
      }

      return res.json({ message: 'Booking updated successfully' });
    }
  );
});

// Delete a booking
server.delete('/bookings/:id', (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ error: 'Booking ID required' });
  }

  db.query(
    'DELETE FROM service_bookings WHERE id = ?',
    [id],
    (error: mysql.QueryError | null, result: any) => {
      if (error) {
        console.error('Delete booking failed:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Booking not found' });
      }

      return res.json({ message: 'Booking deleted successfully' });
    }
  );
});

const secretKey = process.env['SECRETKEY'];
if (!secretKey) {
  throw new Error('Missing required environment variable: SECRET_KEY');
}
const stripe = new Stripe(secretKey, {
  apiVersion: '2026-05-27.dahlia',
});

server.post('/create-checkout-session', async (req: Request, res: Response) => {
  try {
    const { items } = req.body;

    // Create a Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: items.map((item: any) => ({
        price_data: {
          currency: 'usd',
          product_data: {
            name: item.name,
          },
          unit_amount: Math.round(item.price * 100),
        },
        quantity: item.quantity,
      })),
      mode: 'payment',
      success_url: 'http://localhost:4200/success',
      cancel_url: 'http://localhost:4200/basket',
    });

    res.json({ id: session.id });
  } catch (error: any) {
    console.error('Stripe Session Error:', error);
    res.status(500).json({ error: error.message });
  }
});