import bcrypt from 'bcrypt';

// Adjustable cost factor. Higher is slower but more secure. 12 is a reasonable baseline.
const SALT_ROUNDS = Number(process.env['BCRYPT_ROUNDS'] || 12);

/**
 * Hash a plain-text password using bcrypt.
 * @param plain The user's supplied password.
 * @returns Promise resolving to the bcrypt hash.
 */
export async function hashPassword(plain: string): Promise<string> {
    if (!plain) throw new Error('Password required to hash');
    return bcrypt.hash(plain, SALT_ROUNDS);
}

/**
 * Verify a plain password against a stored bcrypt hash.
 * @param plain The candidate password.
 * @param hash The stored bcrypt hash.
 * @returns Promise<boolean> true if match.
 */
export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
    if (!plain || !hash) return false;
    return bcrypt.compare(plain, hash);
}

/**
 * Convenience helper to strip sensitive fields before sending user object to client.
 */
export function sanitizeUser<T extends { password?: string }>(user: T): Omit<T, 'password'> {
    const { password, ...rest } = user;
    return rest;
}
