# Frontend Production Configuration Summary

## ✅ Current Setup Status

### API Configuration
- **API Client**: `apps/web/src/api/client.ts`
- **Base URL**: Reads from `VITE_API_URL` environment variable
- **Fallback**: `http://localhost:8000/api` (if env var not set)
- **Status**: ✅ **CORRECTLY CONFIGURED**

### Environment Files
```
apps/web/
├── .env.development          → VITE_API_URL=http://localhost:8000/api
├── .env.production           → VITE_API_URL=https://langgam-it-backend.onrender.com/api
└── .env.example              → Template for developers
```

### Vite Configuration
- **Build Tool**: Vite (React + TypeScript)
- **Output Directory**: `apps/web/dist`
- **Framework**: Vite (configured in vercel.json)
- **Status**: ✅ **CORRECTLY CONFIGURED**

### Vercel Configuration
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "apps/web/dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```
- **Status**: ✅ **CORRECTLY CONFIGURED**
- **SPA Routing**: ✅ Enabled (all routes redirect to index.html)

---

## 🔧 How It Works

### Development Flow
1. Developer runs `npm run dev`
2. Vite loads `.env.development` (or `.env.local`)
3. Frontend connects to `http://localhost:8000/api`
4. Backend must be running locally on port 8000

### Production Flow (Vercel)
1. Code pushed to GitHub
2. Vercel triggers build with `npm run build`
3. Vite loads `.env.production` (or environment variables from Vercel dashboard)
4. Frontend connects to `https://langgam-it-backend.onrender.com/api`
5. Built files deployed to Vercel CDN

---

## 📋 Environment Variables

### VITE_API_URL
- **Purpose**: Backend API base URL
- **Development**: `http://localhost:8000/api`
- **Production**: `https://langgam-it-backend.onrender.com/api`
- **Fallback**: `http://localhost:8000/api`

### How Vite Reads Environment Variables
```typescript
// apps/web/src/api/client.ts
const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";
```

**Important**: Only variables prefixed with `VITE_` are exposed to the frontend for security.

---

## 🚀 Deployment Checklist

### Before Deploying to Vercel
- [ ] Backend is deployed and accessible at `https://langgam-it-backend.onrender.com/api`
- [ ] Backend CORS is configured to allow frontend domain
- [ ] `.env.production` has correct `VITE_API_URL`
- [ ] Local build works: `npm run build`
- [ ] No TypeScript errors: `npm run typecheck`

### Vercel Dashboard Setup
1. **Connect Repository**: GitHub repo linked to Vercel
2. **Environment Variables**: Set in Vercel dashboard
   - Key: `VITE_API_URL`
   - Value: `https://langgam-it-backend.onrender.com/api`
3. **Build Settings**:
   - Build Command: `npm run build`
   - Output Directory: `apps/web/dist`
   - Framework: Vite
4. **Deploy**: Push to main branch or manually trigger

---

## 🔍 Verification Steps

### Check Frontend Configuration
```bash
# 1. Verify .env.production exists
cat apps/web/.env.production

# 2. Build locally
npm run build

# 3. Check dist folder was created
ls -la apps/web/dist/

# 4. Verify API URL in built files
grep -r "langgam-it-backend.onrender.com" apps/web/dist/
```

### Check API Connectivity
```bash
# 1. Test backend is accessible
curl https://langgam-it-backend.onrender.com/api/

# 2. Test CORS headers
curl -H "Origin: https://your-frontend-domain.vercel.app" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     https://langgam-it-backend.onrender.com/api/auth/login/
```

### Check Vercel Deployment
1. Go to Vercel dashboard
2. Check deployment logs for errors
3. Visit frontend URL and check browser console
4. Test login to verify API connection

---

## 🐛 Troubleshooting

### Issue: "Failed to fetch" or CORS errors
**Cause**: Frontend can't reach backend API

**Solutions**:
1. Verify `VITE_API_URL` in Vercel environment variables
2. Check backend is running and accessible
3. Verify backend CORS configuration includes frontend domain
4. Check browser console for exact error message

### Issue: "401 Unauthorized" after login
**Cause**: JWT token issues

**Solutions**:
1. Clear browser localStorage: `localStorage.clear()`
2. Log out and log back in
3. Check backend token expiration settings
4. Verify refresh token endpoint is working

### Issue: Blank page or 404 errors
**Cause**: SPA routing not configured

**Solutions**:
1. Verify `vercel.json` has rewrites configured
2. Check `dist/index.html` exists
3. Verify build completed successfully

### Issue: Environment variables not loading
**Cause**: Variable name or location issue

**Solutions**:
1. Ensure variable name starts with `VITE_`
2. Restart dev server after changing `.env` file
3. Rebuild after changing `.env.production`
4. Check `.env` file is in `apps/web/` directory

---

## 📊 Current Production URLs

| Component | URL | Status |
|-----------|-----|--------|
| Frontend | https://langgam-it-by-keybeen.vercel.app | 🟢 Deployed |
| Backend | https://langgam-it-backend.onrender.com | 🟢 Deployed |
| API Base | https://langgam-it-backend.onrender.com/api | 🟢 Configured |

---

## 🔐 Security Notes

1. **HTTPS Only**: All production URLs use HTTPS
2. **Environment Variables**: Sensitive data stored in Vercel dashboard, not in code
3. **CORS**: Backend configured to accept requests from frontend domain
4. **JWT Tokens**: Stored in localStorage, sent with every API request
5. **Token Refresh**: Automatic refresh on 401 response

---

## 📝 API Client Features

The frontend API client (`apps/web/src/api/client.ts`) includes:

1. **Automatic Token Attachment**: Adds JWT token to every request
2. **Token Refresh**: Automatically refreshes expired tokens
3. **Request Queuing**: Queues requests while token is being refreshed
4. **Error Handling**: Redirects to login on 401 after refresh fails
5. **Axios Interceptors**: Request and response interceptors for auth flow

---

## 🎯 Next Steps

1. **Verify Backend Deployment**
   - Ensure backend is running on Render
   - Test API endpoints with curl or Postman

2. **Configure Vercel Environment**
   - Set `VITE_API_URL` in Vercel dashboard
   - Trigger new deployment

3. **Test Production Connection**
   - Visit frontend URL
   - Open browser console
   - Attempt login
   - Check network requests to backend

4. **Monitor Deployment**
   - Check Vercel logs for errors
   - Monitor backend logs for API requests
   - Test all features in production

---

## 📚 Related Files

- **API Client**: `apps/web/src/api/client.ts`
- **Auth Store**: `apps/web/src/store/authStore.ts`
- **Vite Config**: `apps/web/vite.config.ts`
- **Vercel Config**: `vercel.json`
- **Environment Files**: `apps/web/.env.*`
- **Deployment Guide**: `DEPLOYMENT_GUIDE.md`

