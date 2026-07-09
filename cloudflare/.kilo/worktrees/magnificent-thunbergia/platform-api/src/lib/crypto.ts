/**
 * A simple mock for encryption/decryption of sensitive tokens.
 * In a real production environment, this should use a proper encryption library
 * (like Web Crypto API) with a secure key stored in environment variables.
 */

export function encrypt(text: string): string {
    // Simple Base64 for now as a placeholder for encryption
    return btoa(text);
}

export function decrypt(encoded: string): string {
    // Simple Base64 decode as a placeholder for decryption
    try {
        return atob(encoded);
    } catch (e) {
        return encoded; // Fallback if not base64
    }
}
