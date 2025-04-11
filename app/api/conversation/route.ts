import { NextResponse } from "next/server";
import type { DetectedAction } from "@/types";

// In-memory storage since we don't have a database
let conversations: {
  id: string;
  timestamp: string;
  conversation: any[];
  summary: string;
  actions: DetectedAction[];
}[] = [];

export async function POST(request: Request) {
  try {
    const { conversation, summary, actions } = await request.json();

    // Create a new conversation entry
    const newConversation = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      conversation,
      summary: summary || "",
      actions: actions || [],
    };

    // Store the conversation (in a real app, you'd save to a database)
    conversations.unshift(newConversation); // Add to beginning of array

    // Keep only the last 10 conversations to prevent memory issues
    if (conversations.length > 10) {
      conversations = conversations.slice(0, 10);
    }

    return NextResponse.json({ success: true, id: newConversation.id });
  } catch (error) {
    console.error("Error saving conversation:", error);
    return NextResponse.json(
      { error: "Failed to save conversation data" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const latest = searchParams.get("latest");
    const id = searchParams.get("id");

    // Return the latest conversation
    if (latest === "true" && conversations.length > 0) {
      return NextResponse.json(conversations[0]);
    }

    // Return a specific conversation by ID
    if (id) {
      const conversation = conversations.find((conv) => conv.id === id);
      if (conversation) {
        return NextResponse.json(conversation);
      }
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    // Return all conversations
    return NextResponse.json(conversations);
  } catch (error) {
    console.error("Error retrieving conversations:", error);
    return NextResponse.json(
      { error: "Failed to retrieve conversation data" },
      { status: 500 }
    );
  }
}
