import { Request, Response } from 'express';
import { QueryError } from 'mysql2';
import { db } from './app';
import { verifyPassword, sanitizeUser } from './security/password';

// Select queries
export function selectAll(tableName: string) {
    return (req: Request, res: Response) => {
        db.query(`SELECT * FROM ${tableName}`, (error: QueryError | null, results: any[]) => {
            if (error) {
                console.error(`GET from "${tableName}" failed:`, error);
                res.status(500).json({ error: 'Internal server error' });
            } else {
                res.json(results);
            }
        });
    };
}

// Select single row by id
export function selectById(tableName: string) {
    return (req: Request, res: Response) => {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ error: 'id required' });
        }
        db.query(
            `SELECT * FROM ${tableName} WHERE id = ? LIMIT 1`,
            [id],
            (error: QueryError | null, results: any[]) => {
                if (error) {
                    console.error(`GET by id from "${tableName}" failed:`, error);
                    return res.status(500).json({ error: 'Internal server error' });
                }
                if (!results || results.length === 0) {
                    return res.status(404).json({ error: `${tableName.slice(0, -1)} not found` });
                }
                return res.json(results[0]);
            }
        );
    };
}

export function selectColumn(tableName: string, columnName: string) {
    return (req: Request, res: Response) => {
        const value = req.params[columnName];
        db.query(
            `SELECT ${columnName} FROM ${tableName}`,
            [value],
            (error: QueryError | null, results: any[]) => {
                if (error) {
                    console.error(`GET from "${tableName}" failed:`, error);
                    res.status(500).json({ error: 'Internal server error' });
                } else if (results.length === 0) {
                    res.status(404).json({ error: `${tableName.slice(0, -1)} not found` });
                } else {
                    res.json(results);
                }
            }
        );
    };
}

// Insert queries
export function insert(tableName: string, columns: string[]) {
    return (req: Request, res: Response) => {
        const data = req.body;
        const placeholders = columns.map(() => '?').join(', ');
        const values = columns.map(col => data[col]);
        
        db.query(
            `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`,
            values,
            (error: QueryError | null, results: any) => {
                if (error) {
                    console.error(`POST to "${tableName}" failed:`, error);
                    res.status(500).json({ error: 'Internal server error' });
                } else {
                    res.status(201).json({ id: results.insertId, ...data });
                }
            }
        );
    };
}

// Create queries
export function createTable(tableName: string, columns: string) {
    return (req: Request, res: Response) => {
        db.query(
            `CREATE TABLE IF NOT EXISTS ${tableName} (${columns})`,
            (error: QueryError | null) => {
                if (error) {
                    console.error(`CREATE TABLE "${tableName}" failed:`, error);
                    res.status(500).json({ error: 'Internal server error' });
                } else {
                    res.status(201).json({ message: `Table ${tableName} created successfully` });
                }
            }
        );
    };
}

// Alter queries
export function alterTable(tableName: string, columnName: string, columnType: string) {
    return (req: Request, res: Response) => {
        db.query(
            `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnType}`,
            (error: QueryError | null) => {
                if (error) {
                    console.error(`ALTER TABLE "${tableName}" failed:`, error);
                    res.status(500).json({ error: 'Internal server error' });
                } else {
                    res.status(200).json({ message: `Column ${columnName} added to ${tableName}` });
                }
            }
        );
    }
}

// Drop queries
export function dropTable(tableName: string) {
    return (req: Request, res: Response) => {
        db.query(`DROP TABLE IF EXISTS ${tableName}`, (error: QueryError | null) => {
            if (error) {
                console.error(`DROP TABLE "${tableName}" failed:`, error);
                res.status(500).json({ error: 'Internal server error' });
            } else {
                res.status(200).json({ message: `Table ${tableName} dropped successfully` });
            }
        });
    };
}

