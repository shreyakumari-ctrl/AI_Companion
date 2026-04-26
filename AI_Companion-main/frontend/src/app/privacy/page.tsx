"use client";

import Link from "next/link";
import Navbar from "@/components/Navbar";

export default function PrivacyPage() {
  return (
    <div>
      <Navbar />
      <div className="shell">
        <section className="panel" style={{ maxHeight: "80vh", overflowY: "auto" }}>
          <div>
            <p className="section-label">Legal</p>
            <h1>Privacy Policy</h1>
            <p>
              This page summarizes how Clizel handles your information, what we collect, and how
              you can control your data.
            </p>
            <p>
              <Link href="/chat">Back to chat</Link>
            </p>
          </div>

          <details open>
            <summary>Information we collect</summary>
            <p>
              We collect account details you provide, usage data required to run the service, and
              content you submit to the app to generate responses.
            </p>
          </details>

          <details>
            <summary>How we use data</summary>
            <p>
              We use data to deliver the service, improve reliability, and personalize the
              experience. We do not sell your personal information.
            </p>
          </details>

          <details>
            <summary>Data retention</summary>
            <p>
              We retain data for as long as it is needed to provide the service or to meet legal
              obligations. You can request removal through support.
            </p>
          </details>

          <details>
            <summary>Your choices</summary>
            <p>
              You can update your profile details in settings and contact support with privacy or
              deletion requests.
            </p>
          </details>

          <details>
            <summary>Contact</summary>
            <p>
              For privacy questions, use the help center to reach our team.
            </p>
          </details>
        </section>
      </div>
    </div>
  );
}
