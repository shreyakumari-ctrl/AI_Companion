import { NextResponse } from "next/server";

const activityFeed = [
  {
    id: "activity-1",
    title: "Signed in successfully",
    description: "Welcome back! Your session started smoothly.",
    category: "login",
    timestamp: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
  },
  {
    id: "activity-2",
    title: "Profile updated",
    description: "Your personal details were saved successfully.",
    category: "update",
    timestamp: new Date(Date.now() - 1000 * 60 * 22).toISOString(),
  },
  {
    id: "activity-3",
    title: "New chat message",
    description: "A user asked a question from the dashboard.",
    category: "message",
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
  {
    id: "activity-4",
    title: "Task completed",
    description: "Daily summary generation finished successfully.",
    category: "task",
    timestamp: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
  },
];

export async function GET() {
  return NextResponse.json(activityFeed);
}