// Fetch shop by Auth0 user ID
export function getShopByAuth0UserId(tableName: string) {
    return (req: Request, res: Response) => {
        const { auth0Id } = req.params;
        if (!auth0Id) {
            return res.status(400).json({ error: 'auth0Id required' });
        }

        db.query(
            `SELECT u.role, s.id, s.name, s.created_at FROM shops s
             JOIN ${tableName} u ON s.id = u.shop_id
             WHERE u.auth0_id = ? AND u.role IN ('seller', 'customer_seller') LIMIT 1`,
            [auth0Id],
            (error: QueryError | null, results: any[]) => {
                if (error) {
                    console.error(`GET shop by Auth0 user ID failed:`, error);
                    return res.status(500).json({ error: 'Internal server error' });
                }
                if (!results || results.length === 0) {
                    return res.status(404).json({ error: 'Shop not found or user is not a seller' });
                }
                return res.json(results[0]);
            }
        );
    };
}

// Fetch user info by Auth0 ID
export function getUserByAuth0Id(tableName: string) {
    return (req: Request, res: Response) => {
        const { auth0Id } = req.params;
        if (!auth0Id) {
            return res.status(400).json({ error: 'auth0Id required' });
        }

        db.query(
            `SELECT id, auth0_id, role, shop_id FROM ${tableName} WHERE auth0_id = ? LIMIT 1`,
            [auth0Id],
            (error: QueryError | null, results: any[]) => {
                if (error) {
                    console.error(`GET user by Auth0 ID from "${tableName}" failed:`, error);
                    return res.status(500).json({ error: 'Internal server error' });
                }
                if (!results || results.length === 0) {
                    return res.status(404).json({ error: 'User not found' });
                }
                return res.json(results[0]);
            }
        );
    };
}

// Upsert user by Auth0 ID (insert if not exists, return existing if exists)
export function upsertUserByAuth0Id() {
    return (req: Request, res: Response) => {
        const { auth0_id, role = 'customer' } = req.body;
        
        if (!auth0_id) {
            return res.status(400).json({ error: 'auth0_id is required' });
        }

        // First check if user exists
        db.query(
            'SELECT id, auth0_id, role, shop_id FROM users WHERE auth0_id = ? LIMIT 1',
            [auth0_id],
            (error: QueryError | null, results: any[]) => {
                if (error) {
                    console.error('Check user existence failed:', error);
                    return res.status(500).json({ error: 'Internal server error' });
                }

                // If user exists, return them
                if (results && results.length > 0) {
                    return res.status(200).json(results[0]);
                }

                // If user doesn't exist, insert them
                db.query(
                    'INSERT INTO users (auth0_id, role, shop_id) VALUES (?, ?, NULL)',
                    [auth0_id, role],
                    (insertError: QueryError | null, insertResults: any) => {
                        if (insertError) {
                            console.error('Insert user failed:', insertError);
                            return res.status(500).json({ error: 'Internal server error' });
                        }
                        return res.status(201).json({
                            id: insertResults.insertId,
                            auth0_id,
                            role,
                            shop_id: null
                        });
                    }
                );
            }
        );
    };
}

