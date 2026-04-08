# Backend Authentication Setup Guide

## Problem: 401 Unauthorized on Login

**Symptom**: Valid credentials return 401 Unauthorized error
**Root Cause**: Backend authentication endpoints are not properly configured

---

## Required Backend Setup

### Step 1: Install Required Packages

```bash
pip install djangorestframework
pip install djangorestframework-simplejwt
pip install django-cors-headers
```

### Step 2: Update Django Settings

**File**: `settings.py`

```python
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Third-party apps
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    
    # Your apps
    'api',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',  # Add this FIRST
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

# ── REST Framework Configuration ──────────────────────────────────
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
}

# ── JWT Configuration ─────────────────────────────────────────────
from datetime import timedelta

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=30),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1),
    'ROTATE_REFRESH_TOKENS': False,
    'BLACKLIST_AFTER_ROTATION': False,
    'UPDATE_LAST_LOGIN': False,

    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'VERIFYING_KEY': None,
    'AUDIENCE': None,
    'ISSUER': None,
    'JTI_CLAIM': 'jti',
    'TOKEN_TYPE_CLAIM': 'token_type',
    'JTI_CLAIM': 'jti',

    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
    'USER_AUTHENTICATION_RULE': 'rest_framework_simplejwt.authentication.default_user_authentication_rule',

    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
    'TOKEN_REFRESH_SERIALIZER': 'rest_framework_simplejwt.serializers.TokenRefreshSerializer',
}

# ── CORS Configuration ────────────────────────────────────────────
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",  # Local development
    "http://localhost:3000",  # Alternative local port
    "https://langgam-it-by-keybeen.vercel.app",  # Production frontend
]

CORS_ALLOW_CREDENTIALS = True

CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]
```

### Step 3: Create Authentication Serializers

**File**: `api/serializers.py`

```python
from rest_framework import serializers
from django.contrib.auth.models import User
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model"""
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email', 'date_joined']
        read_only_fields = ['id', 'date_joined']

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Custom token serializer that includes user info in response
    """
    def validate(self, attrs):
        data = super().validate(attrs)
        
        # Add user info to response
        user = self.user
        data['user'] = {
            'id': user.id,
            'username': user.username,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'email': user.email,
        }
        
        return data

class RegisterSerializer(serializers.ModelSerializer):
    """Serializer for user registration"""
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True, min_length=8)
    
    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password_confirm', 'first_name', 'last_name']
    
    def validate(self, data):
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError({"password": "Passwords do not match."})
        
        if User.objects.filter(username=data['username']).exists():
            raise serializers.ValidationError({"username": "Username already exists."})
        
        if User.objects.filter(email=data['email']).exists():
            raise serializers.ValidationError({"email": "Email already exists."})
        
        return data
    
    def create(self, validated_data):
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        
        user = User.objects.create_user(**validated_data)
        user.set_password(password)  # IMPORTANT: Use set_password for hashing
        user.save()
        
        return user
```

### Step 4: Create Authentication Views

**File**: `api/views.py`

```python
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth.models import User

from .serializers import (
    CustomTokenObtainPairSerializer,
    RegisterSerializer,
    UserSerializer,
)

class CustomTokenObtainPairView(TokenObtainPairView):
    """
    Login endpoint that returns access token, refresh token, and user info
    POST /api/auth/token/
    """
    serializer_class = CustomTokenObtainPairSerializer
    permission_classes = [AllowAny]

class RegisterView(APIView):
    """
    Registration endpoint
    POST /api/auth/register/
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            return Response(
                {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'message': 'User created successfully. Please log in.'
                },
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class CurrentUserView(APIView):
    """
    Get current authenticated user info
    GET /api/auth/me/
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

class UpdateProfileView(APIView):
    """
    Update user profile
    PATCH /api/auth/profile/
    """
    permission_classes = [IsAuthenticated]
    
    def patch(self, request):
        user = request.user
        serializer = UserSerializer(user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class ChangePasswordView(APIView):
    """
    Change user password
    POST /api/auth/change-password/
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        user = request.user
        old_password = request.data.get('old_password')
        new_password = request.data.get('new_password')
        confirm_password = request.data.get('confirm_password')
        
        # Validate old password
        if not user.check_password(old_password):
            return Response(
                {'old_password': 'Incorrect password.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate new password
        if len(new_password) < 8:
            return Response(
                {'new_password': 'Password must be at least 8 characters.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate passwords match
        if new_password != confirm_password:
            return Response(
                {'non_field_errors': 'Passwords do not match.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update password
        user.set_password(new_password)
        user.save()
        
        return Response({'detail': 'Password changed successfully.'})
```

