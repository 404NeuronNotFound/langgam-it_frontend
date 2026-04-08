# Backend Authentication Troubleshooting - 401 Unauthorized

## Quick Diagnosis

The error `401 Unauthorized` on login means the backend is rejecting the credentials. Here's how to identify the exact issue:

---

## Step 1: Verify Backend is Running

```bash
# Check if backend is accessible
curl https://langgam-it-backend.onrender.com/api/

# Expected: Some response (not connection refused)
# If connection refused: Backend is down
```

---

## Step 2: Test Login Endpoint Directly

```bash
# Test with valid credentials
curl -X POST https://langgam-it-backend.onrender.com/api/auth/token/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "your_username",
    "password": "your_password"
  }'
```

### Possible Responses:

#### ✅ Success (200 OK)
```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "user": {
    "id": 1,
    "username": "your_username",
    "email": "your_email@example.com"
  }
}
```
**Action**: Frontend should work. Check browser console for other errors.

#### ❌ 401 Unauthorized
```json
{
  "detail": "No active account found with the given credentials"
}
```
**Action**: Go to Step 3

#### ❌ 404 Not Found
```json
{
  "detail": "Not found."
}
```
**Action**: Endpoint doesn't exist. Backend authentication not implemented. See BACKEND_AUTH_SETUP.md

#### ❌ 500 Internal Server Error
```json
{
  "detail": "Internal server error"
}
```
**Action**: Check backend logs for errors

---

## Step 3: Verify User Exists in Database

If you get 401, the user might not exist. Check:

```bash
# SSH into your backend server or use Django shell
python manage.py shell

# Check if user exists
from django.contrib.auth.models import User
user = User.objects.filter(username='your_username').first()
print(user)  # Should print user object, not None

# If user exists, verify password
if user:
    print(user.check_password('your_password'))  # Should be True
```

### If User Doesn't Exist:
1. Register a new account through the frontend
2. Or create manually:
```bash
python manage.py shell
from django.contrib.auth.models import User
user = User.objects.create_user(
    username='testuser',
    email='test@example.com',
    password='TestPassword123'
)
```

### If Password Check Returns False:
The password was not hashed correctly. Fix:
```bash
python manage.py shell
from django.contrib.auth.models import User
user = User.objects.get(username='your_username')
user.set_password('your_password')  # IMPORTANT: Use set_password()
user.save()
```

---

## Step 4: Check JWT Configuration

```bash
# SSH into backend and check settings
python manage.py shell

# Verify JWT is installed
import rest_framework_simplejwt
print("JWT installed ✓")

# Check settings
from django.conf import settings
print(settings.SIMPLE_JWT)
print(settings.REST_FRAMEWORK)
```

### Required Settings:
```python
# Should have JWT authentication
'DEFAULT_AUTHENTICATION_CLASSES': (
    'rest_framework_simplejwt.authentication.JWTAuthentication',
)

# Should have JWT config
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=30),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1),
    ...
}
```

---

## Step 5: Check CORS Configuration

```bash
# Test CORS headers
curl -X OPTIONS https://langgam-it-backend.onrender.com/api/auth/token/ \
  -H "Origin: https://langgam-it-by-keybeen.vercel.app" \
  -H "Access-Control-Request-Method: POST" \
  -v
```

### Look for these headers in response:
```
Access-Control-Allow-Origin: https://langgam-it-by-keybeen.vercel.app
Access-Control-Allow-Methods: POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

### If missing:
1. Verify `corsheaders` is installed
2. Verify `corsheaders.middleware.CorsMiddleware` is first in MIDDLEWARE
3. Verify frontend domain is in `CORS_ALLOWED_ORIGINS`

---

## Step 6: Check Frontend Configuration

```bash
# In browser console, check API URL
console.log(import.meta.env.VITE_API_URL)

# Should output: https://langgam-it-backend.onrender.com/api
```

If it shows `http://localhost:8000/api`, the environment variable isn't set in Vercel.

### Fix in Vercel Dashboard:
1. Go to Project Settings → Environment Variables
2. Add: `VITE_API_URL=https://langgam-it-backend.onrender.com/api`
3. Redeploy

---

## Step 7: Check Browser Network Tab

1. Open browser DevTools (F12)
2. Go to Network tab
3. Try to login
4. Look for the POST request to `/api/auth/token/`
5. Check:
   - **Status**: Should be 200 (not 401)
   - **Request Headers**: Should have `Content-Type: application/json`
   - **Request Body**: Should have username and password
   - **Response**: Should have `access`, `refresh`, `user`

---

## Common Issues & Quick Fixes

### Issue: "No active account found with the given credentials"
**Cause**: User doesn't exist or password is wrong
**Fix**:
1. Verify username is correct (case-sensitive)
2. Verify password is correct
3. Try registering a new account
4. Check user exists in database

### Issue: "Token is invalid or expired"
**Cause**: JWT configuration issue
**Fix**:
1. Check `SECRET_KEY` is set in Django settings
2. Verify `SIMPLE_JWT` settings exist
3. Check token expiration times aren't too short

### Issue: CORS error in browser console
**Cause**: Frontend domain not allowed
**Fix**:
1. Add frontend domain to `CORS_ALLOWED_ORIGINS`
2. Ensure `corsheaders` middleware is first
3. Redeploy backend

### Issue: "Endpoint not found" (404)
**Cause**: Authentication views not implemented
**Fix**:
1. Follow BACKEND_AUTH_SETUP.md
2. Create authentication views and serializers
3. Add URL routing
4. Redeploy backend

### Issue: "Internal server error" (500)
**Cause**: Backend error
**Fix**:
1. Check backend logs: `heroku logs --tail` or Render logs
2. Look for Python exceptions
3. Fix the error
4. Redeploy

---

## Debug Mode

### Enable Django Debug Mode (Development Only)

```python
# settings.py
DEBUG = True  # Only for development!
```

This will show detailed error messages instead of generic 500 errors.

### Check Backend Logs

**On Render**:
1. Go to Render dashboard
2. Select your service
3. Click "Logs" tab
4. Look for error messages

**Locally**:
```bash
python manage.py runserver
# Errors will appear in terminal
```

---

## Test Checklist

- [ ] Backend is running and accessible
- [ ] User exists in database
- [ ] Password is hashed with `set_password()`
- [ ] JWT is installed and configured
- [ ] CORS is configured for frontend domain
- [ ] Authentication endpoints exist
- [ ] Frontend has correct API URL
- [ ] Browser console shows no errors
- [ ] Network tab shows 200 response from login endpoint
- [ ] Response includes `access`, `refresh`, `user` fields

---

## Still Not Working?

1. **Check backend logs** for the exact error
2. **Test endpoint with curl** to isolate frontend vs backend issue
3. **Verify user exists** in database
4. **Verify password** is correct
5. **Check CORS** headers in response
6. **Verify JWT** is installed and configured
7. **Check environment variables** in Vercel

If still stuck, share:
- Backend error logs
- Response from `curl` test
- Browser console errors
- Network tab screenshot

