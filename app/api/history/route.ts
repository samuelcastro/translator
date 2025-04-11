import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Initialize Supabase client with better error handling
let supabase: SupabaseClient | null = null;

try {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase environment variables");
  } else {
    supabase = createClient(supabaseUrl, supabaseServiceKey);
  }
} catch (error) {
  console.error("Failed to initialize Supabase client:", error);
}

export async function GET() {
  try {
    // Check if Supabase client is properly initialized
    if (!supabase) {
      console.error("Supabase client not initialized");
      return NextResponse.json(
        {
          error:
            "Database connection unavailable. Check environment variables NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
          mockData: true,
          conversations: generateMockData(), // Generate mock data for testing
        },
        { status: 500 }
      );
    }

    // Fetch conversations with most recent first
    const { data: conversations, error: conversationsError } = await supabase
      .from("conversations")
      .select("id, summary, created_at, conversation_data")
      .order("created_at", { ascending: false });

    if (conversationsError) {
      console.error("Error fetching conversations:", conversationsError);
      return NextResponse.json(
        {
          error: conversationsError.message,
          mockData: true,
          conversations: generateMockData(), // Return mock data on error
        },
        { status: 500 }
      );
    }

    // Now fetch all actions
    const { data: actions, error: actionsError } = await supabase
      .from("conversation_actions")
      .select("*")
      .order("created_at", { ascending: false });

    if (actionsError) {
      console.error("Error fetching actions:", actionsError);
      return NextResponse.json(
        { error: actionsError.message },
        { status: 500 }
      );
    }

    // Group actions by conversation_id
    const actionsMap = actions.reduce(
      (acc: Record<string, any[]>, action: any) => {
        const conversationId = action.conversation_id;
        if (!acc[conversationId]) {
          acc[conversationId] = [];
        }
        acc[conversationId].push(action);
        return acc;
      },
      {}
    );

    // Merge conversations with their actions
    const conversationsWithActions = conversations.map((conversation: any) => ({
      ...conversation,
      actions: actionsMap[conversation.id] || [],
    }));

    return NextResponse.json({ conversations: conversationsWithActions });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        mockData: true,
        conversations: generateMockData(), // Return mock data on error
      },
      { status: 500 }
    );
  }
}

// Generate mock data for testing when database is unavailable
function generateMockData() {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  return [
    {
      id: "mock-conversation-1",
      summary:
        "Mock conversation summary about patient's symptoms and treatment plan. Dr. recommended rest and hydration for flu-like symptoms.",
      created_at: now.toISOString(),
      conversation_data: [
        {
          id: "mock-msg-1",
          role: "user",
          text: "Hola, doctor. No me siento bien. Tengo fiebre y dolor de cabeza.",
          timestamp: now.toISOString(),
          isFinal: true,
        },
        {
          id: "mock-msg-2",
          role: "assistant",
          text: "I understand you're not feeling well. You mentioned having a fever and headache. How long have you been experiencing these symptoms?",
          timestamp: now.toISOString(),
          isFinal: true,
        },
        {
          id: "mock-msg-3",
          role: "user",
          text: "Desde ayer. También tengo dolor de garganta.",
          timestamp: now.toISOString(),
          isFinal: true,
        },
      ],
      actions: [
        {
          id: "mock-action-1",
          conversation_id: "mock-conversation-1",
          action_type: "scheduleFollowupAppointment",
          action_data: {
            patientName: "Juan Pérez",
            timeframe: "2 weeks",
            reason: "Follow up on flu symptoms",
          },
          created_at: now.toISOString(),
        },
      ],
    },
    {
      id: "mock-conversation-2",
      summary:
        "Mock conversation about lab test results. Patient's bloodwork shows normal results, but doctor recommended dietary changes.",
      created_at: yesterday.toISOString(),
      conversation_data: [
        {
          id: "mock-msg-4",
          role: "user",
          text: "¿Tiene los resultados de mis análisis de sangre?",
          timestamp: yesterday.toISOString(),
          isFinal: true,
        },
        {
          id: "mock-msg-5",
          role: "assistant",
          text: "Yes, I have your blood test results. Everything looks normal, but I would recommend some dietary changes to improve your cholesterol levels.",
          timestamp: yesterday.toISOString(),
          isFinal: true,
        },
      ],
      actions: [
        {
          id: "mock-action-2",
          conversation_id: "mock-conversation-2",
          action_type: "sendLabOrder",
          action_data: {
            patientName: "María González",
            testType: "Comprehensive Metabolic Panel",
            urgency: "routine",
          },
          created_at: yesterday.toISOString(),
        },
      ],
    },
  ];
}
