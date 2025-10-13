import express from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { generateToken, verifyToken } from '../lib/jwt.js';
import { getGoogleAuthURL, getGoogleUserInfo } from '../lib/googleAuth.js';

const router = express.Router();

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
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists with this email' });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = new User({
      name,
      email,
      password: hashedPassword,
      isEmailVerified: false
    });

    await user.save();

    // Generate token
    const token = generateToken(user);

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
  } catch (error) {
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
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password!);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken(user);

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
  } catch (error) {
    console.error('Login error:', error);
    
    // Ensure we always return valid JSON
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Google OAuth - Redirect to Google (NEW PATTERN)
router.get('/google', (_req, res) => {
  try {
    console.log('🔍 Google OAuth redirect request received');
    console.log('🔍 Environment variables check:');
    console.log('🔍 GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? 'SET' : 'NOT SET');
    console.log('🔍 GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? 'SET' : 'NOT SET');
    console.log('🔍 GOOGLE_REDIRECT_URI:', process.env.GOOGLE_REDIRECT_URI);
    
    const authURL = getGoogleAuthURL();
    console.log('✅ Redirecting to Google OAuth URL');
    
    // Redirect directly to Google instead of returning JSON
    res.redirect(authURL);
  } catch (error) {
    console.error('Google auth redirect error:', error);
    const frontendURL = process.env.FRONTEND_URL || 'https://auxin.media';
    res.redirect(`${frontendURL}/auth/google/callback?error=${encodeURIComponent('Failed to initiate Google authentication')}`);
  }
});

// Google OAuth - Callback (GET route for Google's redirect)
router.get('/google/callback', async (req, res) => {
  try {
    const { code, error } = req.query;
    const frontendURL = process.env.FRONTEND_URL || 'https://auxin.media';

    if (error) {
      console.error('Google OAuth error:', error);
      return res.redirect(`${frontendURL}/auth/google/callback?error=${encodeURIComponent(error as string)}`);
    }

    if (!code) {
      console.error('No authorization code received from Google');
      return res.redirect(`${frontendURL}/auth/google/callback?error=${encodeURIComponent('No authorization code received')}`);
    }

    console.log('🔍 Processing Google OAuth callback with code');

    // Get user info from Google
    const googleUser = await getGoogleUserInfo(code as string);

    // Check if user exists
    let user = await User.findOne({ 
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
    } else {
      // Create new user
      user = new User({
        name: googleUser.name,
        email: googleUser.email,
        googleId: googleUser.googleId,
        avatar: googleUser.avatar,
        isEmailVerified: true
      });

      await user.save();
    }

    // Generate token
    const token = generateToken(user);

    console.log('✅ Google OAuth successful for user:', user.email);

    // Redirect back to frontend with user data and token
    const userData = encodeURIComponent(JSON.stringify({
      id: user._id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      isEmailVerified: user.isEmailVerified
    }));
    
    res.redirect(`${frontendURL}/auth/google/callback?token=${token}&user=${userData}`);

  } catch (error) {
    console.error('Google callback error:', error);
    const frontendURL = process.env.FRONTEND_URL || 'https://auxin.media';
    res.redirect(`${frontendURL}/auth/google/callback?error=${encodeURIComponent('Authentication failed')}`);
  }
});

// Google OAuth - Callback (POST route for fallback/legacy support)
router.post('/google/callback', async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Authorization code is required' });
    }

    // Get user info from Google
    const googleUser = await getGoogleUserInfo(code);

    // Check if user exists
    let user = await User.findOne({ 
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
    } else {
      // Create new user
      user = new User({
        name: googleUser.name,
        email: googleUser.email,
        googleId: googleUser.googleId,
        avatar: googleUser.avatar,
        isEmailVerified: true
      });

      await user.save();
    }

    // Generate token
    const token = generateToken(user);

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
  } catch (error) {
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
    const decoded = verifyToken(token);

    const user = await User.findById(decoded.userId);
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
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Logout (client-side token removal)
router.post('/logout', (_req, res) => {
  res.json({ message: 'Logout successful' });
});

export default router;
