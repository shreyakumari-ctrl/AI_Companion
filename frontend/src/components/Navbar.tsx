"use client";

import React from "react";

const Navbar = () => {
  return (
    <nav className="navbar-glass">
      <div className="nav-container">
        <div className="logo">✨ Clidy AI</div>
        <div className="status">
          <span className="dot"></span> Online
        </div>
      </div>
      <style jsx>{`
        .navbar-glass {
          padding: 1rem 1.5rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(15, 23, 42, 0.8);
          backdrop-filter: blur(10px);
          position: sticky;
          top: 0;
          z-index: 50;
        }
        .nav-container {
          max-width: 1000px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .logo {
          font-size: 1.25rem;
          font-weight: 800;
          background: linear-gradient(135deg, #ff0080 0%, #7928ca 100%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .status {
          font-size: 0.8rem;
          color: #94a3b8;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .dot {
          width: 8px;
          height: 8px;
          background: #10b981;
          border-radius: 50%;
          box-shadow: 0 0 8px #10b981;
        }
      `}</style>
    </nav>
  );
};

export default Navbar;
