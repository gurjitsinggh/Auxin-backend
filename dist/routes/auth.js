"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const User_1 = __importDefault(require("../models/User"));
const jwt_1 = require("../lib/jwt");
const googleAuth_1 = require("../lib/googleAuth");
const router = express_1.default.Router();
// Register
router.post('/register', async (req, res) => {
    try {
        console.log('Register request received:', { name: req.body.name, email: req.body.email, password: '***' });
        const { name, email, password } = req.body;
        // Validation
        if (!name || !email || !password) {
            console.log('Validation failed: missing fields');
            return res.status(400).json({ error: 'All fields are required' });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }
        // Check if user already exists
        const existingUser = await User_1.default.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists with this email' });
        }
        // Hash password
        const saltRounds = 12;
        const hashedPassword = await bcryptjs_1.default.hash(password, saltRounds);
        // Create user
        const user = new User_1.default({
            name,
            email,
            password: hashedPassword,
            isEmailVerified: false
        });
        await user.save();
        // Generate token
        const token = (0, jwt_1.generateToken)(user);
        res.status(201).json({
            message: 'User created successfully',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                isEmailVerified: user.isEmailVerified
            }
        });
    }
    catch (error) {
        console.error('Registration error:', error);
        if (error instanceof Error) {
            console.error('Error stack:', error.stack);
        }
        // Ensure we always return valid JSON
        if (!res.headersSent) {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});
// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        // Find user and include password
        const user = await User_1.default.findOne({ email }).select('+password');
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        // Check password
        const isPasswordValid = await bcryptjs_1.default.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        // Generate token
        const token = (0, jwt_1.generateToken)(user);
        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                isEmailVerified: user.isEmailVerified
            }
        });
    }
    catch (error) {
        console.error('Login error:', error);
        // Ensure we always return valid JSON
        if (!res.headersSent) {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});
// Google OAuth - Get auth URL
router.get('/google', (_req, res) => {
    try {
        const authURL = (0, googleAuth_1.getGoogleAuthURL)();
        res.json({ authURL });
    }
    catch (error) {
        console.error('Google auth URL error:', error);
        res.status(500).json({ error: 'Failed to generate Google auth URL' });
    }
});
// Google OAuth - Callback
router.post('/google/callback', async (req, res) => {
    try {
        const { code } = req.body;
        if (!code) {
            return res.status(400).json({ error: 'Authorization code is required' });
        }
        // Get user info from Google
        const googleUser = await (0, googleAuth_1.getGoogleUserInfo)(code);
        // Check if user exists
        let user = await User_1.default.findOne({
            $or: [
                { email: googleUser.email },
                { googleId: googleUser.googleId }
            ]
        });
        if (user) {
            // Update existing user with Google ID if not set
            if (!user.googleId) {
                user.googleId = googleUser.googleId;
                user.avatar = googleUser.avatar;
                await user.save();
            }
        }
        else {
            // Create new user
            user = new User_1.default({
                name: googleUser.name,
                email: googleUser.email,
                googleId: googleUser.googleId,
                avatar: googleUser.avatar,
                isEmailVerified: true
            });
            await user.save();
        }
        // Generate token
        const token = (0, jwt_1.generateToken)(user);
        res.json({
            message: 'Google authentication successful',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                isEmailVerified: user.isEmailVerified
            }
        });
    }
    catch (error) {
        console.error('Google callback error:', error);
        res.status(500).json({ error: 'Google authentication failed' });
    }
});
// Verify token
router.get('/verify', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }
        const token = authHeader.substring(7);
        const decoded = (0, jwt_1.verifyToken)(token);
        const user = await User_1.default.findById(decoded.userId);
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }
        res.json({
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                isEmailVerified: user.isEmailVerified
            }
        });
    }
    catch (error) {
        console.error('Token verification error:', error);
        res.status(401).json({ error: 'Invalid token' });
    }
});
// Logout (client-side token removal)
router.post('/logout', (_req, res) => {
    res.json({ message: 'Logout successful' });
});
exports.default = router;
//# sourceMappingURL=auth.js.map