// Create a new shop and update user role
export function createShop() {
    return (req: Request, res: Response) => {
        const { auth0_id, shop_name } = req.body;

        if (!auth0_id || !shop_name) {
            return res.status(400).json({ error: 'auth0_id and shop_name are required' });
        }

        // First, get the user to check they exist
        db.query(
            'SELECT id, role, shop_id FROM users WHERE auth0_id = ? LIMIT 1',
            [auth0_id],
            (error: QueryError | null, userResults: any[]) => {
                if (error) {
                    console.error('Get user failed:', error);
                    return res.status(500).json({ error: 'Internal server error' });
                }

                if (!userResults || userResults.length === 0) {
                    return res.status(404).json({ error: 'User not found' });
                }

                const user = userResults[0];

                // Check if user already has a shop
                if (user.shop_id) {
                    return res.status(400).json({ error: 'User already has a shop' });
                }

                // Create the shop
                db.query(
                    'INSERT INTO shops (name) VALUES (?)',
                    [shop_name],
                    (shopError: QueryError | null, shopResults: any) => {
                        if (shopError) {
                            console.error('Create shop failed:', shopError);
                            return res.status(500).json({ error: 'Internal server error' });
                        }

                        const shopId = shopResults.insertId;

                        // Update user: set shop_id and update role to seller or customer_seller
                        const newRole = user.role === 'customer' ? 'seller' : 'customer_seller';
                        db.query(
                            'UPDATE users SET shop_id = ?, role = ? WHERE id = ?',
                            [shopId, newRole, user.id],
                            (updateError: QueryError | null) => {
                                if (updateError) {
                                    console.error('Update user failed:', updateError);
                                    return res.status(500).json({ error: 'Internal server error' });
                                }

                                return res.status(201).json({
                                    message: 'Shop created successfully',
                                    shop: {
                                        id: shopId,
                                        name: shop_name
                                    },
                                    user: {
                                        id: user.id,
                                        auth0_id,
                                        role: newRole,
                                        shop_id: shopId
                                    }
                                });
                            }
                        );
                    }
                );
            }
        );
    };
}

// Auth (login) queries - DEPRECATED (use Auth0 instead)
// Kept for reference only
// Plain-text password comparison; replace with hashing for production.
export function loginUser(tableName: string) {
    return (req: Request, res: Response) => {
        return res.status(501).json({ error: 'Use Auth0 authentication instead. This endpoint is deprecated.' });
    };
}

// Get all shops with their products (for shops listing page)
export function getAllShopsWithProducts() {
    return (req: Request, res: Response) => {
        db.query(
            `SELECT s.id, s.name, s.created_at FROM shops s ORDER BY s.created_at DESC`,
            (error: QueryError | null, shops: any[]) => {
                if (error) {
                    console.error('Get shops failed:', error);
                    return res.status(500).json({ error: 'Internal server error' });
                }

                // For each shop, get sample products
                if (!shops || shops.length === 0) {
                    return res.json([]);
                }

                const shopsWithProducts = shops.map(shop => ({
                    ...shop,
                    products: [] as any[]
                }));

                let completed = 0;

                shops.forEach((shop, index) => {
                    db.query(
                        `SELECT id, name, price, image_url FROM products WHERE shop_id = ? LIMIT 3`,
                        [shop.id],
                        (productError: QueryError | null, products: any[]) => {
                            if (!productError && products) {
                                shopsWithProducts[index].products = products;
                            }
                            completed++;

                            // When all queries are done, send response
                            if (completed === shops.length) {
                                return res.json(shopsWithProducts);
                            }
                        }
                    );
                });
            }
        );
    };
}

// Get single shop with all its products (for shop detail page)
export function getShopDetail() {
    return (req: Request, res: Response) => {
        const { shopId } = req.params;
        if (!shopId) {
            return res.status(400).json({ error: 'shopId required' });
        }

        // Get shop info
        db.query(
            `SELECT id, name, created_at FROM shops WHERE id = ? LIMIT 1`,
            [shopId],
            (error: QueryError | null, shopResults: any[]) => {
                if (error) {
                    console.error('Get shop failed:', error);
                    return res.status(500).json({ error: 'Internal server error' });
                }

                if (!shopResults || shopResults.length === 0) {
                    return res.status(404).json({ error: 'Shop not found' });
                }

                const shop = shopResults[0];

                // Get all products for this shop
                db.query(
                    `SELECT id, shop_id, name, description, price, image_url, stock_quantity, sku FROM products WHERE shop_id = ? ORDER BY created_at DESC`,
                    [shopId],
                    (productError: QueryError | null, products: any[]) => {
                        if (productError) {
                            console.error('Get products failed:', productError);
                            return res.status(500).json({ error: 'Internal server error' });
                        }

                        return res.json({
                            ...shop,
                            products: products || []
                        });
                    }
                );
            }
        );
    };
}

