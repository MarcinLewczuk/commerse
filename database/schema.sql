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
-- 5. SERVICES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS services (
  id INT PRIMARY KEY AUTO_INCREMENT,
  shop_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  duration_minutes INT,  -- Optional: service duration in minutes
  service_code VARCHAR(50) UNIQUE,  -- Unique identifier like SKU for products
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
  INDEX idx_shop_id (shop_id),
  INDEX idx_name (name),
  INDEX idx_service_code (service_code)
);

-- ============================================
-- 6. SERVICE_IMAGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS service_images (
  id INT PRIMARY KEY AUTO_INCREMENT,
  service_id INT NOT NULL,
  image_url VARCHAR(500) NOT NULL,
  display_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
  INDEX idx_service_id (service_id),
  INDEX idx_display_order (display_order)
);
