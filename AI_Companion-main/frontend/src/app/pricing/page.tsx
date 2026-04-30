"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { useChatStore } from "@/store/chatStore";

type Plan = {
  name: string;
  price: string;
  models: string;
  features: string[];
  margin: string;
  isPro: boolean;
};

type PaymentStatus = "idle" | "processing" | "success" | "failure";

type PaymentState = {
  status: PaymentStatus;
  planId: string | null;
  planLabel: string | null;
  isPro: boolean;
  error?: string | null;
};

const pricingData: Record<string, Plan[]> = {
  Student: [
    {
      name: "Core",
      price: "Rs 199",
      models: "GPT-4o Mini / Haiku",
      features: ["Homework help", "Quick explainers", "Everyday social scripts"],
      margin: "High efficiency",
      isPro: false,
    },
    {
      name: "Plus",
      price: "Rs 499",
      models: "GPT-4o / Claude 3.5 Sonnet",
      features: ["Deep research", "PDF analysis", "Project and thesis support"],
      margin: "Balanced premium",
      isPro: true,
    },
  ],
  Personal: [
    {
      name: "Core",
      price: "Rs 249",
      models: "GPT-4o / Gemini Flash",
      features: ["24/7 companion", "Mood-aware replies", "Social script support"],
      margin: "Healthy value",
      isPro: false,
    },
    {
      name: "Plus",
      price: "Rs 599",
      models: "Multimodal image + voice",
      features: ["Hyper-personalized AI", "Voice sessions", "Image generation"],
      margin: "Premium tier",
      isPro: true,
    },
  ],
  Business: [
    {
      name: "Core",
      price: "Rs 1,999",
      models: "GPT-4o / Claude Opus",
      features: ["Content workflows", "Team bot", "Social media support", "Up to 5 team members"],
      margin: "Strong scale",
      isPro: false,
    },
    {
      name: "Scale",
      price: "Rs 7,999",
      models: "Dedicated API / Enterprise models",
      features: ["Custom AI training", "CRM integration", "Priority support", "Unlimited team seats + API access"],
      margin: "White-glove premium",
      isPro: true,
    },
  ],
};

