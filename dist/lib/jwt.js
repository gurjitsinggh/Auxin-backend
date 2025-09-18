import jwt from 'jsonwebtoken';
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
// Ensure JWT_SECRET is a string
const secretKey = typeof JWT_SECRET === 'string' ? JWT_SECRET : 'fallback-secret-key';
export const generateToken = (user) => {
    const payload = {
        userId: user._id,
        email: user.email
    };
    const options = {
        expiresIn: JWT_EXPIRES_IN
    };
    return jwt.sign(payload, secretKey, options);
};
export const verifyToken = (token) => {
    try {
        return jwt.verify(token, secretKey);
    }
    catch (error) {
        throw new Error('Invalid or expired token');
    }
};
export const generateRefreshToken = (user) => {
    const payload = {
        userId: user._id,
        type: 'refresh'
    };
    const options = {
        expiresIn: '30d'
    };
    return jwt.sign(payload, secretKey, options);
};
// Decode JWT token without verification (for debugging/inspection)
export const decodeToken = (token) => {
    try {
        return jwt.decode(token);
    }
    catch (error) {
        console.error('Error decoding token:', error);
        return null;
    }
};
// Check if token is expired (without verification)
export const isTokenExpired = (token) => {
    try {
        const decoded = jwt.decode(token);
        if (!decoded || !decoded.exp)
            return true;
        const currentTime = Math.floor(Date.now() / 1000);
        return decoded.exp < currentTime;
    }
    catch (error) {
        return true;
    }
};
// Get token expiration date
export const getTokenExpiration = (token) => {
    try {
        const decoded = jwt.decode(token);
        if (!decoded || !decoded.exp)
            return null;
        return new Date(decoded.exp * 1000);
    }
    catch (error) {
        return null;
    }
};
//# sourceMappingURL=jwt.js.map