import Link from "next/link";
import ActivityFeed from "@/components/ActivityFeed";
import ToastContainer from "@/components/ToastContainer";

export default function ActivityPage() {
  return (
    <main className="activity-page">
      <div className="activity-page__inner">
        <div className="activity-page__nav">
          <Link href="/chat" className="activity-page__back">
            Back to chat
          </Link>
        </div>
        <ActivityFeed />
      </div>
      <ToastContainer />
    </main>
  );
}