const PricingPage = () => {
  const [activeTab, setActiveTab] = useState<string>("Student");
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [paymentState, setPaymentState] = useState<PaymentState>({
    status: "idle",
    planId: null,
    planLabel: null,
    isPro: false,
    error: null,
  });
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const updateUserProfile = useChatStore((state) => state.updateUserProfile);
  const pushToast = useChatStore((state) => state.pushToast);
  const userProfile = useChatStore((state) => state.userProfile);

  const categories = ["Student", "Personal", "Business"];

  const buildPlanId = (category: string, name: string) =>
    `${category}_${name}`.toLowerCase().replace(/\s+/g, "_");

  const buildPlanLabel = (category: string, name: string) => `${category} ${name}`;

  const findPlanById = (planId: string) => {
    for (const category of Object.keys(pricingData)) {
      const matchedPlan = pricingData[category].find(
        (plan) => buildPlanId(category, plan.name) === planId,
      );
      if (matchedPlan) {
        return { category, plan: matchedPlan };
      }
    }
    return null;
  };

  const parsePriceToPaise = (price: string) => {
    const numeric = Number(price.replace(/[^\d.]/g, ""));
    if (Number.isNaN(numeric)) return 0;
    return Math.round(numeric * 100);
  };

  const persistSelection = (planId: string) => {
    localStorage.setItem("userPlan", planId);
    setSelectedPlanId(planId);
  };

  const handlePaymentSuccess = (planLabel: string, planId: string, isPro: boolean) => {
    updateUserProfile({
      userPlan: planLabel,
      isPro,
    });

    localStorage.setItem("userPlan", planId);
    localStorage.setItem("userPlanLabel", planLabel);
    localStorage.setItem("userPlanIsPro", String(isPro));

    setPaymentState({
      status: "success",
      planId,
      planLabel,
      isPro,
      error: null,
    });
    setPaymentModalOpen(true);

    pushToast({
      message: `Payment Successful 🎉 You are now on ${planLabel}.`,
      type: "info",
    });
  };

  const handlePaymentFailure = (
    message: string,
    planLabel: string,
    planId: string,
    isPro: boolean,
  ) => {
    setPaymentState({
      status: "failure",
      planId,
      planLabel,
      isPro,
      error: message,
    });
    setPaymentModalOpen(true);

    pushToast({
      message: "Payment Failed ❌ Please try again.",
      type: "error",
    });
  };

  const loadRazorpayScript = () =>
    new Promise<boolean>((resolve) => {
      if (typeof window === "undefined") {
        resolve(false);
        return;
      }

      if ((window as Window & { Razorpay?: unknown }).Razorpay) {
        resolve(true);
        return;
      }

      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });

  const openRazorpayCheckout = async (plan: Plan, planLabel: string, planId: string) => {
    const razorpayKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY;
    if (!razorpayKey) return false;

    const loaded = await loadRazorpayScript();
    if (!loaded) return false;

    const RazorpayConstructor = (window as Window & { Razorpay?: any }).Razorpay;
    if (!RazorpayConstructor) return false;

    const amount = parsePriceToPaise(plan.price);
    const options = {
      key: razorpayKey,
      amount,
      currency: "INR",
      name: "Clizel",
      description: `${planLabel} subscription`,
      prefill: {
        name: userProfile.displayName,
        email: userProfile.email,
      },
      theme: {
        color: "#2563eb",
      },
      handler: () => {
        handlePaymentSuccess(planLabel, planId, plan.isPro);
        setProcessingPlan(null);
      },
      modal: {
        ondismiss: () => {
          handlePaymentFailure("Payment was cancelled.", planLabel, planId, plan.isPro);
          setProcessingPlan(null);
        },
      },
    };

    const instance = new RazorpayConstructor(options);
    instance.on("payment.failed", () => {
      handlePaymentFailure("Payment failed. Please retry.", planLabel, planId, plan.isPro);
      setProcessingPlan(null);
    });
    instance.open();
    return true;
  };

  const runSimulatedPayment = async (plan: Plan, planLabel: string, planId: string) => {
    setPaymentState({
      status: "processing",
      planId,
      planLabel,
      isPro: plan.isPro,
      error: null,
    });
    setPaymentModalOpen(true);

    await new Promise((resolve) => setTimeout(resolve, 1800));

    const isSuccess = Math.random() > 0.2;
    if (isSuccess) {
      handlePaymentSuccess(planLabel, planId, plan.isPro);
    } else {
      handlePaymentFailure("Payment failed. Please retry.", planLabel, planId, plan.isPro);
    }

    setProcessingPlan(null);
  };

  const startUpgrade = async (plan: Plan, category: string) => {
    if (processingPlan) return;

    const planLabel = buildPlanLabel(category, plan.name);
    const planId = buildPlanId(category, plan.name);

    setProcessingPlan(planId);
    persistSelection(planId);
    pushToast({
      message: `Initiating ${planLabel} checkout...`,
      type: "info",
    });

    const razorpayOpened = await openRazorpayCheckout(plan, planLabel, planId);
    if (!razorpayOpened) {
      await runSimulatedPayment(plan, planLabel, planId);
    }

    /*
    // Simulate Payment Processing
    await new Promise(resolve => setTimeout(resolve, 2000));

    // For demonstration, we always succeed
    const isSuccess = true;

    if (isSuccess) {
      updateUserProfile({
        userPlan: `${activeTab} ${plan.name}`,
        isPro: plan.isPro
      });

      pushToast({
        message: `Payment Successful! 🎉 You are now on ${activeTab} ${plan.name}`,
        type: "info"
      });
      
      // Save to localStorage for persistence (redundant with store persistence but good for explicit requirement)
      localStorage.setItem("userPlan", `${activeTab} ${plan.name}`);
    } else {
      pushToast({
        message: "Payment Failed ❌ Please try again.",
        type: "error"
      });
    }

    setProcessingPlan(null);
    */
  };

  const handleUpgrade = (plan: Plan) => {
    void startUpgrade(plan, activeTab);
  };

  const closePaymentModal = () => {
    if (paymentState.status === "processing") return;
    setPaymentModalOpen(false);
    setPaymentState((prev) => ({
      ...prev,
      status: "idle",
      error: null,
    }));
  };

  const handleRetryPayment = () => {
    if (!paymentState.planId) return;
    const entry = findPlanById(paymentState.planId);
    if (!entry) return;
    setActiveTab(entry.category);
    setPaymentModalOpen(false);
    void startUpgrade(entry.plan, entry.category);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedPlanId = localStorage.getItem("userPlan");
    if (storedPlanId) {
      setSelectedPlanId(storedPlanId);
      return;
    }

    const profilePlan = userProfile.userPlan;
    if (!profilePlan) return;
    const matchedCategory = Object.keys(pricingData).find((category) =>
      pricingData[category].some((plan) => buildPlanLabel(category, plan.name) === profilePlan),
    );
    if (matchedCategory) {
      const matchedPlan = pricingData[matchedCategory].find(
        (plan) => buildPlanLabel(matchedCategory, plan.name) === profilePlan,
      );
      if (matchedPlan) {
        setSelectedPlanId(buildPlanId(matchedCategory, matchedPlan.name));
      }
    }
  }, [userProfile.userPlan]);

  return (
    <div className="pricing-wrapper">
      <Navbar />

      <main className="pricing-content">
        <section className="pricing-hero">
          <div className="pricing-hero__topbar">
            <span className="pricing-kicker">Upgrade</span>
            <Link href="/chat" className="back-to-chat">
              <span aria-hidden="true">←</span>
              <span>Back to Chat</span>
            </Link>
          </div>

          <header className="pricing-header">
            <p className="pricing-eyebrow">Simple upgrade options</p>
            <h1 className="pricing-title">Choose a plan that fits your flow</h1>
            <p className="pricing-subtitle">
              Clean pricing, better tools, and a smoother Clizel experience for daily chats, creative work, and
              advanced support.
            </p>

            <div className="category-toggle" aria-label="Plan categories">
              {categories.map((category) => (
                <button
                  key={category}
                  className={`toggle-tab ${activeTab === category ? "active" : ""}`}
                  onClick={() => setActiveTab(category)}
                >
                  {category}
                </button>
              ))}
            </div>
          </header>
        </section>

        <section className="plans-grid">
          {pricingData[activeTab].map((plan) => {
            const planId = buildPlanId(activeTab, plan.name);
            const planLabel = buildPlanLabel(activeTab, plan.name);
            const isSelected = selectedPlanId === planId;
            const isCurrentPlan = userProfile.userPlan === planLabel;
            const isProcessing = processingPlan === planId;

            return (
              <article
                key={plan.name}
                className={`plan-card ${plan.isPro ? "pro" : ""} ${isSelected ? "is-selected" : ""}`}
                aria-current={isSelected ? "true" : undefined}
              >
                {plan.isPro ? <div className="popular-badge">Recommended</div> : null}
                {isSelected ? <div className="selected-badge">Selected</div> : null}

              <div className="plan-header">
                <div className="plan-name-group">
                  <div>
                    <h2 className="plan-name">{plan.name}</h2>
                    <p className="plan-label">{activeTab} plan</p>
                  </div>
                  <span className="category-badge">{plan.isPro ? "Best value" : "Starter"}</span>
                </div>

                <div className="plan-price">
                  <span className="amount">{plan.price}</span>
                  <span className="period">per month</span>
                </div>
              </div>

              <div className="plan-info">
                <div className="plan-meta-card">
                  <span className="plan-meta-card__label">Included models</span>
                  <strong>{plan.models}</strong>
                </div>

                <ul className="feature-list">
                  {plan.features.map((feature) => (
                    <li key={feature} className="feature-item">
                      <span className="check-icon">+</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="plan-footer">
                <div className="meta-info">
                  <span className="margin-pill">{plan.margin}</span>
                </div>

                <div className="plan-actions">
                  <button
                    className={`upgrade-btn ${isProcessing ? "processing" : ""}`}
                    onClick={() => handleUpgrade(plan)}
                    disabled={processingPlan !== null}
                  >
                    <span>
                      {isProcessing
                        ? "Processing payment..."
                        : isCurrentPlan
                          ? "Current Plan"
                          : plan.isPro
                            ? "Upgrade Now"
                            : "Choose Plan"}
                    </span>
                  </button>
                </div>
              </div>
            </article>
            );
          })}
        </section>
      </main>

      {paymentModalOpen ? (
        <div
          className="overlay-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Payment status"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closePaymentModal();
            }
          }}
        >
          <div className="auth-modal__card payment-modal">
            <button
              type="button"
              className="auth-modal__close"
              onClick={closePaymentModal}
              aria-label="Close payment modal"
              disabled={paymentState.status === "processing"}
            >
              ×
            </button>
            <div className="auth-modal__body payment-modal__body">
              {paymentState.status === "processing" ? (
                <>
                  <div className="payment-spinner" aria-hidden="true" />
                  <h3>Processing payment...</h3>
                  <p>Hold tight while we confirm your upgrade.</p>
                </>
              ) : paymentState.status === "success" ? (
                <>
                  <h3>Payment Successful 🎉</h3>
                  <p>
                    Your plan is now {paymentState.planLabel ?? "updated"}. Enjoy the premium experience.
                  </p>
                  <button type="button" className="btn btn-primary" onClick={closePaymentModal}>
                    Continue
                  </button>
                </>
              ) : (
                <>
                  <h3>Payment Failed ❌</h3>
                  <p>{paymentState.error ?? "Something went wrong. Please retry."}</p>
                  <button type="button" className="btn btn-primary" onClick={handleRetryPayment}>
                    Retry payment
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}

      <style jsx>{`
        .pricing-wrapper {
          min-height: 100vh;
          background:
            radial-gradient(circle at top, rgba(59, 130, 246, 0.1), transparent 30%),
            linear-gradient(180deg, #0b1120 0%, #0f172a 100%);
          color: #f8fafc;
          font-family: inherit;
        }

        .pricing-content {
          max-width: 1080px;
          margin: 0 auto;
          padding: 2rem 1.5rem 4rem;
          display: grid;
          gap: 1.5rem;
          width: 100%;
          box-sizing: border-box;
        }

        .pricing-hero {
          border: 1px solid rgba(148, 163, 184, 0.14);
          border-radius: 24px;
          padding: 1.6rem;
          background: rgba(15, 23, 42, 0.72);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.05),
            0 18px 40px rgba(2, 6, 23, 0.24);
        }

        .pricing-hero__topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .pricing-kicker {
          display: inline-flex;
          align-items: center;
          min-height: 34px;
          padding: 0 0.9rem;
          border-radius: 999px;
          border: 1px solid rgba(96, 165, 250, 0.18);
          background: rgba(37, 99, 235, 0.08);
          color: #cfe4ff;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .back-to-chat {
          display: inline-flex;
          align-items: center;
          gap: 0.55rem;
          min-height: 42px;
          padding: 0 1rem;
          border-radius: 999px;
          border: 1px solid rgba(148, 163, 184, 0.2);
          background: rgba(255, 255, 255, 0.03);
          color: #e2e8f0;
          text-decoration: none;
          font-size: 0.92rem;
          font-weight: 600;
          transition: border-color 180ms ease, background 180ms ease;
        }

        .back-to-chat:hover {
          border-color: rgba(96, 165, 250, 0.3);
          background: rgba(255, 255, 255, 0.05);
        }

        .pricing-header {
          display: grid;
          gap: 1rem;
        }

        .pricing-eyebrow {
          color: #93c5fd;
          font-size: 0.76rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          margin: 0;
        }

        .pricing-title {
          max-width: 640px;
          margin: 0;
          font-size: clamp(2.2rem, 5vw, 3.5rem);
          line-height: 1;
          font-weight: 800;
          letter-spacing: -0.03em;
          color: #f8fafc;
        }

        .pricing-subtitle {
          max-width: 620px;
          margin: 0;
          color: #94a3b8;
          font-size: 1rem;
          line-height: 1.7;
        }

        .category-toggle {
          display: inline-flex;
          flex-wrap: wrap;
          width: fit-content;
          max-width: 100%;
          gap: 0.35rem;
          padding: 0.35rem;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(148, 163, 184, 0.12);
          box-sizing: border-box;
        }

        .toggle-tab {
          min-height: 40px;
          padding: 0 1rem;
          border-radius: 999px;
          font-weight: 600;
          font-size: 0.88rem;
          transition: all 0.25s ease;
          color: #94a3b8;
          background: transparent;
        }

        .toggle-tab.active {
          background: #2563eb;
          color: #ffffff;
          box-shadow: 0 8px 20px rgba(37, 99, 235, 0.2);
        }

        .plans-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1.25rem;
        }

        .plan-card {
          position: relative;
          min-height: 100%;
          padding: 1.5rem;
          border-radius: 22px;
          border: 1px solid rgba(148, 163, 184, 0.14);
          background: rgba(15, 23, 42, 0.68);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.04),
            0 16px 32px rgba(2, 6, 23, 0.18);
          display: flex;
          flex-direction: column;
          transition: transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease;
        }

        .plan-card:hover {
          transform: translateY(-2px);
          border-color: rgba(96, 165, 250, 0.22);
          box-shadow: 0 20px 34px rgba(2, 6, 23, 0.24);
        }

        .plan-card.pro {
          border-color: rgba(96, 165, 250, 0.28);
          background: linear-gradient(180deg, rgba(20, 32, 57, 0.86), rgba(15, 23, 42, 0.72));
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.05),
            0 18px 36px rgba(2, 6, 23, 0.22);
        }

        .plan-card.is-selected {
          border-color: rgba(96, 165, 250, 0.45);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.06),
            0 0 0 2px rgba(96, 165, 250, 0.12),
            0 18px 36px rgba(2, 6, 23, 0.24);
        }

        .selected-badge {
          min-height: 30px;
          width: fit-content;
          padding: 0 0.8rem;
          margin-bottom: 1rem;
          border-radius: 999px;
          background: rgba(96, 165, 250, 0.12);
          border: 1px solid rgba(96, 165, 250, 0.2);
          color: #dbeafe;
          display: inline-flex;
          align-items: center;
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .popular-badge {
          min-height: 30px;
          width: fit-content;
          padding: 0 0.8rem;
          margin-bottom: 1rem;
          border-radius: 999px;
          background: rgba(37, 99, 235, 0.12);
          border: 1px solid rgba(96, 165, 250, 0.18);
          color: #dbeafe;
          display: inline-flex;
          align-items: center;
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .plan-header {
          display: grid;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .plan-name-group {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .plan-name {
          margin: 0;
          font-size: 1.65rem;
          font-weight: 700;
          letter-spacing: -0.03em;
        }

        .plan-label {
          margin: 0.3rem 0 0;
          color: #94a3b8;
          font-size: 0.86rem;
        }

        .category-badge {
          min-height: 30px;
          padding: 0 0.7rem;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(148, 163, 184, 0.14);
          display: inline-flex;
          align-items: center;
          color: #cbd5e1;
          font-size: 0.72rem;
          text-transform: uppercase;
          font-weight: 700;
          letter-spacing: 0.06em;
          white-space: nowrap;
        }

        .plan-price {
          display: flex;
          align-items: baseline;
          gap: 0.45rem;
        }

        .amount {
          font-size: clamp(2.1rem, 5vw, 3rem);
          font-weight: 800;
          letter-spacing: -0.04em;
        }

        .period {
          color: #94a3b8;
          font-size: 0.94rem;
          font-weight: 600;
        }

        .plan-info {
          flex: 1;
          display: grid;
          gap: 1rem;
        }

        .plan-meta-card {
          padding: 0.95rem 1rem;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.035);
          border: 1px solid rgba(148, 163, 184, 0.12);
          display: grid;
          gap: 0.3rem;
        }

        .plan-meta-card__label {
          font-size: 0.72rem;
          color: #93c5fd;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-weight: 700;
        }

        .plan-meta-card strong {
          color: #e2e8f0;
          font-size: 0.95rem;
          line-height: 1.55;
          overflow-wrap: anywhere;
        }

        .feature-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: grid;
          gap: 0.85rem;
        }

        .feature-item {
          display: flex;
          align-items: flex-start;
          gap: 0.7rem;
          color: #e2e8f0;
          font-size: 0.92rem;
          line-height: 1.5;
        }

        .check-icon {
          width: 22px;
          height: 22px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: rgba(37, 99, 235, 0.12);
          border: 1px solid rgba(96, 165, 250, 0.18);
          color: #93c5fd;
          font-size: 0.9rem;
          font-weight: 700;
          flex-shrink: 0;
        }

        .plan-footer {
          margin-top: 1.4rem;
          display: grid;
          gap: 0.9rem;
        }

        .meta-info {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.8rem;
          flex-wrap: wrap;
        }

        .margin-pill {
          min-height: 28px;
          padding: 0 0.7rem;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(148, 163, 184, 0.12);
          color: #cbd5e1;
          font-size: 0.72rem;
          font-weight: 600;
        }

        .plan-actions {
          display: grid;
          gap: 0.8rem;
        }

        .upgrade-btn {
          width: 100%;
          min-height: 50px;
          border-radius: 14px;
          background: #2563eb;
          color: #ffffff;
          padding: 0 1rem;
          font-weight: 700;
          font-size: 0.94rem;
          box-shadow: 0 12px 24px rgba(37, 99, 235, 0.18);
          transition: filter 180ms ease, box-shadow 180ms ease;
        }

        .upgrade-btn.processing {
          opacity: 0.7;
          cursor: not-allowed;
          filter: grayscale(0.5);
        }

        .plan-card.pro .upgrade-btn {
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
          box-shadow: 0 14px 26px rgba(37, 99, 235, 0.22);
        }

        .upgrade-btn:hover {
          filter: brightness(1.05);
          box-shadow: 0 16px 28px rgba(37, 99, 235, 0.24);
        }

        .payment-modal {
          width: min(100%, 420px);
        }

        .payment-modal__body {
          text-align: center;
          gap: 14px;
        }

        .payment-modal__body h3 {
          margin: 0;
          font-size: 1.2rem;
          font-weight: 700;
        }

        .payment-modal__body p {
          margin: 0;
          color: #4b5563;
        }

        .payment-spinner {
          width: 42px;
          height: 42px;
          margin: 0 auto;
          border-radius: 50%;
          border: 3px solid rgba(96, 165, 250, 0.25);
          border-top-color: #60a5fa;
          animation: paymentSpin 0.9s linear infinite;
        }

        @keyframes paymentSpin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 980px) {
          .plans-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .pricing-content {
            padding: 1rem 0.85rem 2.5rem;
            gap: 1rem;
          }

          .pricing-hero {
            padding: 1rem;
            border-radius: 20px;
          }

          .pricing-hero__topbar {
            align-items: center;
            flex-direction: row;
            justify-content: space-between;
            margin-bottom: 1.2rem;
          }

          .pricing-title {
            font-size: 1.95rem;
            line-height: 1.05;
          }

          .pricing-subtitle {
            font-size: 0.92rem;
            line-height: 1.6;
          }

          .pricing-kicker {
            min-height: 30px;
            padding: 0 0.75rem;
            font-size: 0.68rem;
          }

          .back-to-chat {
            min-height: 38px;
            padding: 0 0.8rem;
            font-size: 0.82rem;
          }

          .category-toggle {
            width: 100%;
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            border-radius: 18px;
          }

          .toggle-tab {
            min-width: 0;
            padding: 0 0.6rem;
            font-size: 0.8rem;
          }

          .plan-card {
            padding: 1rem;
            border-radius: 20px;
          }

          .meta-info {
            flex-direction: column;
            align-items: flex-start;
          }

          .plan-header {
            gap: 0.8rem;
            margin-bottom: 1rem;
          }

          .plan-name {
            font-size: 1.4rem;
          }

          .plan-price {
            flex-wrap: wrap;
            gap: 0.25rem 0.5rem;
          }

          .amount {
            font-size: 1.9rem;
          }

          .feature-item {
            font-size: 0.88rem;
          }

          .upgrade-btn {
            min-height: 46px;
            font-size: 0.9rem;
          }

          .popular-badge {
            margin-bottom: 1rem;
          }
        }

        @media (max-width: 420px) {
          .pricing-content {
            padding-inline: 0.75rem;
          }

          .pricing-hero__topbar {
            flex-direction: column;
            align-items: stretch;
          }

          .back-to-chat {
            width: 100%;
            justify-content: center;
          }

          .pricing-title {
            font-size: 1.75rem;
          }

          .category-toggle {
            grid-template-columns: 1fr;
          }

          .plan-card {
            padding: 0.95rem;
          }

          .category-badge,
          .margin-pill,
          .popular-badge {
            font-size: 0.68rem;
          }
        }
      `}</style>
    </div>
  );
};

export default PricingPage;
