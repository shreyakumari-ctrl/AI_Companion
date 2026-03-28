"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import ToastContainer from "@/components/ToastContainer";

const ActivityFeed = React.lazy(() => import("@/components/ActivityFeed"));
const ProfileSettings = React.lazy(() => import("@/components/ProfileSettings"));

const features = [
  {
    icon: "💬",
    title: "Smart Conversations",
    desc: "Clidy understands context, emotion, and nuance for conversations that actually make sense.",
  },
  {
    icon: "😊",
    title: "Mood Support",
    desc: "Feeling down? Clidy listens, empathizes, and helps you work through whatever you're feeling.",
  },
  {
    icon: "📅",
    title: "Daily Help",
    desc: "Plan your day, set reminders, or get help with tasks — Clidy is your productivity buddy.",
  },
  {
    icon: "⚡",
    title: "Fast & Simple",
    desc: "Instant responses with a clean, distraction-free interface. No fluff, just help.",
  },
];

const steps = [
  {
    num: "01",
    title: "Type your message",
    desc: "Write anything — a question, a worry, or just a 'hi'.",
  },
  {
    num: "02",
    title: "Clidy understands",
    desc: "Clidy reads your tone, context, and intent carefully.",
  },
  {
    num: "03",
    title: "Get a helpful response",
    desc: "Receive a thoughtful, warm reply tailored just for you.",
  },
];

const previewMessages = [
  { sender: "ai", text: "Hey 👋 I'm Clidy! How are you feeling today?" },
  { sender: "user", text: "I'm a bit stressed about my project deadline 😞" },
  {
    sender: "ai",
    text: "I hear you! Deadlines can be tough. Want to break it down together? Sometimes that makes it feel much more manageable 💪",
  },
  { sender: "user", text: "That would actually be really helpful!" },
];

export default function LandingPage() {
  return (
    <div className="landing">
      {/* ── Navbar ─────────────────────────────────────── */}
      <nav className="navbar">
        <div className="navbar-inner">
          <div className="nav-logo">✨ Clidy AI</div>
          <ul className="nav-links">
            <li>
              <a href="#home">Home</a>
            </li>
            <li>
              <a href="#features">Features</a>
            </li>
            <li>
              <Link href="/chat">Chat</Link>
            </li>
          </ul>
          <Link href="/chat" className="nav-cta">
            Start Chatting →
          </Link>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────── */}
      <section className="hero-section" id="home">
        <div className="hero-bg-blob" />
        <div className="hero-bg-blob hero-bg-blob--2" />
        <div className="hero-content">
          <div className="hero-badge">✨ Your Friendly AI Companion</div>
          <h1 className="hero-title">Meet Clidy AI 💖</h1>
          <p className="hero-subtitle">Your friendly AI companion</p>
          <p className="hero-desc">
            Clidy is more than just an AI — it&apos;s a caring companion that
            listens, understands, and helps you navigate daily life with warmth
            and intelligence.
          </p>
          <div className="hero-actions">
            <Link href="/chat" className="btn btn-primary">
              Start Chatting 💬
            </Link>
            <a href="#features" className="btn btn-ghost">
              See Features ↓
            </a>
          </div>
          <div className="hero-stats">
            <div className="stat">
              <span className="stat-num">💯</span>
              <span>Always Available</span>
            </div>
            <div className="stat">
              <span className="stat-num">🤝</span>
              <span>Truly Caring</span>
            </div>
            <div className="stat">
              <span className="stat-num">⚡</span>
              <span>Instant Replies</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────── */}
      <section className="features-section" id="features">
        <div className="section-container">
          <div className="section-label">Features</div>
          <h2 className="section-title">
            Everything you need from an AI friend
          </h2>
          <p className="section-subtitle">
            Clidy blends intelligence with empathy to give you an experience
            that feels genuinely human.
          </p>
          <div className="features-grid">
            {features.map((f, i) => (
              <div
                key={f.title}
                className="feature-card"
                style={{ animationDelay: `${i * 0.12}s` }}
              >
                <div className="feature-icon">{f.icon}</div>
                <h3 className="feature-title">{f.title}</h3>
                <p className="feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ────────────────────────────────── */}
      <section className="how-section">
        <div className="section-container">
          <div className="section-label">How it works</div>
          <h2 className="section-title">Simple, fast, and human-like</h2>
          <div className="steps-grid">
            {steps.map((s) => (
              <div key={s.num} className="step-card">
                <div className="step-num">{s.num}</div>
                <h3 className="step-title">{s.title}</h3>
                <p className="step-desc">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Chat Preview ────────────────────────────────── */}
      <section className="preview-section">
        <div className="section-container preview-inner">
          <div className="preview-text">
            <div className="section-label">Live Preview</div>
            <h2 className="section-title">See Clidy in action</h2>
            <p className="section-subtitle">
              Real conversations, real empathy. Clidy adapts to your mood and
              needs instantly.
            </p>
            <Link href="/chat" className="btn btn-primary">
              Try it yourself →
            </Link>
          </div>
          <div className="chat-preview-box">
            <div className="chat-preview-header">
              <div className="preview-dot" />
              <span>✨ Clidy AI</span>
              <span className="preview-status">● online</span>
            </div>
            <div className="chat-preview-messages">
              {previewMessages.map((m, i) => (
                <div
                  key={i}
                  className={`preview-bubble preview-bubble--${m.sender}`}
                  style={{ animationDelay: `${i * 0.25}s` }}
                >
                  {m.text}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Suspense fallback={<div className="dashboard-loading-panel">Loading dashboard…</div>}>
        <section className="dashboard-section" id="dashboard">
          <div className="section-container">
            <div className="section-label">Dashboard</div>
            <h2 className="section-title">Live activity feed & profile settings</h2>
            <p className="section-subtitle">
              Stay in sync with recent events and update your profile without leaving the app.
            </p>
            <div className="dashboard-grid">
              <ActivityFeed />
              <ProfileSettings />
            </div>
          </div>
        </section>
      </Suspense>

      {/* ── CTA ─────────────────────────────────────────── */}
      <section className="cta-section">
        <div className="cta-inner">
          <div className="cta-glow" />
          <h2 className="cta-title">Start your journey with Clidy 💫</h2>
          <p className="cta-desc">
            Join the experience of having an AI that truly cares about you.
          </p>
          <Link href="/chat" className="btn btn-white">
            Try Now — It&apos;s Free ✨
          </Link>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────── */}
      <footer className="footer">
        <div className="footer-logo">✨ Clidy AI</div>
        <p className="footer-tagline">Not just smart, but caring</p>
        <div className="footer-links">
          <a href="#home">Home</a>
          <a href="#features">Features</a>
          <Link href="/chat">Chat</Link>
        </div>
        <p className="footer-copy">© 2025 Clidy AI. Made with 💜</p>
      </footer>
      <ToastContainer />
    </div>
  );
}
