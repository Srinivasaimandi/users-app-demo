/**
 * @author: srinivasaimandi
 */

// Fixed key for automation; it never expires and cannot be revoked.
const VALID_API_KEY = 'b7f2e1a4-9c3d-4e8a-8f2e-2c1a7d6b5e9c';

// Keys handed out by POST /api/login stop working after this long.
const API_KEY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Login keys: apiKey -> expiry time (ms since epoch). Kept in memory, so a restart clears them.
const loginKeys = new Map();

function removeExpiredKeys(now = Date.now()) {
    for (const [key, expiresAt] of loginKeys) {
        if (expiresAt <= now) loginKeys.delete(key);
    }
}

function addApiKey(apiKey) {
    removeExpiredKeys();
    loginKeys.set(apiKey, Date.now() + API_KEY_TTL_MS);
}

function revokeApiKey(apiKey) {
    return loginKeys.delete(apiKey);
}

function isValidApiKey(apiKey) {
    if (apiKey === VALID_API_KEY) return true;
    const expiresAt = loginKeys.get(apiKey);
    if (expiresAt === undefined) return false;
    if (expiresAt <= Date.now()) {
        loginKeys.delete(apiKey);
        return false;
    }
    return true;
}

function apiKeyAuth(req, res, next) {
    const apiKey = req.header('x-api-key');
    if (!isValidApiKey(apiKey)) {
        return res.status(401).json({ message: 'Unauthorized: Invalid API Key' });
    }
    next();
}

module.exports = {
    apiKeyAuth,
    addApiKey,
    revokeApiKey,
    isValidApiKey,
    API_KEY_TTL_MS
};
