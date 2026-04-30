"use client";

import React from "react";
import Link from "next/link";

const Navbar = () => {
  return (
    <nav className="navbar-glass">
      <div className="nav-container">
        <div className="nav-left">
          <Link href="/" className="logo">
            <img src="/logo-mark.png" alt="Clizel AI logo" className="brand-logo-image" />
          </Link>
        </div>
        <div className="status">
          <span className="dot"></span> Online
        </div>
      </div>
      <style jsx>{`
        .navbar-glass {
          padding: 0.8rem 1.5rem;
          border-bottom: 1px solid rgba(148, 163, 184, 0.1);
          background: rgba(255, 255, 255, 0.78);
          backdrop-filter: blur(12px);
          position: sticky;
          top: 0;
          z-index: 100;
        }
        .nav-container {
          max-width: 1100px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .nav-left {
          display: flex;
          align-items: center;
          gap: 2.5rem;
        }
        .logo {
          display: inline-flex;
          align-items: center;
        }
        .brand-logo-image {
          height: 28px;
          width: auto;
          filter: brightness(0) saturate(100%);
          transition: filter 0.3s ease, transform 0.3s ease;
        }
        .brand-logo-image:hover {
          transform: scale(1.05);
        }
        :global([data-theme="dark"]) .brand-logo-image {
          filter: brightness(0) invert(1);
        }
        .status {
          font-size: 0.8rem;
          color: #475569;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 600;
        }
        .dot {
          width: 8px;
          height: 8px;
          background: #10b981;
          border-radius: 50%;
          box-shadow: 0 0 10px #10b981;
        }
        :global([data-theme="dark"]) .navbar-glass {
          border-bottom-color: rgba(255, 255, 255, 0.1);
          background: rgba(15, 23, 42, 0.8);
        }
        :global([data-theme="dark"]) .status {
          color: #94a3b8;
        }
      `}</style>
    </nav>
  );
};

export default Navbar;
