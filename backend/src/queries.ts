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
            `SELECT id, auth0_id, role, shop_id, phone_number, is_phone_verified FROM ${tableName} WHERE auth0_id = ? LIMIT 1`,
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
            'SELECT id, auth0_id, role, shop_id, phone_number, is_phone_verified FROM users WHERE auth0_id = ? LIMIT 1',
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
                            shop_id: null,
                            phone_number: null,
                            is_phone_verified: false
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
        try {
            db.query(
                `SELECT s.id, s.name, s.created_at FROM shops s ORDER BY s.created_at DESC`,
                (error: QueryError | null, shops: any[]) => {
                    try {
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
                                `SELECT p.id, p.name, p.price,
                                        GROUP_CONCAT(pi.image_url ORDER BY pi.display_order) as image_urls
                                 FROM products p
                                 LEFT JOIN product_images pi ON p.id = pi.product_id
                                 WHERE p.shop_id = ?
                                 GROUP BY p.id
                                 LIMIT 3`,
                                [shop.id],
                                (productError: QueryError | null, products: any[]) => {
                                    try {
                                        if (!productError && products) {
                                            // Convert comma-separated image strings to arrays and prepend full URL
                                            const apiUrl = `http://localhost:${process.env['PORT']}`;
                                            const productsWithImages = products.map(p => ({
                                                ...p,
                                                image_urls: p.image_urls 
                                                  ? p.image_urls.split(',').map((url: string) => `${apiUrl}${url}`)
                                                  : []
                                            }));
                                            shopsWithProducts[index].products = productsWithImages;
                                        }
                                        completed++;

                                        // When all queries are done, send response
                                        if (completed === shops.length) {
                                            return res.json(shopsWithProducts);
                                        }
                                    } catch (err) {
                                        console.error('Error in product query callback:', err);
                                        if (!res.headersSent) {
                                            res.status(500).json({ error: 'Internal server error' });
                                        }
                                    }
                                }
                            );
                        });
                    } catch (err) {
                        console.error('Error in shops query callback:', err);
                        if (!res.headersSent) {
                            res.status(500).json({ error: 'Internal server error' });
                        }
                    }
                }
            );
        } catch (err) {
            console.error('Error in getAllShopsWithProducts:', err);
            res.status(500).json({ error: 'Internal server error' });
        }
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
                    `SELECT p.id, p.shop_id, p.name, p.description, p.price, p.stock_quantity, p.sku,
                            GROUP_CONCAT(pi.image_url ORDER BY pi.display_order) as image_urls
                     FROM products p
                     LEFT JOIN product_images pi ON p.id = pi.product_id
                     WHERE p.shop_id = ?
                     GROUP BY p.id
                     ORDER BY p.created_at DESC`,
                    [shopId],
                    (productError: QueryError | null, products: any[]) => {
                        if (productError) {
                            console.error('Get products failed:', productError);
                            return res.status(500).json({ error: 'Internal server error' });
                        }

                        // Convert comma-separated image strings to arrays
                        const apiUrl = `http://localhost:${process.env['PORT']}`;
                        const productsWithImages = products.map(p => {
                            const result = {
                                ...p,
                                image_urls: p.image_urls 
                                  ? p.image_urls.split(',').map((url: string) => `${apiUrl}${url}`)
                                  : []
                            };
                            return result;
                        });

                        return res.json({
                            ...shop,
                            products: productsWithImages || []
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
                    `SELECT p.id, p.shop_id, p.name, p.description, p.price, p.stock_quantity, p.sku, p.created_at, p.updated_at,
                            GROUP_CONCAT(pi.image_url ORDER BY pi.display_order) as image_urls
                     FROM products p
                     LEFT JOIN product_images pi ON p.id = pi.product_id
                     WHERE p.id = ?
                     GROUP BY p.id
                     LIMIT 1`,
                    [id],
                    (fetchError: QueryError | null, products: any[]) => {
                        if (fetchError || !products || products.length === 0) {
                            return res.status(500).json({ error: 'Failed to retrieve updated product' });
                        }

                        const product = products[0];
                        const apiUrl = `http://localhost:${process.env['PORT']}`;
                        product.image_urls = product.image_urls 
                          ? product.image_urls.split(',').map((url: string) => `${apiUrl}${url}`)
                          : [];

                        return res.status(200).json({
                            message: 'Product updated successfully',
                            product: product
                        });
                    }
                );
            }
        );
    };
}

