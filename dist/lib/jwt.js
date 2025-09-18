"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTokenExpiration = exports.isTokenExpired = exports.decodeToken = exports.generateRefreshToken = exports.verifyToken = exports.generateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
// Ensure JWT_SECRET is a string
const secretKey = typeof JWT_SECRET === 'string' ? JWT_SECRET : 'fallback-secret-key';
const generateToken = (user) => {
    const payload = {
        userId: user._id,
        email: user.email
    };
    const options = {
        expiresIn: JWT_EXPIRES_IN
    };
    return jsonwebtoken_1.default.sign(payload, secretKey, options);
};
exports.generateToken = generateToken;
const verifyToken = (token) => {
    try {
        return jsonwebtoken_1.default.verify(token, secretKey);
    }
    catch (error) {
        throw new Error('Invalid or expired token');
    }
};
exports.verifyToken = verifyToken;
const generateRefreshToken = (user) => {
    const payload = {
        userId: user._id,
        type: 'refresh'
    };
    const options = {
        expiresIn: '30d'
    };
    return jsonwebtoken_1.default.sign(payload, secretKey, options);
};
exports.generateRefreshToken = generateRefreshToken;
// Decode JWT token without verification (for debugging/inspection)
const decodeToken = (token) => {
    try {
        return jsonwebtoken_1.default.decode(token);
    }
    catch (error) {
        console.error('Error decoding token:', error);
        return null;
    }
};
exports.decodeToken = decodeToken;
// Check if token is expired (without verification)
const isTokenExpired = (token) => {
    try {
        const decoded = jsonwebtoken_1.default.decode(token);
        if (!decoded || !decoded.exp)
            return true;
        const currentTime = Math.floor(Date.now() / 1000);
        return decoded.exp < currentTime;
    }
    catch (error) {
        return true;
    }
};
exports.isTokenExpired = isTokenExpired;
// Get token expiration date
const getTokenExpiration = (token) => {
    try {
        const decoded = jsonwebtoken_1.default.decode(token);
        if (!decoded || !decoded.exp)
            return null;
        return new Date(decoded.exp * 1000);
    }
    catch (error) {
        return null;
    }
};
exports.getTokenExpiration = getTokenExpiration;
//# sourceMappingURL=jwt.js.map