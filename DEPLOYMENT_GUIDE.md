# Deployment Guide - Langgam-It Frontend

## Overview

The Langgam-It frontend is a Vite + React application that communicates with a Django REST API backend. It's configured to work with both local development and production environments.

## Environment Configuration

### Development Setup

1. **Create `.env.local` file** in `apps/web/`:

```bash
cd apps/web
cp .env.example .env.local
```

2. **Edit `.env.local`** for your local setup:

```env
# For local development (default)
VITE_API_URL=http://localhost:8000/api
```

3. **Start the development server**:

```bash
npm run dev
# or
pnpm dev
```

The app will be available at `http://localhost:5173` (or the port Vite assigns).

### Production Deployment

#### Option 1: Same Domain (Recommended)

If your backend and frontend are on the same domain:

1. **Create `.env.production`** in `apps/web/`:

```env
VITE_API_URL=https://yourdomain.com/api
```

2. **Build the frontend**:

```bash
npm run build
# or
pnpm build
```

3. **Deploy the `dist/` folder** to your web server (Nginx, Apache, Vercel, etc.)

#### Option 2: Different Domains (CORS Required)

If your backend is on a different domain:

1. **Create `.env.production`** in `apps/web/`:

```env
VITE_API_URL=https://api.yourdomain.com/api
```

2. **Configure CORS on your Django backend**:

```python
# settings.py
INSTALLED_APPS = [
    # ...
    'corsheaders',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    # ... other middleware
]

CORS_ALLOWED_ORIGINS = [
    "https://yourdomain.com",
    "https://www.yourdomain.com",
    "http://localhost:5173",  # for local development
]

CORS_ALLOW_CREDENTIALS = True
```

3. **Build and deploy** as described above.

## Environment Variables

### Available Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `http://localhost:8000/api` | Backend API base URL |

### How It Works

The frontend uses Vite's environment variable system:

- **Development**: Uses `.env.local` or `.env.development`
- **Production**: Uses `.env.production` or `.env`
- **Fallback**: Defaults to `http://localhost:8000/api` if not set

The API client reads this at runtime:

```typescript
// apps/web/src/api/client.ts
const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";
```

## Deployment Platforms

### Vercel

1. **Connect your repository** to Vercel
2. **Set environment variables** in Vercel dashboard:
   - `VITE_API_URL=https://your-api-domain.com/api`
3. **Deploy** - Vercel automatically builds and deploys

### Netlify

1. **Connect your repository** to Netlify
2. **Set build settings**:
   - Build command: `npm run build` (or `pnpm build`)
   - Publish directory: `apps/web/dist`
3. **Set environment variables**:
   - `VITE_API_URL=https://your-api-domain.com/api`
4. **Deploy** - Netlify automatically builds and deploys

### Docker

Create a `Dockerfile` in the root:

```dockerfile
# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_API_URL=http://localhost:8000/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

Build and run:

```bash
docker build --build-arg VITE_API_URL=https://api.yourdomain.com/api -t langgam-it-frontend .
docker run -p 80:80 langgam-it-frontend
```

### Traditional Server (Nginx)

1. **Build the frontend**:

```bash
npm run build
```

2. **Copy `dist/` to your server**:

```bash
scp -r apps/web/dist user@server:/var/www/langgam-it
```

3. **Configure Nginx**:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    root /var/www/langgam-it;
    index index.html;

    # SPA routing - serve index.html for all routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy (optional - if on same server)
    location /api/ {
        proxy_pass http://localhost:8000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # SSL (recommended)
    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
}
```

## API Configuration

### Local Development

The frontend defaults to `http://localhost:8000/api`. Make sure your Django backend is running:

```bash
# In your Django project
python manage.py runserver 0.0.0.0:8000
```

### Production

Ensure your backend API is:
1. **Accessible** from your frontend domain
2. **CORS configured** if on different domains
3. **HTTPS enabled** for security
4. **Properly authenticated** with JWT tokens

## Troubleshooting

### "Failed to fetch" or CORS errors

**Problem**: Frontend can't reach the backend API

**Solutions**:
1. Check `VITE_API_URL` is correct in your `.env` file
2. Verify backend is running and accessible
3. Check CORS configuration on backend
4. Ensure HTTPS is used in production
5. Check browser console for exact error message

### "401 Unauthorized" errors

**Problem**: Authentication tokens are invalid or expired

**Solutions**:
1. Clear browser localStorage: `localStorage.clear()`
2. Log out and log back in
3. Check backend token expiration settings
4. Verify refresh token endpoint is working

### Blank page or 404 errors

**Problem**: Frontend builds but shows blank page

**Solutions**:
1. Check browser console for JavaScript errors
2. Verify `dist/` folder was deployed correctly
3. Check Nginx/server routing configuration
4. Ensure `index.html` is served for all routes (SPA routing)

### Environment variables not loading

**Problem**: `VITE_API_URL` is not being read

**Solutions**:
1. Ensure variable name starts with `VITE_`
2. Restart dev server after changing `.env` file
3. Rebuild production build after changing `.env.production`
4. Check `.env` file is in correct directory (`apps/web/`)

## Security Checklist

- [ ] Use HTTPS in production
- [ ] Set `VITE_API_URL` to your production backend
- [ ] Configure CORS properly on backend
- [ ] Enable CSRF protection on backend
- [ ] Use secure cookies (HttpOnly, Secure flags)
- [ ] Implement rate limiting on backend
- [ ] Keep dependencies updated
- [ ] Use environment variables for sensitive data
- [ ] Enable security headers (CSP, X-Frame-Options, etc.)

## Performance Optimization

1. **Enable gzip compression** on your web server
2. **Use CDN** for static assets
3. **Enable caching** for static files
4. **Minify and bundle** (Vite does this automatically)
5. **Monitor bundle size** with `npm run build -- --analyze`

## Monitoring & Logging

1. **Frontend errors**: Check browser console and error tracking (Sentry, etc.)
2. **API errors**: Check backend logs
3. **Network issues**: Use browser DevTools Network tab
4. **Performance**: Use Lighthouse or WebPageTest

## Next Steps

1. Create `.env.local` for local development
2. Test with `npm run dev`
3. Create `.env.production` for production
4. Build with `npm run build`
5. Deploy `dist/` folder to your hosting
6. Test all features in production
7. Monitor for errors and performance issues
