# Auth0 + Minimal Shop Integration

## Database Design

**MINIMAL approach:** Store only business logic in database, get user metadata from Auth0.

### users table
```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  auth0_id VARCHAR(255) NOT NULL UNIQUE,
  role ENUM('customer', 'seller', 'customer_seller') DEFAULT 'customer',
  shop_id INT UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### shops table
```sql
CREATE TABLE shops (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### products table
```sql
CREATE TABLE products (
  id INT PRIMARY KEY AUTO_INCREMENT,
  shop_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  image_url VARCHAR(500),
  stock_quantity INT DEFAULT 0,
  sku VARCHAR(100) UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
);
```

**Note:** User email, name, picture → stored in Auth0, not database.

## User Roles

- **`customer`** - Only browses and buys
- **`seller`** - Only sells (has shop)
- **`customer_seller`** - Can both buy and sell

## Backend Endpoints

### Get User Info
```
GET /users/by-auth0/:auth0Id
Response: { id, auth0_id, role, shop_id }
```

### Get Shop (Sellers Only)
```
GET /shops/by-user/:auth0Id
Response: { id, name, created_at, role }
```

## Frontend Service

```typescript
// ShopService methods:
getUserInfo(): Observable<UserInfo | null>
getShopInfo(): Observable<ShopInfo | null>
isSeller(): Observable<boolean>
```

## Usage Examples

### Check if seller
```typescript
isSeller$ = this.shopService.isSeller();

<a *ngIf="isSeller$ | async">My Shop</a>
```

### Display shop for sellers
```typescript
shop$ = this.shopService.getShopInfo();

<h1 *ngIf="shop$ | async as shop">{{ shop.name }}</h1>
```

### Show user role
```typescript
user$ = this.shopService.getUserInfo();

<p *ngIf="user$ | async as user">Role: {{ user.role }}</p>
```

## Implementation Checklist

- [ ] Run DATABASE_SCHEMA.sql to create minimal tables
- [ ] Update backend routes to use auth0_id parameter
- [ ] Update ShopService with getUserInfo() and getShopInfo()
- [ ] Add role-based UI in components
- [ ] Create seller dashboard/shop management pages
- [ ] Add product management for sellers
