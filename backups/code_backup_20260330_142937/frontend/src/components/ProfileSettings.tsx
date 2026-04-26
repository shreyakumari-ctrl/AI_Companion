"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { getProfile, updateProfile } from "@/services/api";
import { useChatStore } from "@/store/chatStore";

interface ProfileData {
  name: string;
  email: string;
  bio: string;
}

export default function ProfileSettings() {
  const pushToast = useChatStore((state) => state.pushToast);
  const [profile, setProfile] = useState<ProfileData>({
    name: "",
    email: "",
    bio: "",
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

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

    getProfile()
      .then((data) => {
        if (!active) return;
        setProfile(data);
        reset(data);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        console.error("Profile load failed:", err);
        setServerError("Unable to load profile settings. Please refresh and try again.");
        setLoading(false);
        pushToast({ message: "Unable to load profile settings.", type: "error" });
      });

    return () => {
      active = false;
    };
  }, [pushToast, reset]);

  const onSubmit = async (data: ProfileData) => {
    const previousProfile = profile;
    setProfile(data);
    setSubmitting(true);
    pushToast({ message: "Updating profile...", type: "info" });

    try {
      const updated = await updateProfile(data);
      setProfile(updated);
      reset(updated, { keepValues: true });
      pushToast({ message: "Profile saved successfully.", type: "info" });
    } catch (err) {
      setProfile(previousProfile);
      reset(previousProfile);
      console.error("Profile save failed:", err);
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
