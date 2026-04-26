import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { GoogleOAuthProvider } from '@react-oauth/google';
import "./globals.css";

export const metadata: Metadata = {
  title: "Clizel AI — Your Friendly AI Companion",
  description:
    "Clizel AI is a lovable, caring AI companion that helps you with conversations, emotional support, and daily tasks.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const themeInitScript = `
    (function () {
      try {
        var key = "clizel-theme-mode";
        var stored = window.localStorage.getItem(key);
        var mode = stored === "light" || stored === "dark" ? stored : "dark";
        document.documentElement.setAttribute("data-theme", mode);
      } catch (error) {
        document.documentElement.setAttribute("data-theme", "dark");
      }
    })();
  `;

  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      data-theme="dark"
      suppressHydrationWarning
    >
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <GoogleOAuthProvider clientId="719530223077-60v1vtkql9phm6cuk04jh0u34854hi3l.apps.googleusercontent.com">
      {children}
        </GoogleOAuthProvider>
      </body>
    </html>
  );
}
