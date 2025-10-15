import mongoose from 'mongoose';

console.log("DEBUG => Loaded Mongo URI:", process.env.MONGODB_URI_PROD);

const getMongoURI = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Try multiple environment variable names for flexibility
  const MONGODB_URI = process.env.MONGODB_URI || 
                     process.env.MONGODB_URI_PROD || 
                     process.env.DATABASE_URL ||
                     process.env.MONGO_URI;

  console.log(`🔍 Environment: ${process.env.NODE_ENV}`);
  console.log(`🔍 Looking for MongoDB URI in: MONGODB_URI, MONGODB_URI_PROD, DATABASE_URL, MONGO_URI`);
  
  if (!MONGODB_URI) {
    throw new Error(
      `❌ Missing MongoDB connection string!\n` +
      `Please define one of these environment variables:\n` +
      `- MONGODB_URI (recommended)\n` +
      `- MONGODB_URI_PROD\n` +
      `- DATABASE_URL\n` +
      `- MONGO_URI\n` +
      `Example: MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority`
    );
  }

  // Mask the password in logs for security
  const maskedURI = MONGODB_URI.replace(/:([^:@]{1,}@)/, ':****@');
  console.log(`🔗 MongoDB URI: ${maskedURI}`);
  
  return MONGODB_URI;
};

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongoose: MongooseCache | undefined;
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached!.conn) {
    console.log('♻️  Using existing MongoDB connection');
    return cached!.conn;
  }

  if (!cached!.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 10000, // 10 seconds
      socketTimeoutMS: 45000, // 45 seconds
      maxPoolSize: 10,
      minPoolSize: 5,
    };

    const MONGODB_URI = getMongoURI();
    console.log('🔄 Connecting to MongoDB...');
    
    cached!.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      console.log('✅ Successfully connected to MongoDB');
      console.log(`📊 Database: ${mongoose.connection.name}`);
      console.log(`🌐 Host: ${mongoose.connection.host}`);
      return mongoose;
    }).catch((error) => {
      console.error('❌ MongoDB connection failed:', error.message);
      
      // Provide helpful error messages for common issues
      if (error.message.includes('ENOTFOUND')) {
        console.error('💡 This usually means:');
        console.error('   1. Check your MongoDB connection string');
        console.error('   2. Ensure your IP is whitelisted in MongoDB Atlas');
        console.error('   3. Verify your internet connection');
      } else if (error.message.includes('authentication failed')) {
        console.error('💡 Authentication failed - check your username/password');
      } else if (error.message.includes('timeout')) {
        console.error('💡 Connection timeout - check your network or MongoDB Atlas status');
      }
      
      throw error;
    });
  }

  try {
    cached!.conn = await cached!.promise;
  } catch (e) {
    cached!.promise = null;
    throw e;
  }

  return cached!.conn;
}

export default connectDB;
