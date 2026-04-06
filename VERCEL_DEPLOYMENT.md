# Vercel Deployment Guide - Langgam-It Frontend

## Quick Start

### Prerequisites
- GitHub account with the langgam-it repository
- Vercel account (free tier available)
- Backend API running at: `https://langgam-it-backend.onrender.com/api`

---

## Step 1: Connect Repository to Vercel

### Option A: Using Vercel Dashboard (Recommended)

1. Go to [vercel.com](https://vercel.com)
2. Sign in with GitHub
3. Click **"Add New..."** → **"Project"**
4. Select your **langgam-it** repository
5. Click **"Import"**

### Option B: Using Vercel CLI

```bash
npm install -g vercel
cd langgam-it
vercel
```

Follow the prompts to connect your GitHub account and project.

---

## Step 2: Configure Build Settings

Vercel should auto-detect the configuration, but verify:

**Build Command:**
```
npm run build
```

**Output Directory:**
```
apps/web/dist
```

**Framework Preset:**
```
Vite
```

**Node Version:**
```
20.x (or latest)
```

---

## Step 3: Set Environment Variables

### In Vercel Dashboard:

1. Go to your project → **Settings** → **Environment Variables**
2. Add the following variable:

| Name | Value | Environments |
|------|-------|--------------|
| `VITE_API_URL` | `https://langgam-it-backend.onrender.com/api` | Production, Preview, Development |

**Important:** The variable name MUST start with `VITE_` for Vite to pick it up during build time.

### Alternative: Using Vercel CLI

```bash
vercel env add VITE_API_URL
# Enter: https://langgam-it-backend.onrender.com/api
# Select: Production, Preview, Development
```

---

## Step 4: Deploy

### Automatic Deployment (Recommended)

Once connected to GitHub, Vercel automatically deploys on every push to `main`:

```bash
git add .
git commit -m "Deploy to Vercel"
git push origin main
```

Vercel will:
1. Detect the push
2. Build the project
3. Run tests (if configured)
4. Deploy to production

### Manual Deployment

```bash
vercel --prod
```

---

## Step 5: Verify Deployment

1. **Check Vercel Dashboard:**
   - Go to your project on vercel.com
   - Look for a green checkmark next to the latest deployment
   - Click the deployment to see logs

2. **Test the Live URL:**
   - Vercel provides a URL like: `https://langgam-it.vercel.app`
   - Open it in your browser
   - Try logging in with test credentials

3. **Check API Connection:**
   - Open browser DevTools (F12)
   - Go to Network tab
   - Try logging in
   - Verify API calls go to `https://langgam-it-backend.onrender.com/api`

---

## Environment Variables Reference

### Development (Local)
```env
# .env.development
VITE_API_URL=http://localhost:8000/api
```

### Production (Vercel)
```env
# .env.production
VITE_API_URL=https://langgam-it-backend.onrender.com/api
```

### Vercel Dashboard
```
VITE_API_URL=https://langgam-it-backend.onrender.com/api
```

---

## Troubleshooting

### Build Fails with "Cannot find module"

**Problem:** Build fails with module not found errors

**Solution:**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

### API Calls Return 404

**Problem:** Frontend can't reach backend API

**Solution:**
1. Verify `VITE_API_URL` is set correctly in Vercel dashboard
2. Check backend is running: `curl https://langgam-it-backend.onrender.com/api/auth/me/`
3. Verify CORS is configured on backend
4. Check browser console for exact error

### Blank Page or 404 Errors

**Problem:** Deployed site shows blank page

**Solution:**
1. Check Vercel build logs for errors
2. Verify `vercel.json` has correct `outputDirectory`
3. Clear browser cache: `Ctrl+Shift+Delete`
4. Check browser console for JavaScript errors

### Environment Variables Not Loading

**Problem:** `VITE_API_URL` is undefined in production

**Solution:**
1. Verify variable name starts with `VITE_`
2. Redeploy after adding environment variable
3. Check variable is set for "Production" environment
4. Rebuild: Click **"Redeploy"** in Vercel dashboard

### CORS Errors

**Problem:** "Access to XMLHttpRequest blocked by CORS policy"

**Solution:**
1. Backend must have CORS configured
2. Add frontend URL to CORS_ALLOWED_ORIGINS:
   ```python
   CORS_ALLOWED_ORIGINS = [
       "https://langgam-it.vercel.app",
       "https://*.vercel.app",  # All Vercel preview deployments
   ]
   ```
3. Redeploy backend

---

## Performance Optimization

### Enable Caching

In `vercel.json`:
```json
{
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

### Monitor Performance

1. Go to **Analytics** in Vercel dashboard
2. Check Core Web Vitals
3. Monitor response times

---

## Custom Domain (Optional)

### Add Custom Domain

1. Go to project **Settings** → **Domains**
2. Click **"Add Domain"**
3. Enter your domain (e.g., `langgam-it.com`)
4. Follow DNS configuration instructions
5. Wait for DNS propagation (5-48 hours)

### Update Backend CORS

If using custom domain, update backend:
```python
CORS_ALLOWED_ORIGINS = [
    "https://langgam-it.com",
    "https://www.langgam-it.com",
]
```

---

## Monitoring & Logs

### View Build Logs

1. Go to project → **Deployments**
2. Click on a deployment
3. Click **"Build Logs"** tab

### View Runtime Logs

1. Go to project → **Deployments**
2. Click on a deployment
3. Click **"Runtime Logs"** tab

### Monitor Errors

1. Go to project → **Monitoring**
2. Check for errors and performance issues
3. Set up alerts if needed

---

## Rollback to Previous Deployment

1. Go to **Deployments**
2. Find the previous working deployment
3. Click **"..."** → **"Promote to Production"**

---

## CI/CD Pipeline

### Automatic Testing (Optional)

Add to `vercel.json`:
```json
{
  "buildCommand": "npm run build && npm run test",
  "testCommand": "npm run test"
}
```

### Preview Deployments

Every pull request automatically gets a preview deployment:
- URL: `https://langgam-it-pr-123.vercel.app`
- Test changes before merging to main
- Automatic cleanup after PR is closed

---

## Security Checklist

- [x] Environment variables are set in Vercel dashboard (not in code)
- [x] Backend API URL uses HTTPS
- [x] CORS is properly configured on backend
- [x] No sensitive data in `.env.production` file
- [x] Git repository is private (if needed)
- [x] Vercel project is private (if needed)

---

## Useful Commands

```bash
# View current environment variables
vercel env ls

# Add environment variable
vercel env add VITE_API_URL

# Remove environment variable
vercel env rm VITE_API_URL

# View deployment status
vercel status

# Redeploy latest commit
vercel --prod

# View logs
vercel logs

# Open project dashboard
vercel open
```

---

## Support & Resources

- **Vercel Docs:** https://vercel.com/docs
- **Vite Docs:** https://vitejs.dev
- **Environment Variables:** https://vercel.com/docs/concepts/projects/environment-variables
- **Troubleshooting:** https://vercel.com/support

---

## Next Steps

1. ✅ Connect repository to Vercel
2. ✅ Set environment variables
3. ✅ Deploy to production
4. ✅ Test API connection
5. ✅ Monitor performance
6. ✅ Set up custom domain (optional)
7. ✅ Configure monitoring & alerts (optional)

Your Langgam-It frontend is now live on Vercel! 🚀
