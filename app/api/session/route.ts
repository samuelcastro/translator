import { NextResponse } from "next/server";

interface SessionResponse {
  client_secret: {
    value: string;
  };
}

export async function POST(
  request: Request
): Promise<NextResponse<SessionResponse | { error: string }>> {
  try {
    // Verify API key
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not set");
    }

    // Define instructions based on the medical interpreter context
    const instructions = `
            You are a medical interpreter facilitating communication between a clinician (English-speaking) and a patient (Spanish-speaking).
            
            - When a message is received in English, translate it to Spanish and speak it out for the patient.
            - When a message is received in Spanish, translate it to English and speak it out for the clinician.
            - If you detect the Spanish phrase "repite eso" or "repeat that" or similar, repeat the previous clinician's message in Spanish.
            - Be precise and accurate with medical terminology in both languages.

            - USE THE AVAILABLE TOOLS WHEN APPROPRIATE:
              * When a doctor mentions scheduling a follow-up appointment (like "Let's schedule a follow-up in 2 weeks"), call the scheduleFollowupAppointment tool with patient name and timeframe.
              * When a doctor orders lab tests (like "We need to run some blood tests"), call the sendLabOrder tool with patient name and test type.
              * When the conversation is ending or someone asks for a summary, call the generateConversationSummary tool to save all information.
              * When the conversation is concluding, call the endSession tool with an appropriate reason. This will redirect to the summary page.
            
            - Examples of when to use tools:
              * If doctor says: "Let's have Maria come back in 3 weeks to check on this" → Use scheduleFollowupAppointment
              * If doctor says: "We'll need to get a CBC for John" → Use sendLabOrder
              * If either party says they're done or asks for a summary → Use generateConversationSummary
              * When either party indicates they are done with the conversation → Use endSession with reason="conversation complete" and autoGenerateSummary=true
            
            - After executing a tool, always inform the clinician what action was taken, in English.
            - At the end of the conversation provide a summary of the key points discussed.
            - When either party indicates they are done, call the endSession tool to properly end the session and redirect to the summary page.
            - Always maintain a professional, compassionate tone appropriate for a medical setting.
            - NEVER speak directly to the patient, you're only a translator.
        `;

    console.log("Making request to OpenAI Realtime API...");

    // Prepare request body with tool_choice set to auto
    const requestBody = {
      model: "gpt-4o-realtime-preview-2024-12-17",
      voice: "ash",
      modalities: ["audio", "text"],
      instructions,
      tool_choice: "auto",
      // Tools will be passed via data channel instead of here
    };

    // Make request to OpenAI
    const response = await fetch(
      "https://api.openai.com/v1/realtime/sessions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      }
    );

    // Handle non-200 responses
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenAI API error: Status ${response.status}`, errorText);
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    // Parse the response
    const data = (await response.json()) as SessionResponse;

    if (!data.client_secret || !data.client_secret.value) {
      console.error("Invalid response format from OpenAI:", data);
      throw new Error("Invalid response from OpenAI: missing client_secret");
    }

    console.log("Successfully obtained session token");

    // Return the JSON response to the client
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in session API:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
