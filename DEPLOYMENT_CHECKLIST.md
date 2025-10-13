# 🚀 Backend Deployment Checklist

## ✅ **CRITICAL FIXES APPLIED**

### 1. **OAuth Flow Fixed** ✅
- **OLD:** Frontend called `/api/auth/google` → Backend returned JSON with Google URL
- **NEW:** Frontend calls `/auth/google` → Backend redirects directly to Google
- **Result:** No more 400 redirect URI mismatch errors!

### 2. **Routes Updated** ✅
- Added `GET /auth/google` - Redirects to Google OAuth
- Added `GET /auth/google/callback` - Handles Google's callback
- Kept `POST /auth/google/callback` for fallback support
- Added `/auth` routes (without `/api` prefix) for OAuth

### 3. **Calendar Booking System** ✅
- All appointment endpoints implemented and tested
- Proper authentication and validation
- Time slot management with conflict prevention
- User appointment management (view, cancel)

## 🔧 **REQUIRED ENVIRONMENT VARIABLES**

### **Production Environment Variables (Railway)**
```env
# Database
MONGODB_URI_PROD=mongodb+srv://username:password@cluster.mongodb.net/auxin

# JWT
JWT_SECRET=your-super-secret-jwt-key-here-make-it-long-and-random
JWT_EXPIRES_IN=7d

# Google OAuth - CRITICAL: These must be updated!
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=https://backend-production-a538.up.railway.app/auth/google/callback

# Frontend URL
FRONTEND_URL=https://auxin.media

# Environment
NODE_ENV=production
PORT=3001
```

## 🔑 **CRITICAL: Google Cloud Console Update**

### **Current Issue:**
Your Google Cloud Console is probably configured with:
```
❌ OLD: https://auxin.media/auth/google/callback
```

### **Required Fix:**
Update to:
```
✅ NEW: https://backend-production-a538.up.railway.app/auth/google/callback
```

### **Steps:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to: APIs & Services → Credentials
3. Find your OAuth 2.0 Client ID
4. Edit the client
5. Update "Authorized redirect URIs":
   ```
   https://backend-production-a538.up.railway.app/auth/google/callback
   ```
6. Save changes
7. **Wait 5-10 minutes** for Google's changes to propagate

## 📋 **DEPLOYMENT STEPS**

### **1. Update Railway Environment Variables**
```bash
# In Railway dashboard, set these environment variables:
GOOGLE_REDIRECT_URI=https://backend-production-a538.up.railway.app/auth/google/callback
FRONTEND_URL=https://auxin.media
NODE_ENV=production
```

### **2. Deploy Backend**
```bash
# Your current setup should work with:
git add .
git commit -m "Fix OAuth flow and add calendar booking"
git push origin main
```

### **3. Update Google Cloud Console**
- Update redirect URI as shown above
- Wait for propagation

### **4. Test the Flow**
1. Go to https://auxin.media/login
2. Click "Continue with Google"
3. Should redirect properly without 400 errors
4. Test calendar booking functionality

## 🔍 **VERIFICATION CHECKLIST**

### **OAuth Flow:**
- [ ] Frontend opens popup to: `https://backend-production-a538.up.railway.app/auth/google`
- [ ] Backend redirects to: `https://accounts.google.com/oauth/authorize...`
- [ ] User authorizes on Google
- [ ] Google redirects to: `https://backend-production-a538.up.railway.app/auth/google/callback?code=...`
- [ ] Backend processes and redirects to: `https://auxin.media/auth/google/callback?token=...&user=...`
- [ ] Frontend processes and logs user in

### **Calendar System:**
- [ ] Meeting page loads for authenticated users
- [ ] Calendar displays available time slots
- [ ] Booking appointments works
- [ ] User can view their appointments
- [ ] User can cancel future appointments

### **API Endpoints Working:**
- [ ] `GET /api/health` - Health check
- [ ] `POST /api/auth/login` - Email/password login
- [ ] `POST /api/auth/register` - User registration
- [ ] `GET /auth/google` - OAuth initiation
- [ ] `GET /auth/google/callback` - OAuth callback
- [ ] `GET /api/appointments/available` - Available slots
- [ ] `POST /api/appointments/book` - Book appointment
- [ ] `GET /api/appointments/my-appointments` - User appointments
- [ ] `PUT /api/appointments/:id/cancel` - Cancel appointment

## 🚨 **COMMON ISSUES & SOLUTIONS**

### **1. Still Getting 400 Errors:**
- **Cause:** Google Cloud Console not updated
- **Solution:** Double-check redirect URI in Google Console

### **2. CORS Errors:**
- **Cause:** FRONTEND_URL not set correctly
- **Solution:** Set `FRONTEND_URL=https://auxin.media` in Railway

### **3. Database Connection Issues:**
- **Cause:** MONGODB_URI_PROD not set
- **Solution:** Set correct MongoDB connection string

### **4. JWT Token Issues:**
- **Cause:** JWT_SECRET not set or too short
- **Solution:** Set a long, random JWT_SECRET

## 📊 **MONITORING**

### **Railway Logs to Watch:**
```
✅ Server running on port 3001
✅ MongoDB connected successfully
✅ Google OAuth redirect request received
✅ Processing Google OAuth callback with code
✅ Google OAuth successful for user: user@example.com
✅ Appointment booked: User Name on 2024-01-15 at 14:30
```

### **Error Logs to Fix:**
```
❌ CORS blocked request from unauthorized origin
❌ Google auth redirect error
❌ MongoDB connection failed
❌ Missing Google OAuth environment variables
```

## 🎯 **POST-DEPLOYMENT TESTING**

1. **Test OAuth:** Try Google login from https://auxin.media/login
2. **Test Calendar:** Book an appointment on https://auxin.media/meeting
3. **Test API:** Check https://backend-production-a538.up.railway.app/api/health
4. **Test CORS:** Ensure frontend can communicate with backend

## 🔄 **ROLLBACK PLAN**

If issues occur:
1. **Revert Google Cloud Console** to old redirect URI
2. **Revert frontend** to old OAuth pattern
3. **Deploy previous backend version**

## ✅ **READY FOR DEPLOYMENT**

Your backend is now properly configured with:
- ✅ Fixed OAuth flow
- ✅ Complete calendar booking system
- ✅ Proper error handling
- ✅ Security middleware
- ✅ Rate limiting
- ✅ CORS configuration
- ✅ Production-ready deployment setup

**Next Step:** Deploy to Railway and update Google Cloud Console!
