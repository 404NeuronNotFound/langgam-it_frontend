# Backend Settings API Setup Guide

## Overview

The Settings API needs to support:
- Updating user profile (first_name, last_name, email)
- Changing user password with old password verification
- Retrieving current user information

## Frontend Expectations

The frontend sends requests to these endpoints:

### 1. Update Profile
**Endpoint**: `PATCH /api/auth/profile/`
**Authentication**: Required (Bearer token)
**Request Body**:
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com"
}
```

**Response** (200 OK):
```json
{
  "id": 1,
  "username": "johndoe",
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "date_joined": "2026-01-15T10:30:00Z"
}
```

**Error Response** (400 Bad Request):
```json
{
  "email": ["This email is already in use."],
  "first_name": ["This field may not be blank."]
}
```

### 2. Change Password
**Endpoint**: `POST /api/auth/change-password/`
**Authentication**: Required (Bearer token)
**Request Body**:
```json
{
  "old_password": "currentPassword123",
  "new_password": "newPassword456",
  "confirm_password": "newPassword456"
}
```

**Response** (200 OK):
```json
{
  "detail": "Password changed successfully"
}
```

**Error Response** (400 Bad Request):
```json
{
  "old_password": ["Incorrect password."],
  "new_password": ["Password must be at least 8 characters."],
  "non_field_errors": ["Passwords do not match."]
}
```

## Implementation Steps

### Step 1: Create Serializers

**File**: `api/serializers.py`

Add these serializers to your existing serializers file:

```python
from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password

class UserProfileSerializer(serializers.ModelSerializer):
    """Serializer for updating user profile information"""
    
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email', 'date_joined']
        read_only_fields = ['id', 'username', 'date_joined']
    
    def validate_email(self, value):
        """Ensure email is unique (excluding current user)"""
        user = self.instance
        if User.objects.filter(email=value).exclude(pk=user.pk).exists():
            raise serializers.ValidationError("This email is already in use.")
        return value


class ChangePasswordSerializer(serializers.Serializer):
    """Serializer for changing user password"""
    
    old_password = serializers.CharField(write_only=True, required=True)
    new_password = serializers.CharField(write_only=True, required=True)
    confirm_password = serializers.CharField(write_only=True, required=True)
    
    def validate_old_password(self, value):
        """Verify old password is correct"""
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Incorrect password.")
        return value
    
    def validate_new_password(self, value):
        """Validate new password strength"""
        try:
            validate_password(value)
        except serializers.ValidationError as e:
            raise serializers.ValidationError(str(e))
        return value
    
    def validate(self, data):
        """Ensure new passwords match"""
        if data['new_password'] != data['confirm_password']:
            raise serializers.ValidationError({
                'confirm_password': 'Passwords do not match.'
            })
        return data
```

### Step 2: Create Views

**File**: `api/views.py`

Add these views to your existing views file:

```python
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.contrib.auth.models import User
from .serializers import UserProfileSerializer, ChangePasswordSerializer

class UserProfileView(APIView):
    """
    Update user profile information (first_name, last_name, email)
    PATCH /api/auth/profile/
    """
    permission_classes = [IsAuthenticated]
    
    def patch(self, request):
        """Update user profile"""
        user = request.user
        serializer = UserProfileSerializer(user, data=request.data, partial=True)
        
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ChangePasswordView(APIView):
    """
    Change user password
    POST /api/auth/change-password/
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Change password"""
        serializer = ChangePasswordSerializer(
            data=request.data,
            context={'request': request}
        )
        
        if serializer.is_valid():
            user = request.user
            user.set_password(serializer.validated_data['new_password'])
            user.save()
            
            return Response(
                {'detail': 'Password changed successfully'},
                status=status.HTTP_200_OK
            )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
```

### Step 3: Update URL Routing

**File**: `api/urls.py`

Add these URL patterns:

```python
from django.urls import path
from .views import UserProfileView, ChangePasswordView

urlpatterns = [
    # ... existing patterns ...
    
    # Settings/Profile endpoints
    path("auth/profile/", UserProfileView.as_view(), name="user-profile"),
    path("auth/change-password/", ChangePasswordView.as_view(), name="change-password"),
]
```

## Testing the API

### Test with cURL

```bash
# Get auth token first
TOKEN=$(curl -X POST http://localhost:8000/api/auth/token/ \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"testpass123"}' \
  | jq -r '.access')

# Update profile
curl -X PATCH http://localhost:8000/api/auth/profile/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com"
  }'

# Change password
curl -X POST http://localhost:8000/api/auth/change-password/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "old_password": "testpass123",
    "new_password": "newpass456",
    "confirm_password": "newpass456"
  }'
```

## Error Handling

The API should handle:
- Missing authentication (401 Unauthorized)
- Invalid email format (400 Bad Request)
- Email already in use (400 Bad Request)
- Incorrect old password (400 Bad Request)
- Password validation errors (400 Bad Request)
- Passwords don't match (400 Bad Request)
- Database errors (500 Internal Server Error)

## Security Considerations

1. **Password Hashing**: Always use Django's `set_password()` method, never store plain text
2. **Old Password Verification**: Always verify old password before allowing change
3. **Email Uniqueness**: Ensure email is unique across all users
4. **Rate Limiting**: Consider adding rate limiting to password change endpoint
5. **Audit Logging**: Log password changes for security audit trail
6. **HTTPS Only**: Ensure all endpoints are HTTPS in production

## Performance Notes

- Profile update is a simple PATCH operation (minimal DB impact)
- Password change requires password hashing (CPU intensive, acceptable)
- Consider caching user profile data if needed
- Email uniqueness check is O(1) with proper database indexing

## Next Steps

1. Add the serializers to your `api/serializers.py`
2. Add the views to your `api/views.py`
3. Add the URL patterns to your `api/urls.py`
4. Test with the provided cURL commands
5. Verify error handling works correctly
6. Test with the frontend Settings page

## Frontend Integration

The frontend is already configured to call these endpoints:
- `updateProfile(payload)` → PATCH `/api/auth/profile/`
- `changePassword(payload)` → POST `/api/auth/change-password/`

Once the backend is implemented, the Settings page will work automatically.
