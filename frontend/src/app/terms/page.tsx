"use client";

import Link from "next/link";
import Navbar from "@/components/Navbar";

export default function TermsPage() {
  return (
    <div>
      <Navbar />
      <div className="shell">
        <section className="panel" style={{ maxHeight: "80vh", overflowY: "auto" }}>
          <div>
            <p className="section-label">Legal</p>
            <h1>Terms of Service</h1>
            <p>
              These terms explain how you can use Clizel, what you can expect from us, and how we
              handle responsibility and service updates.
            </p>
            <p>
              <Link href="/chat">Back to chat</Link>
            </p>
          </div>

          <details open>
            <summary>Using Clizel responsibly</summary>
            <p>
              Use Clizel for lawful, respectful, and safe purposes. Do not attempt to abuse,
              reverse-engineer, or harm the service, other users, or third-party systems.
            </p>
          </details>

          <details>
            <summary>Account and security</summary>
            <p>
              You are responsible for safeguarding your account credentials and activity that
              occurs under your account. Notify us if you believe your account has been compromised.
            </p>
          </details>

          <details>
            <summary>Subscription and billing</summary>
            <p>
              Subscription access and pricing may change as we improve the product. You will always
              see updated plan details on the pricing page before confirming an upgrade.
            </p>
          </details>

          <details>
            <summary>Service changes</summary>
            <p>
              We may update features, availability, or functionality over time. We will aim to keep
              the core experience reliable and communicate meaningful changes.
            </p>
          </details>

          <details>
            <summary>Contact</summary>
            <p>
              Questions? Reach out to support through the help center for the fastest response.
            </p>
          </details>
        </section>
      </div>
    </div>
  );
}
