"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { getCurrentUser, updateAuthProfile } from "@/services/api";
import { useChatStore } from "@/store/chatStore";

interface ProfileData {
  name: string;
  email: string;
  bio: string;
}

export default function ProfileSettings() {
  const pushToast = useChatStore((state) => state.pushToast);
  const userProfile = useChatStore((state) => state.userProfile);
  const avatarDataUrl = userProfile.avatarDataUrl;
  const updateUserProfile = useChatStore((state) => state.updateUserProfile);
  const [profile, setProfile] = useState<ProfileData>({
    name: "",
    email: "",
    bio: "",
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfileData>({
    defaultValues: profile,
    mode: "onBlur",
  });

  useEffect(() => {
    let active = true;

    getCurrentUser()
      .then((data) => {
        if (!active) return;
        const nextProfile = {
          name: data.user.name ?? userProfile.displayName ?? "",
          email: data.user.email ?? userProfile.email ?? "",
          bio: userProfile.bio ?? "",
        };
        setProfile(nextProfile);
        reset(nextProfile);
        updateUserProfile({
          displayName: nextProfile.name || data.user.email || "Clizel User",
          email: nextProfile.email,
          bio: nextProfile.bio,
        });
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        
        const error = err as any;
        if (error?.status === 401) {
          console.log("No active session. Using local profile state.");
        } else {
          console.warn("Profile load failed:", error?.message || err);
        }
        
        const fallbackProfile = {
          name: userProfile.displayName ?? "",
          email: userProfile.email ?? "",
          bio: userProfile.bio ?? "",
        };
        setProfile(fallbackProfile);
        reset(fallbackProfile);
        setServerError("Login required to sync profile changes with the backend.");
        setLoading(false);
        pushToast({
          message: "Login required for backend profile sync.",
          type: "error",
        });
      });

    return () => {
      active = false;
    };
  }, [
    pushToast,
    reset,
    updateUserProfile,
    userProfile.bio,
    userProfile.displayName,
    userProfile.email,
  ]);

  function handleAvatarSelect(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      pushToast({ message: "Pick an image for your profile icon.", type: "error" });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const nextAvatar = typeof reader.result === "string" ? reader.result : "";
      if (!nextAvatar) {
        return;
      }
      updateUserProfile({ avatarDataUrl: nextAvatar });
      pushToast({ message: "Profile icon updated ✅", type: "info" });
    };
    reader.readAsDataURL(file);
  }

  const onSubmit = async (data: ProfileData) => {
    const previousProfile = profile;
    setProfile(data);
    setSubmitting(true);
    setServerError(null);
    updateUserProfile({
      displayName: data.name,
      email: data.email,
      bio: data.bio,
    });
    pushToast({ message: "Updating profile...", type: "info" });

    try {
      const updated = await updateAuthProfile({
        name: data.name.trim(),
      });
      const nextProfile = {
        name: updated.user.name ?? data.name,
        email: updated.user.email ?? data.email,
        bio: data.bio,
      };
      setProfile(nextProfile);
      reset(nextProfile, { keepValues: true });
      updateUserProfile({
        displayName: nextProfile.name || updated.user.email || "Clizel User",
        email: nextProfile.email,
        bio: nextProfile.bio,
      });
      pushToast({ message: "Profile saved successfully.", type: "info" });
    } catch (err) {
      setProfile(previousProfile);
      reset(previousProfile);
      updateUserProfile({
        displayName: previousProfile.name,
        email: previousProfile.email,
        bio: previousProfile.bio,
      });
      console.warn("Profile save failed:", (err as any)?.message || err);
      setServerError("Profile sync failed. Please log in again and retry.");
      pushToast({ message: "Could not save profile. Please try again.", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="dashboard-card profile-card">
      <div className="dashboard-card__header">
        <div>
          <p className="section-label">Profile Settings</p>
          <h3 className="dashboard-card__title">Update your profile</h3>
          <p className="dashboard-card__subtitle">
            Manage the details that power your activity feed and notifications.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="profile-skeleton">
          <div className="skeleton-line medium" />
          <div className="skeleton-line long" />
          <div className="skeleton-line long" />
        </div>
      ) : (
        <form className="profile-form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={handleAvatarSelect}
          />

          <div className="profile-avatar-editor">
            <div className="profile-avatar-editor__media">
              {avatarDataUrl ? (
                <img
                  src={avatarDataUrl}
                  alt="Profile icon preview"
                  className="profile-avatar-editor__image"
                />
              ) : (
                <span className="profile-avatar-editor__fallback">
                  {(profile.name || "C").trim().charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="profile-avatar-editor__copy">
              <strong>Profile icon</strong>
              <p>Upload a photo or aesthetic icon so your dashboard feels more yours.</p>
            </div>
            <div className="profile-avatar-editor__actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => avatarInputRef.current?.click()}
              >
                Upload icon
              </button>
              {avatarDataUrl ? (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => updateUserProfile({ avatarDataUrl: "" })}
                >
                  Remove
                </button>
              ) : null}
            </div>
          </div>

          <div className="form-row">
            <label htmlFor="profile-name">Name</label>
            <input
              id="profile-name"
              type="text"
              {...register("name", {
                required: "Name is required.",
                minLength: { value: 2, message: "Name must be at least 2 characters." },
              })}
              className={errors.name ? "input-error" : ""}
              placeholder="Your name"
            />
            {errors.name ? <span className="form-error">{errors.name.message}</span> : null}
          </div>

          <div className="form-row">
            <label htmlFor="profile-email">Email</label>
            <input
              id="profile-email"
              type="email"
              {...register("email", {
                required: "Email is required.",
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: "Enter a valid email address.",
                },
              })}
              className={errors.email ? "input-error" : ""}
              placeholder="you@example.com"
              readOnly
            />
            {errors.email ? <span className="form-error">{errors.email.message}</span> : null}
          </div>

          <div className="form-row">
            <label htmlFor="profile-bio">Bio</label>
            <textarea
              id="profile-bio"
              rows={5}
              {...register("bio", {
                required: "Bio is required.",
                minLength: { value: 10, message: "Bio must be at least 10 characters." },
              })}
              className={errors.bio ? "input-error" : ""}
              placeholder="Tell us a little bit about yourself..."
            />
            {errors.bio ? <span className="form-error">{errors.bio.message}</span> : null}
          </div>

          {serverError ? <div className="form-error-message">{serverError}</div> : null}

          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? "Saving…" : "Save profile"}
          </button>
        </form>
      )}
    </div>
  );
}