// Update product by ID
export function updateProduct() {
    return (req: Request, res: Response) => {
        const { id } = req.params;
        const { name, description, price, stock_quantity } = req.body;

        if (!id) {
            return res.status(400).json({ error: 'Product ID is required' });
        }

        // Validate required fields
        if (!name || price === undefined) {
            return res.status(400).json({ error: 'Product name and price are required' });
        }

        // Build dynamic UPDATE query based on provided fields
        // Only allow editing: name, description, price, stock_quantity
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
        if (stock_quantity !== undefined) {
            updates.push('stock_quantity = ?');
            values.push(stock_quantity);
        }

        updates.push('updated_at = CURRENT_TIMESTAMP');
        values.push(id);

        const updateQuery = `UPDATE products SET ${updates.join(', ')} WHERE id = ?`;

        db.query(
            updateQuery,
            values,
            (error: QueryError | null, results: any) => {
                if (error) {
                    console.error('Update product failed:', error);
                    return res.status(500).json({ error: 'Failed to update product' });
                }

                if (results.affectedRows === 0) {
                    return res.status(404).json({ error: 'Product not found' });
                }

                // Fetch updated product to return
                db.query(
                    'SELECT id, shop_id, name, description, price, image_url, stock_quantity, sku, created_at, updated_at FROM products WHERE id = ? LIMIT 1',
                    [id],
                    (fetchError: QueryError | null, products: any[]) => {
                        if (fetchError || !products || products.length === 0) {
                            return res.status(500).json({ error: 'Failed to retrieve updated product' });
                        }

                        return res.status(200).json({
                            message: 'Product updated successfully',
                            product: products[0]
                        });
                    }
                );
            }
        );
    };
}

export function deleteProduct() {
    return (req: Request, res: Response) => {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ error: 'Product ID is required' });
        }

        // First, fetch the product before deleting (for undo capability)
        db.query(
            'SELECT id, shop_id, name, description, price, image_url, stock_quantity, sku, created_at, updated_at FROM products WHERE id = ? LIMIT 1',
            [id],
            (fetchError: QueryError | null, products: any[]) => {
                if (fetchError || !products || products.length === 0) {
                    return res.status(404).json({ error: 'Product not found' });
                }

                const productData = products[0];

                // Delete the product
                db.query(
                    'DELETE FROM products WHERE id = ?',
                    [id],
                    (deleteError: QueryError | null, results: any) => {
                        if (deleteError) {
                            console.error('Delete product failed:', deleteError);
                            return res.status(500).json({ error: 'Failed to delete product' });
                        }

                        // Return the deleted product data for undo capability on frontend
                        return res.status(200).json({
                            message: 'Product deleted successfully',
                            deletedProduct: productData
                        });
                    }
                );
            }
        );
    };
}

export function createProduct() {
    return (req: Request, res: Response) => {
        const { shop_id, name, description, price, image_url, stock_quantity, sku } = req.body;

        if (!shop_id || !name || price === undefined) {
            return res.status(400).json({ error: 'shop_id, name, and price are required' });
        }

        db.query(
            'INSERT INTO products (shop_id, name, description, price, image_url, stock_quantity, sku) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [shop_id, name, description || null, price, image_url || null, stock_quantity || 0, sku || null],
            (error: QueryError | null, results: any) => {
                if (error) {
                    console.error('Create product failed:', error);
                    return res.status(500).json({ error: 'Failed to create product' });
                }

                // Fetch the created product to return
                db.query(
                    'SELECT id, shop_id, name, description, price, image_url, stock_quantity, sku, created_at, updated_at FROM products WHERE id = ? LIMIT 1',
                    [results.insertId],
                    (fetchError: QueryError | null, products: any[]) => {
                        if (fetchError || !products || products.length === 0) {
                            return res.status(500).json({ error: 'Failed to retrieve created product' });
                        }

                        return res.status(201).json({
                            message: 'Product created successfully',
                            product: products[0]
                        });
                    }
                );
            }
        );
    };
}
