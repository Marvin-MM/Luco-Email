'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth';
import { useUpdateProfile, useChangePassword, useLogout } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  User, 
  Mail, 
  Building, 
  Calendar, 
  Shield, 
  Eye, 
  EyeOff,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';

interface ProfileFormData {
  firstName: string;
  lastName: string;
}

interface PasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface FormErrors {
  profile?: string;
  password?: string;
}

export default function ProfilePage() {
  const { user, tenant } = useAuthStore();
  const { mutate: updateProfile, isPending: isUpdatingProfile } = useUpdateProfile();
  const { mutate: changePassword, isPending: isChangingPassword } = useChangePassword();
  const { mutate: logout } = useLogout();

  // Profile form state
  const [profileData, setProfileData] = useState<ProfileFormData>({
    firstName: '',
    lastName: ''
  });

  // Password form state
  const [passwordData, setPasswordData] = useState<PasswordFormData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // UI state
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [successMessages, setSuccessMessages] = useState<{
    profile?: string;
    password?: string;
  }>({});

  // Initialize form data
  useEffect(() => {
    if (user) {
      setProfileData({
        firstName: user.firstName || '',
        lastName: user.lastName || ''
      });
    }
  }, [user]);

  // Clear messages after a delay
  useEffect(() => {
    if (successMessages.profile || successMessages.password) {
      const timer = setTimeout(() => {
        setSuccessMessages({});
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessages]);

  // Profile validation
  const validateProfile = (): boolean => {
    const newErrors: FormErrors = {};

    if (!profileData.firstName.trim()) {
      newErrors.profile = 'First name is required';
    } else if (!profileData.lastName.trim()) {
      newErrors.profile = 'Last name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Password validation
  const validatePassword = (): boolean => {
    const newErrors: FormErrors = {};

    if (!passwordData.currentPassword) {
      newErrors.password = 'Current password is required';
    } else if (!passwordData.newPassword) {
      newErrors.password = 'New password is required';
    } else if (passwordData.newPassword.length < 8) {
      newErrors.password = 'New password must be at least 8 characters long';
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      newErrors.password = 'Passwords do not match';
    } else if (passwordData.currentPassword === passwordData.newPassword) {
      newErrors.password = 'New password must be different from current password';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle profile update
  const handleUpdateProfile = () => {
    if (!validateProfile()) return;

    updateProfile(profileData, {
      onSuccess: () => {
        setSuccessMessages({ profile: 'Profile updated successfully!' });
        setErrors({});
      },
      onError: (error: any) => {
        setErrors({ 
          profile: error.response?.data?.error || 'Failed to update profile' 
        });
      }
    });
  };

  // Handle password change
  const handleChangePassword = () => {
    if (!validatePassword()) return;

    changePassword({
      currentPassword: passwordData.currentPassword,
      newPassword: passwordData.newPassword
    }, {
      onSuccess: () => {
        setSuccessMessages({ password: 'Password changed successfully! Logging you out...' });
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setErrors({});
        
        // Log out after 2 seconds
        setTimeout(() => {
          logout();
        }, 2000);
      },
      onError: (error: any) => {
        setErrors({ 
          password: error.response?.data?.error || 'Failed to change password' 
        });
      }
    });
  };

  // Check if profile has changes
  const hasProfileChanges = user && (
    profileData.firstName !== (user.firstName || '') ||
    profileData.lastName !== (user.lastName || '')
  );

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user) return '';
    const firstInitial = user.firstName?.charAt(0) || '';
    const lastInitial = user.lastName?.charAt(0) || '';
    return `${firstInitial}${lastInitial}`.toUpperCase();
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!user || !tenant) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold">Unable to load profile</h3>
          <p className="text-muted-foreground">Please try refreshing the page</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto space-y-8 p-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">Profile Settings</h1>
        <p className="text-muted-foreground">Manage your account information and security settings</p>
      </div>

      {/* User Overview Card */}
      <Card>
        <CardHeader className="pb-6">
          <div className="flex items-center space-x-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={user.profilePicture || undefined} />
              <AvatarFallback className="text-lg font-semibold">
                {getUserInitials()}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">
                {user.firstName && user.lastName 
                  ? `${user.firstName} ${user.lastName}` 
                  : 'User Profile'
                }
              </h2>
              <div className="flex items-center space-x-2 text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span>{user.email}</span>
                {user.isEmailVerified && (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* User Details */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center space-x-2">
                <User className="h-4 w-4" />
                <span>Account Details</span>
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Role:</span>
                  <Badge variant="secondary">{user.role}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email Status:</span>
                  <div className="flex items-center space-x-1">
                    {user.isEmailVerified ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-green-600">Verified</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 text-red-500" />
                        <span className="text-red-600">Unverified</span>
                      </>
                    )}
                  </div>
                </div>
                {user.lastLoginAt && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Login:</span>
                    <span className="text-sm">{formatDate(user.lastLoginAt)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Organization Details */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center space-x-2">
                <Building className="h-4 w-4" />
                <span>Organization</span>
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name:</span>
                  <span className="font-medium">{tenant.organizationName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge variant={tenant.status === 'ACTIVE' ? 'default' : 'secondary'}>
                    {tenant.status}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Plan:</span>
                  <Badge variant="outline">{tenant.subscriptionPlan}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email Usage:</span>
                  <span className="text-sm">
                    {tenant.emailsSentThisMonth}/{tenant.monthlyEmailLimit}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Update Profile Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Personal Information</span>
            </CardTitle>
            <CardDescription>
              Update your personal details and profile information.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {successMessages.profile && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>{successMessages.profile}</AlertDescription>
              </Alert>
            )}

            {errors.profile && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>{errors.profile}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input 
                  id="firstName" 
                  value={profileData.firstName} 
                  onChange={(e) => setProfileData(prev => ({
                    ...prev,
                    firstName: e.target.value
                  }))}
                  placeholder="Enter your first name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input 
                  id="lastName" 
                  value={profileData.lastName} 
                  onChange={(e) => setProfileData(prev => ({
                    ...prev,
                    lastName: e.target.value
                  }))}
                  placeholder="Enter your last name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input 
                  id="email" 
                  value={user.email} 
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  Email address cannot be changed
                </p>
              </div>
            </div>

            <Button 
              onClick={handleUpdateProfile} 
              disabled={isUpdatingProfile || !hasProfileChanges}
              className="w-full"
            >
              {isUpdatingProfile ? 'Saving Changes...' : 'Save Changes'}
            </Button>
          </CardContent>
        </Card>

        {/* Change Password Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>Security</span>
            </CardTitle>
            <CardDescription>
              Change your password to keep your account secure.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {successMessages.password && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>{successMessages.password}</AlertDescription>
              </Alert>
            )}

            {errors.password && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>{errors.password}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password *</Label>
                <div className="relative">
                  <Input 
                    id="currentPassword" 
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={passwordData.currentPassword} 
                    onChange={(e) => setPasswordData(prev => ({
                      ...prev,
                      currentPassword: e.target.value
                    }))}
                    placeholder="Enter your current password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password *</Label>
                <div className="relative">
                  <Input 
                    id="newPassword" 
                    type={showNewPassword ? 'text' : 'password'}
                    value={passwordData.newPassword} 
                    onChange={(e) => setPasswordData(prev => ({
                      ...prev,
                      newPassword: e.target.value
                    }))}
                    placeholder="Enter your new password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Password must be at least 8 characters long
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password *</Label>
                <div className="relative">
                  <Input 
                    id="confirmPassword" 
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={passwordData.confirmPassword} 
                    onChange={(e) => setPasswordData(prev => ({
                      ...prev,
                      confirmPassword: e.target.value
                    }))}
                    placeholder="Confirm your new password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-800">Security Notice</p>
                  <p className="text-amber-700 mt-1">
                    Changing your password will log you out of all devices for security.
                  </p>
                </div>
              </div>
            </div>

            <Button 
              onClick={handleChangePassword} 
              disabled={isChangingPassword || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
              className="w-full"
              variant="destructive"
            >
              {isChangingPassword ? 'Changing Password...' : 'Change Password'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Account Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Account Summary</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-primary">{tenant.subscriptionPlan}</div>
              <div className="text-sm text-muted-foreground">Current Plan</div>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-primary">
                {tenant.emailsSentThisMonth}
              </div>
              <div className="text-sm text-muted-foreground">
                Emails sent this month
              </div>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-primary">
                {tenant.monthlyEmailLimit - tenant.emailsSentThisMonth}
              </div>
              <div className="text-sm text-muted-foreground">
                Emails remaining
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}