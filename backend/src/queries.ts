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

// Auth (login) queries
// Plain-text password comparison; replace with hashing for production.
export function loginUser(tableName: string) {
    return (req: Request, res: Response) => {
        const { email, password } = req.body || {};
        if (!email || !password) {
            return res.status(400).json({ error: 'email and password required' });
        }

        // Fetch user record by email only; verify bcrypt hash separately.
        db.query(
            `SELECT id, email, username, password FROM ${tableName} WHERE email = ? LIMIT 1`,
            [email],
            async (error: QueryError | null, results: any[]) => {
                if (error) {
                    console.error(`LOGIN query on "${tableName}" failed:`, error);
                    return res.status(500).json({ error: 'internal error' });
                }
                if (!results || results.length === 0) {
                    return res.status(401).json({ error: 'invalid credentials' });
                }
                const user = results[0];
                try {
                    const ok = await verifyPassword(password, user.password);
                    if (!ok) {
                        return res.status(401).json({ error: 'invalid credentials' });
                    }
                    return res.status(200).json(sanitizeUser(user));
                } catch (e) {
                    console.error('Password verification failed:', e);
                    return res.status(500).json({ error: 'internal error' });
                }
            }
        );
    };
}