### Step 5: Update URL Routing

**File**: `api/urls.py`

```python
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    CustomTokenObtainPairView,
    RegisterView,
    CurrentUserView,
    UpdateProfileView,
    ChangePasswordView,
)

urlpatterns = [
    # Authentication endpoints
    path('auth/token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/me/', CurrentUserView.as_view(), name='current_user'),
    path('auth/profile/', UpdateProfileView.as_view(), name='update_profile'),
    path('auth/change-password/', ChangePasswordView.as_view(), name='change_password'),
    
    # ... other endpoints
]
```

### Step 6: Update Main URLs

**File**: `project/urls.py`

```python
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('api.urls')),
]
```

---

## Testing the Authentication

### Test Registration

```bash
curl -X POST http://localhost:8000/api/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "TestPassword123",
    "password_confirm": "TestPassword123",
    "first_name": "Test",
    "last_name": "User"
  }'
```

**Expected Response** (201 Created):
```json
{
  "id": 1,
  "username": "testuser",
  "email": "test@example.com",
  "message": "User created successfully. Please log in."
}
```

### Test Login

```bash
curl -X POST http://localhost:8000/api/auth/token/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "TestPassword123"
  }'
```

**Expected Response** (200 OK):
```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "user": {
    "id": 1,
    "username": "testuser",
    "first_name": "Test",
    "last_name": "User",
    "email": "test@example.com"
  }
}
```

### Test Get Current User

```bash
curl -X GET http://localhost:8000/api/auth/me/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Test Token Refresh

```bash
curl -X POST http://localhost:8000/api/auth/token/refresh/ \
  -H "Content-Type: application/json" \
  -d '{
    "refresh": "YOUR_REFRESH_TOKEN"
  }'
```

---

## Common Issues & Solutions

### Issue 1: "Invalid username or password"
**Cause**: User doesn't exist or password is wrong
**Solution**: 
1. Verify user exists in database: `User.objects.filter(username='testuser')`
2. Verify password was hashed with `set_password()`: `user.check_password('password')`

### Issue 2: "Token is invalid or expired"
**Cause**: JWT token configuration issue
**Solution**:
1. Check `SIMPLE_JWT` settings in `settings.py`
2. Verify `SECRET_KEY` is set correctly
3. Check token expiration times

### Issue 3: CORS errors in browser
**Cause**: Frontend domain not in `CORS_ALLOWED_ORIGINS`
**Solution**:
1. Add frontend domain to `CORS_ALLOWED_ORIGINS`
2. Ensure `corsheaders` middleware is first in MIDDLEWARE list
3. Verify `CORS_ALLOW_CREDENTIALS = True`

### Issue 4: "Authentication credentials were not provided"
**Cause**: Bearer token not being sent or not in correct format
**Solution**:
1. Verify token is in localStorage
2. Check Authorization header format: `Bearer {token}`
3. Verify request interceptor is working

---

## Security Checklist

- [ ] Use HTTPS in production
- [ ] Set strong `SECRET_KEY` in settings
- [ ] Configure `CORS_ALLOWED_ORIGINS` to specific domains only
- [ ] Set reasonable token expiration times
- [ ] Use `set_password()` for password hashing
- [ ] Implement rate limiting on auth endpoints
- [ ] Log authentication failures
- [ ] Use secure cookies (HttpOnly, Secure flags)
- [ ] Implement CSRF protection
- [ ] Keep dependencies updated

---

## Production Deployment

### On Render

1. **Set environment variables**:
   - `SECRET_KEY`: Your Django secret key
   - `DEBUG`: False
   - `ALLOWED_HOSTS`: Your domain

2. **Update CORS settings**:
   ```python
   CORS_ALLOWED_ORIGINS = [
       "https://langgam-it-by-keybeen.vercel.app",
   ]
   ```

3. **Run migrations**:
   ```bash
   python manage.py migrate
   ```

4. **Collect static files**:
   ```bash
   python manage.py collectstatic --noinput
   ```

5. **Deploy** and test login

---

## Next Steps

1. Implement the authentication views and serializers
2. Update URL routing
3. Test all endpoints locally
4. Deploy to Render
5. Test from production frontend
6. Monitor logs for errors

