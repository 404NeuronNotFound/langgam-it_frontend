"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "../store/authStore";
import type { UpdateProfilePayload, ChangePasswordPayload } from "../types/auth";

export default function SettingsPage() {
  const { user, isLoading, updateProfile, changePassword } = useAuthStore();

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
  });
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState("");

  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    old_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);

  // Initialize form with user data
  useEffect(() => {
    if (user) {
      setProfileForm({
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        email: user.email || "",
      });
    }
  }, [user]);

  // Clear success messages after 3 seconds
  useEffect(() => {
    if (profileSuccess) {
      const timer = setTimeout(() => setProfileSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [profileSuccess]);

  useEffect(() => {
    if (passwordSuccess) {
      const timer = setTimeout(() => setPasswordSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [passwordSuccess]);

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfileForm((prev) => ({ ...prev, [name]: value }));
    setProfileError("");
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
    setPasswordError("");
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError("");
    setProfileSuccess(false);

    try {
      const payload: UpdateProfilePayload = {
        first_name: profileForm.first_name,
        last_name: profileForm.last_name,
        email: profileForm.email,
      };
      await updateProfile(payload);
      setProfileSuccess(true);
    } catch (err: any) {
      setProfileError(err.message || "Failed to update profile");
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess(false);

    // Validation
    if (!passwordForm.old_password) {
      setPasswordError("Current password is required");
      return;
    }
    if (!passwordForm.new_password) {
      setPasswordError("New password is required");
      return;
    }
    if (passwordForm.new_password.length < 8) {
      setPasswordError("New password must be at least 8 characters");
      return;
    }
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPasswordError("New passwords do not match");
      return;
    }

    try {
      const payload: ChangePasswordPayload = {
        old_password: passwordForm.old_password,
        new_password: passwordForm.new_password,
        confirm_password: passwordForm.confirm_password,
      };
      await changePassword(payload);
      setPasswordSuccess(true);
      setPasswordForm({ old_password: "", new_password: "", confirm_password: "" });
    } catch (err: any) {
      setPasswordError(err.message || "Failed to change password");
    }
  };

  if (!user) {
    return (
      <>
        <style>{SETTINGS_STYLES}</style>
        <div className="set-root">
          <div className="set-header">
            <h1 className="set-title">Settings</h1>
            <p className="set-subtitle">Please log in to access settings</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{SETTINGS_STYLES}</style>
      <div className="set-root">
        <div className="set-header">
          <h1 className="set-title">Settings</h1>
          <p className="set-subtitle">Manage your account and preferences</p>
        </div>

        {/* Profile Section */}
        <div className="set-section">
          <div className="set-section-header">
            <h2 className="set-section-title">Profile Information</h2>
            <p className="set-section-desc">Update your personal details</p>
          </div>

          <form onSubmit={handleProfileSubmit} className="set-form">
            <div className="set-form-group">
              <label className="set-label">First Name</label>
              <input
                type="text"
                name="first_name"
                value={profileForm.first_name}
                onChange={handleProfileChange}
                className="set-input"
                placeholder="Enter first name"
              />
            </div>

            <div className="set-form-group">
              <label className="set-label">Last Name</label>
              <input
                type="text"
                name="last_name"
                value={profileForm.last_name}
                onChange={handleProfileChange}
                className="set-input"
                placeholder="Enter last name"
              />
            </div>

            <div className="set-form-group">
              <label className="set-label">Email Address</label>
              <input
                type="email"
                name="email"
                value={profileForm.email}
                onChange={handleProfileChange}
                className="set-input"
                placeholder="Enter email address"
              />
            </div>

            <div className="set-form-group">
              <label className="set-label">Username</label>
              <input
                type="text"
                value={user.username}
                disabled
                className="set-input set-input-disabled"
                placeholder="Username"
              />
              <p className="set-hint">Username cannot be changed</p>
            </div>

            {profileError && <div className="set-error">{profileError}</div>}
            {profileSuccess && <div className="set-success">Profile updated successfully</div>}

            <button type="submit" className="set-btn set-btn-primary" disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Changes"}
            </button>
          </form>
        </div>

        {/* Password Section */}
        <div className="set-section">
          <div className="set-section-header">
            <h2 className="set-section-title">Change Password</h2>
            <p className="set-section-desc">Update your password to keep your account secure</p>
          </div>

          <form onSubmit={handlePasswordSubmit} className="set-form">
            <div className="set-form-group">
              <label className="set-label">Current Password</label>
              <div className="set-input-wrapper">
                <input
                  type={showPasswords ? "text" : "password"}
                  name="old_password"
                  value={passwordForm.old_password}
                  onChange={handlePasswordChange}
                  className="set-input"
                  placeholder="Enter current password"
                />
              </div>
            </div>

            <div className="set-form-group">
              <label className="set-label">New Password</label>
              <div className="set-input-wrapper">
                <input
                  type={showPasswords ? "text" : "password"}
                  name="new_password"
                  value={passwordForm.new_password}
                  onChange={handlePasswordChange}
                  className="set-input"
                  placeholder="Enter new password"
                />
              </div>
              <p className="set-hint">At least 8 characters</p>
            </div>

            <div className="set-form-group">
              <label className="set-label">Confirm New Password</label>
              <div className="set-input-wrapper">
                <input
                  type={showPasswords ? "text" : "password"}
                  name="confirm_password"
                  value={passwordForm.confirm_password}
                  onChange={handlePasswordChange}
                  className="set-input"
                  placeholder="Confirm new password"
                />
              </div>
            </div>

            <div className="set-checkbox">
              <input
                type="checkbox"
                id="show-passwords"
                checked={showPasswords}
                onChange={(e) => setShowPasswords(e.target.checked)}
              />
              <label htmlFor="show-passwords" className="set-checkbox-label">
                Show passwords
              </label>
            </div>

            {passwordError && <div className="set-error">{passwordError}</div>}
            {passwordSuccess && <div className="set-success">Password changed successfully</div>}

            <button type="submit" className="set-btn set-btn-primary" disabled={isLoading}>
              {isLoading ? "Updating..." : "Change Password"}
            </button>
          </form>
        </div>

        {/* Account Info Section */}
        <div className="set-section">
          <div className="set-section-header">
            <h2 className="set-section-title">Account Information</h2>
            <p className="set-section-desc">View your account details</p>
          </div>

          <div className="set-info-grid">
            <div className="set-info-item">
              <p className="set-info-label">User ID</p>
              <p className="set-info-value">{user.id}</p>
            </div>
            <div className="set-info-item">
              <p className="set-info-label">Member Since</p>
              <p className="set-info-value">
                {user.date_joined ? new Date(user.date_joined).toLocaleDateString() : "N/A"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

const SETTINGS_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600&family=Lora:ital,wght@0,500;1,400&display=swap');
  :root {
    --bg-page:    #F5F4F1;
    --bg-card:    #FFFFFF;
    --bg-surface: #F0EFEB;
    --border:     rgba(0,0,0,0.09);
    --border-md:  rgba(0,0,0,0.14);
    --text-1:     #18181B;
    --text-2:     #52525B;
    --text-3:     #A1A1AA;
    --error:      #993C1D;
    --success:    #3B6D11;
    --blue-icon:  #185FA5;
    --purple-icon:#534AB7;
    --sans:  'Plus Jakarta Sans', system-ui, sans-serif;
    --serif: 'Lora', Georgia, serif;
    --radius-sm: 8px; --radius-md: 12px; --radius-lg: 18px;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg-page:    #0F0F11;
      --bg-card:    #18181B;
      --bg-surface: #1F1F23;
      --border:     rgba(255,255,255,0.08);
      --border-md:  rgba(255,255,255,0.14);
      --text-1:     #FAFAFA;
      --text-2:     #A1A1AA;
      --text-3:     #52525B;
      --error:      #F0997B;
      --success:    #97C459;
      --blue-icon:  #85B7EB;
      --purple-icon:#AFA9EC;
    }
  }

  .set-root {
    font-family: var(--sans);
    max-width: 800px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .set-header {
    margin-bottom: 0.5rem;
  }
  .set-title {
    font-family: var(--serif);
    font-size: 28px;
    font-style: italic;
    font-weight: 400;
    color: var(--text-1);
    letter-spacing: -0.3px;
    margin-bottom: 6px;
  }
  .set-subtitle {
    font-size: 13px;
    color: var(--text-2);
    line-height: 1.6;
  }

  .set-section {
    background: var(--bg-card);
    border: 0.5px solid var(--border-md);
    border-radius: var(--radius-lg);
    padding: 2rem;
  }

  .set-section-header {
    margin-bottom: 1.5rem;
  }
  .set-section-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-1);
    margin-bottom: 4px;
  }
  .set-section-desc {
    font-size: 12px;
    color: var(--text-3);
  }

  .set-form {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .set-form-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .set-label {
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    color: var(--text-2);
  }

  .set-input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
  }

  .set-input {
    width: 100%;
    height: 40px;
    padding: 0 12px;
    background: var(--bg-surface);
    border: 0.5px solid var(--border-md);
    border-radius: var(--radius-sm);
    font-family: var(--sans);
    font-size: 13px;
    color: var(--text-1);
    transition: border-color 0.15s, background 0.15s;
  }

  .set-input:focus {
    outline: none;
    border-color: var(--blue-icon);
    background: var(--bg-card);
  }

  .set-input-disabled {
    background: var(--border);
    color: var(--text-3);
    cursor: not-allowed;
  }

  .set-hint {
    font-size: 11px;
    color: var(--text-3);
    margin-top: 2px;
  }

  .set-checkbox {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0.5rem 0;
  }

  .set-checkbox input {
    width: 16px;
    height: 16px;
    cursor: pointer;
    accent-color: var(--blue-icon);
  }

  .set-checkbox-label {
    font-size: 12px;
    color: var(--text-2);
    cursor: pointer;
  }

  .set-error {
    padding: 10px 12px;
    background: rgba(153, 60, 29, 0.1);
    border: 0.5px solid var(--error);
    border-radius: var(--radius-sm);
    font-size: 12px;
    color: var(--error);
  }

  .set-success {
    padding: 10px 12px;
    background: rgba(59, 109, 17, 0.1);
    border: 0.5px solid var(--success);
    border-radius: var(--radius-sm);
    font-size: 12px;
    color: var(--success);
  }

  .set-btn {
    height: 40px;
    padding: 0 20px;
    border: none;
    border-radius: var(--radius-sm);
    font-family: var(--sans);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s;
  }

  .set-btn-primary {
    background: var(--text-1);
    color: var(--bg-card);
  }

  .set-btn-primary:hover:not(:disabled) {
    background: var(--text-2);
  }

  .set-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .set-info-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1.5rem;
  }

  .set-info-item {
    padding: 1rem;
    background: var(--bg-surface);
    border-radius: var(--radius-sm);
  }

  .set-info-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    color: var(--text-3);
    margin-bottom: 6px;
  }

  .set-info-value {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-1);
  }

  @media (max-width: 640px) {
    .set-root {
      gap: 1.5rem;
    }
    .set-section {
      padding: 1.5rem;
    }
    .set-title {
      font-size: 24px;
    }
    .set-info-grid {
      grid-template-columns: 1fr;
    }
  }
`;
