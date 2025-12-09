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