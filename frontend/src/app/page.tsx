"use client";

import React from "react";
import Link from "next/link";
import ToastContainer from "@/components/ToastContainer";

const features = [
  {
    icon: "💬",
    title: "Smart Conversations",
    desc: "Clizel understands context, emotion, and nuance for conversations that actually make sense.",
  },
  {
    icon: "😊",
    title: "Mood Support",
    desc: "Feeling down? Clizel listens, empathizes, and helps you work through whatever you're feeling.",
  },
  {
    icon: "📝",
    title: "Daily Help",
    desc: "Plan your day, set reminders, or get help with tasks. Clizel is your productivity buddy.",
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
    title: "Drop a thought",
    desc: "Send a question, a random late-night thought, or something you need help untangling.",
  },
  {
    num: "02",
    title: "Clizel reads the vibe",
    desc: "It picks up your tone, context, and intent so the reply feels personal instead of robotic.",
  },
  {
    num: "03",
    title: "Get a reply that lands",
    desc: "You get a thoughtful answer with warmth, clarity, and the kind of energy that actually feels human.",
  },
];

const previewMessages = [
  { sender: "ai", text: "Hey 👋 I'm Clizel! How are you feeling today?" },
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
      <nav className="navbar">
        <div className="navbar-inner">
          <div className="nav-logo">
            <img src="/logo-mark.png" alt="Clizel AI logo" className="brand-logo-image" />
          </div>
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

      <section className="hero-section" id="home">
        <div className="hero-bg-blob" />
        <div className="hero-bg-blob hero-bg-blob--2" />
        <div className="hero-content">
          <div className="hero-badge">✨ Your Friendly AI Companion</div>
          <h1 className="hero-title">Meet Clizel AI</h1>
          <p className="hero-subtitle">Your friendly AI companion</p>
          <p className="hero-desc">
            Clizel is more than just an AI — it&apos;s a caring companion that
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

      <section className="features-section" id="features">
        <div className="section-container">
          <div className="section-label">Features</div>
          <h2 className="section-title">
            Everything you need from an AI friend
          </h2>
          <p className="section-subtitle">
            Clizel blends intelligence with empathy to give you an experience
            that feels genuinely human.
          </p>
          <div className="features-grid">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="feature-card"
                style={{ animationDelay: `${index * 0.12}s` }}
              >
                <div className="feature-icon">{feature.icon}</div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-desc">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="how-section">
        <div className="section-container">
          <div className="section-label">How it works</div>
          <h2 className="section-title">It feels less like software, more like a real conversation</h2>
          <p className="section-subtitle how-section__subtitle">
            Fast enough for everyday use, thoughtful enough to feel personal, and smooth enough to keep the whole experience light.
          </p>
          <div className="steps-grid">
            {steps.map((step) => (
              <div key={step.num} className="step-card">
                <div className="step-card__glow" aria-hidden="true" />
                <div className="step-num">{step.num}</div>
                <h3 className="step-title">{step.title}</h3>
                <p className="step-desc">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="preview-section">
        <div className="section-container preview-inner">
          <div className="preview-text">
            <div className="section-label">Live Preview</div>
            <h2 className="section-title">See Clizel in action</h2>
            <p className="section-subtitle">
              Real conversations, real empathy. Clizel adapts to your mood and
              needs instantly.
            </p>
            <Link href="/chat" className="btn btn-primary">
              Try it yourself →
            </Link>
          </div>
          <div className="chat-preview-box">
            <div className="chat-preview-header">
              <div className="preview-dot" />
              <span className="preview-brand">
                <img src="/logo-mark.png" alt="Clizel AI logo" className="app-logo-mark preview-brand__logo" />
                <span>Clizel AI</span>
              </span>
              <span className="preview-status">● online</span>
            </div>
            <div className="chat-preview-messages">
              {previewMessages.map((message, index) => (
                <div
                  key={index}
                  className={`preview-bubble preview-bubble--${message.sender}`}
                  style={{ animationDelay: `${index * 0.25}s` }}
                >
                  {message.text}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="cta-section">
        <div className="cta-inner">
          <div className="cta-glow" />
          <div className="cta-orb cta-orb--one" aria-hidden="true" />
          <div className="cta-orb cta-orb--two" aria-hidden="true" />
          <p className="cta-eyebrow">Private. Personal. Always on.</p>
          <h2 className="cta-title">Start your journey with Clizel</h2>
          <p className="cta-desc">
            Step into a calmer, smarter chat experience that feels premium, personal, and genuinely easy to come back to.
          </p>
          <Link href="/chat" className="btn btn-white">
            Open Clizel →
          </Link>
          <p className="cta-note">Built for daily check-ins, deep chats, and the little moments in between.</p>
        </div>
      </section>

      <footer className="footer">
        <div className="footer-logo">
          <img src="/logo-mark.png" alt="Clizel AI logo" className="brand-logo-image" />
        </div>
        <p className="footer-tagline">Not just smart, but caring</p>
        <div className="footer-links">
          <a href="#home">Home</a>
          <a href="#features">Features</a>
          <Link href="/chat">Chat</Link>
        </div>
        <p className="footer-copy">© 2026 Clizel AI. Designed for more human conversations.</p>
      </footer>
      <ToastContainer />
    </div>
  );
}
