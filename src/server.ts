// Load environment variables FIRST
import dotenv from 'dotenv';
dotenv.config({ quiet: true });

import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import xss from 'xss';
import connectDB from './lib/mongodb.js';
import authRoutes from './routes/auth.js';

const app = express();
const PORT = process.env.PORT || 3001;

// CORS Security Configuration
const isProduction = process.env.NODE_ENV === 'production';

const allowedOrigins = [
  // Always include the configured frontend URL
  process.env.FRONTEND_URL || (isProduction ? 'https://auxin.media' : 'http://localhost:5173'),
  // Only include development origins in non-production
  ...(isProduction ? [] : ['http://localhost:3000', 'http://localhost:5173']),
  // Add any additional production domains
  ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : []),
  // Explicitly include auxin.media for production
  ...(isProduction ? ['https://auxin.media'] : [])
].filter(Boolean); // Remove null values

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if the origin is in our allowed list
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`🚫 CORS blocked request from unauthorized origin: ${origin}`);
      callback(new Error('Not allowed by CORS - Unauthorized origin'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With', 
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
    'Pragma'
  ],
  exposedHeaders: ['Set-Cookie'],
  maxAge: 86400, // 24 hours
  optionsSuccessStatus: 200 // Some legacy browsers choke on 204
};

app.use(cors(corsOptions));

// Use Helmet for enhanced security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // May interfere with some APIs
}));

// Additional Security Headers
app.use((req, res, next) => {
  // Remove server info
  res.removeHeader('X-Powered-By');
  
  // Prevent caching of sensitive endpoints
  if (req.path.includes('/api/auth')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  
  next();
});

// XSS Protection Middleware
app.use((req, res, next) => {
  if (req.body) {
    // Recursively sanitize all string values in req.body
    const sanitizeObject = (obj: any): any => {
      if (typeof obj === 'string') {
        return xss(obj);
      } else if (Array.isArray(obj)) {
        return obj.map(sanitizeObject);
      } else if (obj && typeof obj === 'object') {
        const sanitized: any = {};
        for (const key in obj) {
          sanitized[key] = sanitizeObject(obj[key]);
        }
        return sanitized;
      }
      return obj;
    };
    
    req.body = sanitizeObject(req.body);
  }
  next();
});

// Request size limiting and JSON parsing with validation
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    try {
      JSON.parse(buf.toString());
    } catch (e) {
      // Note: We can't use res.status() here as this is raw HTTP response
      // The error will be caught by Express and handled appropriately
      throw new Error('Invalid JSON payload');
    }
  }
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb',
  parameterLimit: 1000
}));

// Rate Limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skipSuccessfulRequests: false, // Don't count successful requests
  skipFailedRequests: false, // Don't count failed requests
});

// Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 auth requests per windowMs
  message: {
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
});

// Apply general rate limiting to all requests
app.use(generalLimiter);

// Connect to MongoDB
connectDB();

// Routes
app.use('/api/auth', authLimiter, authRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  console.error('Error stack:', err.stack);
  
  // Ensure we always return valid JSON
  if (!res.headersSent) {
    res.status(500).json({ 
      error: 'Something went wrong!',
      message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
  }
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  const environment = process.env.NODE_ENV || 'development';
  const frontendUrl = process.env.FRONTEND_URL || (isProduction ? 'NOT SET' : 'http://localhost:5173');
  
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Frontend URL: ${frontendUrl}`);
  console.log(`🌍 Environment: ${environment}`);
  
  if (isProduction) {
    console.log(`🔒 CORS Origins: ${allowedOrigins.join(', ')}`);
    console.log(`🗄️  Database: Using MONGODB_URI_PROD`);
    if (!process.env.FRONTEND_URL) {
      console.warn(`⚠️  WARNING: FRONTEND_URL not set in production!`);
    }
  } else {
    console.log(`🔓 Development mode - allowing localhost origins`);
    console.log(`🗄️  Database: Using MONGODB_URI`);
  }
});

export default app;
