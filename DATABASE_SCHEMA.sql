-- ============================================
-- COMMERSE DATABASE SCHEMA (MINIMAL)
-- Auth0 + Shop + Products Structure
-- ============================================
-- User data (email, name, picture) comes from Auth0, not stored here
-- Only business logic data is stored in the database

-- ============================================
-- 1. USERS TABLE
-- ============================================
-- Only stores Auth0 ID and role(s)
CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  auth0_id VARCHAR(255) NOT NULL UNIQUE,  -- Auth0's user.sub identifier
  role ENUM('customer', 'seller', 'customer_seller') DEFAULT 'customer',
  shop_id INT UNIQUE,                      -- NULL for customers, populated for sellers
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_auth0_id (auth0_id),
  INDEX idx_role (role),
  INDEX idx_shop_id (shop_id)
);

-- ============================================
-- 2. SHOPS TABLE (MINIMAL)
-- ============================================
-- Owner info comes from Auth0 via user.sub
CREATE TABLE IF NOT EXISTS shops (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_name (name)
);

-- ============================================
-- 3. PRODUCTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS products (
  id INT PRIMARY KEY AUTO_INCREMENT,
  shop_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  stock_quantity INT DEFAULT 0,
  sku VARCHAR(100) UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
  INDEX idx_shop_id (shop_id),
  INDEX idx_name (name),
  INDEX idx_sku (sku)
);

-- ============================================
-- 4. PRODUCT_IMAGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS product_images (
  id INT PRIMARY KEY AUTO_INCREMENT,
  product_id INT NOT NULL,
  image_url VARCHAR(500) NOT NULL,
  display_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  INDEX idx_product_id (product_id),
  INDEX idx_display_order (display_order)
);

-- ============================================
-- EXAMPLE DATA
-- ============================================

-- Insert example shops
INSERT INTO shops (name) VALUES
('TechGear Store'),
('Fashion Forward');

-- Insert example users
-- User 1: Seller (owner of TechGear Store)
INSERT INTO users (auth0_id, role, shop_id) VALUES
('auth0|65a1b2c3d4e5f6g7h8i9', 'seller', 1);

-- User 2: Seller (owner of Fashion Forward)
INSERT INTO users (auth0_id, role, shop_id) VALUES
('auth0|75b2c3d4e5f6g7h8i9j0', 'seller', 2);

-- User 3: Customer only (no shop)
INSERT INTO users (auth0_id, role, shop_id) VALUES
('auth0|85c3d4e5f6g7h8i9j0k1', 'customer', NULL);

-- User 4: Customer and seller (shops both as customer and has a shop)
INSERT INTO users (auth0_id, role, shop_id) VALUES
('auth0|95d4e5f6g7h8i9j0k1l2', 'customer_seller', 1);

-- Insert example products for TechGear Store (shop_id = 1)
INSERT INTO products (shop_id, name, description, price, image_url, stock_quantity, sku) VALUES
(
  1,
  'Wireless Noise-Cancelling Headphones',
  'Premium headphones with active noise cancellation and 30-hour battery life',
  149.99,
  '/images/headphones-001.jpg',
  45,
  'TECH-HEAD-NC-001'
),
(
  1,
  'USB-C Fast Charging Cable',
  '6ft durable charging cable with 100W power delivery',
  24.99,
  '/images/cable-usbc-001.jpg',
  120,
  'TECH-CABLE-USBC-001'
),
(
  1,
  '4K USB-C Dock',
  'Universal docking station with 4K HDMI, USB 3.0, and SD card reader',
  79.99,
  '/images/dock-4k-001.jpg',
  32,
  'TECH-DOCK-4K-001'
);

-- Insert example products for Fashion Forward (shop_id = 2)
INSERT INTO products (shop_id, name, description, price, image_url, stock_quantity, sku) VALUES
(
  2,
  'Classic Cotton T-Shirt',
  '100% organic cotton t-shirt in multiple colors',
  29.99,
  '/images/tshirt-classic-001.jpg',
  200,
  'FASH-TSHIRT-COTTON-001'
),
(
  2,
  'Designer Denim Jeans',
  'Premium denim jeans with modern fit and sustainable materials',
  89.99,
  '/images/jeans-design-001.jpg',
  65,
  'FASH-JEANS-DENIM-001'
),
(
  2,
  'Leather Crossbody Bag',
  'Genuine leather crossbody bag with adjustable strap',
  159.99,
  '/images/bag-leather-001.jpg',
  28,
  'FASH-BAG-LEATHER-001'
);