export function updateProductImages() {
    return (req: Request, res: Response) => {
        const { id } = req.params;
        const { image_urls } = req.body;

        if (!id) {
            return res.status(400).json({ error: 'Product ID is required' });
        }

        if (!Array.isArray(image_urls)) {
            return res.status(400).json({ error: 'image_urls must be an array' });
        }

        // Strip the API URL prefix from image URLs before storing (only store relative paths)
        const apiUrl = `http://localhost:${process.env['PORT']}`;
        const relativePaths = image_urls.map((url: string) => {
            // Remove the API URL prefix if present
            return url.startsWith(apiUrl) ? url.replace(apiUrl, '') : url;
        });

        // Delete all existing images for this product
        db.query(
            'DELETE FROM product_images WHERE product_id = ?',
            [id],
            (deleteError: QueryError | null) => {
                if (deleteError) {
                    console.error('Failed to delete product images:', deleteError);
                    return res.status(500).json({ error: 'Failed to update product images' });
                }

                // Insert new images if any
                if (relativePaths.length === 0) {
                    // Fetch and return the updated product with no images
                    db.query(
                        `SELECT p.id, p.shop_id, p.name, p.description, p.price, p.stock_quantity, p.sku, p.created_at, p.updated_at,
                                GROUP_CONCAT(pi.image_url ORDER BY pi.display_order) as image_urls
                         FROM products p
                         LEFT JOIN product_images pi ON p.id = pi.product_id
                         WHERE p.id = ?
                         GROUP BY p.id
                         LIMIT 1`,
                        [id],
                        (fetchError: QueryError | null, products: any[]) => {
                            if (fetchError || !products || products.length === 0) {
                                return res.status(500).json({ error: 'Failed to retrieve updated product' });
                            }

                            const product = products[0];
                            product.image_urls = product.image_urls 
                              ? product.image_urls.split(',').map((url: string) => `${apiUrl}${url}`)
                              : [];

                            return res.status(200).json({ 
                                message: 'Product images updated successfully',
                                product: product
                            });
                        }
                    );
                    return;
                }

                const imageData = relativePaths.map((url: string, index: number) => [id, url, index + 1]);
                
                db.query(
                    'INSERT INTO product_images (product_id, image_url, display_order) VALUES ?',
                    [imageData],
                    (insertError: QueryError | null) => {
                        if (insertError) {
                            console.error('Failed to insert product images:', insertError);
                            return res.status(500).json({ error: 'Failed to update product images' });
                        }

                        // Fetch and return the updated product with images
                        db.query(
                            `SELECT p.id, p.shop_id, p.name, p.description, p.price, p.stock_quantity, p.sku, p.created_at, p.updated_at,
                                    GROUP_CONCAT(pi.image_url ORDER BY pi.display_order) as image_urls
                             FROM products p
                             LEFT JOIN product_images pi ON p.id = pi.product_id
                             WHERE p.id = ?
                             GROUP BY p.id
                             LIMIT 1`,
                            [id],
                            (fetchError: QueryError | null, products: any[]) => {
                                if (fetchError || !products || products.length === 0) {
                                    return res.status(500).json({ error: 'Failed to retrieve updated product' });
                                }

                                const product = products[0];
                                product.image_urls = product.image_urls 
                                  ? product.image_urls.split(',').map((url: string) => `${apiUrl}${url}`)
                                  : [];

                                return res.status(200).json({ 
                                    message: 'Product images updated successfully',
                                    product: product
                                });
                            }
                        );
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
            `SELECT p.id, p.shop_id, p.name, p.description, p.price, p.stock_quantity, p.sku, p.created_at, p.updated_at,
                    GROUP_CONCAT(pi.image_url ORDER BY pi.display_order) as image_urls
             FROM products p
             LEFT JOIN product_images pi ON p.id = pi.product_id
             WHERE p.id = ?
             GROUP BY p.id
             LIMIT 1`,
            [id],
            (fetchError: QueryError | null, products: any[]) => {
                if (fetchError || !products || products.length === 0) {
                    return res.status(404).json({ error: 'Product not found' });
                }

                const productData = products[0];
                const apiUrl = `http://localhost:${process.env['PORT']}`;
                productData.image_urls = productData.image_urls 
                  ? productData.image_urls.split(',').map((url: string) => `${apiUrl}${url}`)
                  : [];

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

// Helper function to generate a unique SKU
function generateSKU(shopId: number, productName: string, productId: number): string {
    // Format: SHOP{shopId}-{productNameAcronym}-{productId}
    // Example: SHOP1-WNC-001 for "Wireless Noise-Cancelling Headphones" in shop 1 with id 1
    
    // Get acronym from product name (first letter of each word, max 3 letters)
    const acronym = productName
        .split(' ')
        .slice(0, 3)
        .map(word => word.charAt(0).toUpperCase())
        .join('');
    
    // Pad product ID to 4 digits
    const paddedId = String(productId).padStart(4, '0');
    
    // Combine: SHOP{shopId}-{acronym}-{productId}
    return `SHOP${shopId}-${acronym}-${paddedId}`;
}

export function createProduct() {
    return (req: Request, res: Response) => {
        const { shop_id, name, description, price, image_urls, stock_quantity, sku } = req.body;

        if (!shop_id || !name || price === undefined) {
            return res.status(400).json({ error: 'shop_id, name, and price are required' });
        }

        db.query(
            'INSERT INTO products (shop_id, name, description, price, stock_quantity, sku) VALUES (?, ?, ?, ?, ?, ?)',
            [shop_id, name, description || null, price, stock_quantity || 0, null],
            (error: QueryError | null, results: any) => {
                if (error) {
                    console.error('Create product failed:', error);
                    return res.status(500).json({ error: 'Failed to create product: ' + error.message });
                }

                const productId = results.insertId;

                // Generate SKU using the newly created product ID
                const generatedSku = generateSKU(shop_id, name, productId);

                // Update the product with the generated SKU
                db.query(
                    'UPDATE products SET sku = ? WHERE id = ?',
                    [generatedSku, productId],
                    (updateError: QueryError | null) => {
                        if (updateError) {
                            console.error('Failed to update SKU:', updateError);
                            // Continue anyway, SKU generation is not critical
                        }

                        // Insert product images if any
                        if (image_urls && image_urls.length > 0) {
                            const imageInserts = image_urls.map((url: string, index: number) => [
                                productId,
                                url,
                                index
                            ]);

                            db.query(
                                'INSERT INTO product_images (product_id, image_url, display_order) VALUES ?',
                                [imageInserts],
                                (imageError: QueryError | null) => {
                                    if (imageError) {
                                        console.error('Failed to insert product images:', imageError);
                                        // Continue anyway, images are not critical
                                    }

                                    // Fetch the created product with images
                                    fetchProductWithImages(productId, res);
                                }
                            );
                        } else {
                            // Fetch the created product (without images)
                            fetchProductWithImages(productId, res);
                        }
                    }
                );
            }
        );
    };
}

// Helper function to fetch product with all its images
function fetchProductWithImages(productId: number, res: Response) {
    db.query(
        `SELECT p.id, p.shop_id, p.name, p.description, p.price, p.stock_quantity, p.sku, p.created_at, p.updated_at,
                GROUP_CONCAT(pi.image_url ORDER BY pi.display_order) as image_urls
         FROM products p
         LEFT JOIN product_images pi ON p.id = pi.product_id
         WHERE p.id = ?
         GROUP BY p.id`,
        [productId],
        (fetchError: QueryError | null, products: any[]) => {
            if (fetchError || !products || products.length === 0) {
                console.error('Fetch created product failed:', fetchError);
                return res.status(500).json({ error: 'Failed to retrieve created product' });
            }

            const product = products[0];
            // Convert comma-separated string back to array and prepend full URL
            const apiUrl = `http://localhost:${process.env['PORT']}`;
            product.image_urls = product.image_urls 
              ? product.image_urls.split(',').map((url: string) => `${apiUrl}${url}`)
              : [];

            return res.status(201).json({
                message: 'Product created successfully',
                product
            });
        }
    );
}
