import { NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { DetectedAction } from "@/types";

// Initialize Supabase client with better error handling
let supabase: SupabaseClient | null = null;

try {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase environment variables");
  } else {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log("Supabase client initialized for conversation API");
  }
} catch (error) {
  console.error("Failed to initialize Supabase client:", error);
}

// Fallback to in-memory storage if Supabase is not available
let inMemoryConversations: {
  id: string;
  timestamp: string;
  conversation: any[];
  summary: string;
  actions: DetectedAction[];
}[] = [];

export async function POST(request: Request) {
  try {
    const { conversation, summary, actions } = await request.json();

    // If Supabase is unavailable, fall back to in-memory storage
    if (!supabase) {
      console.warn("Supabase unavailable, using in-memory storage");
      const newConversation = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        conversation,
        summary: summary || "",
        actions: actions || [],
      };

      inMemoryConversations.unshift(newConversation);
      if (inMemoryConversations.length > 10) {
        inMemoryConversations = inMemoryConversations.slice(0, 10);
      }

      return NextResponse.json({
        success: true,
        id: newConversation.id,
        warning: "Using in-memory storage (not persistent)",
      });
    }

    // Save to Supabase
    // 1. Insert the conversation
    const { data: conversationData, error: conversationError } = await supabase
      .from("conversations")
      .insert({
        conversation_data: conversation,
        summary: summary || null,
        created_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (conversationError) {
      console.error(
        "Error saving conversation to Supabase:",
        conversationError
      );
      throw new Error(
        `Failed to save conversation: ${conversationError.message}`
      );
    }

    const conversationId = conversationData.id;

    // 2. Insert actions if there are any
    if (actions && actions.length > 0) {
      const formattedActions = actions.map((action: DetectedAction) => ({
        conversation_id: conversationId,
        action_type: action.type,
        action_data: action.data,
        created_at: action.timestamp || new Date().toISOString(),
      }));

      const { error: actionsError } = await supabase
        .from("conversation_actions")
        .insert(formattedActions);

      if (actionsError) {
        console.error("Error saving actions to Supabase:", actionsError);
        // We'll still return success for the conversation, but with a warning
        return NextResponse.json({
          success: true,
          id: conversationId,
          warning: "Conversation saved but actions failed to save",
        });
      }
    }

    return NextResponse.json({
      success: true,
      id: conversationId,
      message: "Conversation and actions saved to database",
    });
  } catch (error) {
    console.error("Error in conversation API:", error);
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

    // If Supabase is unavailable, fall back to in-memory storage
    if (!supabase) {
      console.warn("Supabase unavailable, using in-memory storage for GET");

      // Return the latest conversation
      if (latest === "true" && inMemoryConversations.length > 0) {
        return NextResponse.json(inMemoryConversations[0]);
      }

      // Return a specific conversation by ID
      if (id) {
        const conversation = inMemoryConversations.find(
          (conv) => conv.id === id
        );
        if (conversation) {
          return NextResponse.json(conversation);
        }
        return NextResponse.json(
          { error: "Conversation not found" },
          { status: 404 }
        );
      }

      // Return all conversations
      return NextResponse.json(inMemoryConversations);
    }

    // Using Supabase
    // Return the latest conversation
    if (latest === "true") {
      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          // No results found (Supabase 'PGRST116' means no rows returned by the single() selector)
          return NextResponse.json(
            { error: "No conversations found" },
            { status: 404 }
          );
        }
        throw error;
      }

      // Fetch actions for this conversation
      const { data: actions, error: actionsError } = await supabase
        .from("conversation_actions")
        .select("*")
        .eq("conversation_id", data.id);

      if (actionsError) {
        console.error("Error fetching actions:", actionsError);
        // Return the conversation without actions
        return NextResponse.json({ ...data, actions: [] });
      }

      return NextResponse.json({
        ...data,
        actions: actions || [],
      });
    }

    // Return a specific conversation by ID
    if (id) {
      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return NextResponse.json(
            { error: "Conversation not found" },
            { status: 404 }
          );
        }
        throw error;
      }

      // Fetch actions for this conversation
      const { data: actions, error: actionsError } = await supabase
        .from("conversation_actions")
        .select("*")
        .eq("conversation_id", id);

      if (actionsError) {
        console.error("Error fetching actions:", actionsError);
        // Return the conversation without actions
        return NextResponse.json({ ...data, actions: [] });
      }

      return NextResponse.json({
        ...data,
        actions: actions || [],
      });
    }

    // Return all conversations
    const { data, error } = await supabase
      .from("conversations")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    // For simplicity, we're not fetching actions for all conversations
    // That would be handled by the history endpoint
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error retrieving conversations:", error);
    return NextResponse.json(
      { error: "Failed to retrieve conversation data" },
      { status: 500 }
    );
  }
}
