# Auxin Media Backend API

Express.js backend API for Auxin Media application.

## Structure

```
backend/
├── src/
│   ├── lib/          # Utility libraries
│   │   ├── mongodb.ts    # Database connection
│   │   ├── jwt.ts        # JWT utilities
│   │   └── googleAuth.ts # Google OAuth
│   ├── models/       # Database models
│   │   └── User.ts       # User model
│   ├── routes/       # API routes
│   │   └── auth.ts       # Authentication routes
│   └── server.ts     # Main server file
├── dist/             # Compiled JavaScript (auto-generated)
├── package.json      # Backend dependencies
├── tsconfig.json     # TypeScript configuration
└── README.md         # This file
```

## Development

From the project root:

```bash
# Start backend only
npm run dev:server

# Start both frontend and backend
npm run dev:full
```

From the backend directory:

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Environment Variables

The backend uses environment variables from the root `.env` file:

- `PORT` - Server port (default: 3001)
- `FRONTEND_URL` - Frontend URL for CORS
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - JWT signing secret
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/google` - Google OAuth URL
- `POST /api/auth/google/callback` - Google OAuth callback
- `GET /api/auth/me` - Get current user
- `GET /api/health` - Health check
# Force redeploy
