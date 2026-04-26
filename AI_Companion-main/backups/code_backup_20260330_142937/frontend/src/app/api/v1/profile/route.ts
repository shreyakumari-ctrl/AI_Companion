import { NextResponse } from "next/server";

interface ProfilePayload {
  name: string;
  email: string;
  bio: string;
}

let currentProfile: ProfilePayload = {
  name: "Clizel User",
  email: "hello@clizel.ai",
  bio: "A friendly AI companion who makes every interaction feel personal.",
};

function validateEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validatePayload(payload: Partial<ProfilePayload>) {
  if (!payload.name || !payload.name.trim()) {
    return "Name is required.";
  }

  if (!payload.email || !payload.email.trim()) {
    return "Email is required.";
  }

  if (!validateEmail(payload.email)) {
    return "Email address is invalid.";
  }

  if (!payload.bio || !payload.bio.trim()) {
    return "Bio is required.";
  }

  return null;
}

async function handleUpdate(request: Request) {
  try {
    const body = (await request.json()) as Partial<ProfilePayload>;
    const validationError = validatePayload(body);

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    currentProfile = {
      name: body.name!.trim(),
      email: body.email!.trim(),
      bio: body.bio!.trim(),
    };

    return NextResponse.json(currentProfile);
  } catch {
    return NextResponse.json(
      { error: "Unable to update profile at this time." },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json(currentProfile);
}

export async function POST(request: Request) {
  return handleUpdate(request);
}

export async function PUT(request: Request) {
  return handleUpdate(request);
}
