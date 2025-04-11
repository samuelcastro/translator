import { Tool } from "@/types";

// Define medical tools with proper format
export const medicalTools: Tool[] = [
  {
    type: "function",
    name: "scheduleFollowupAppointment",
    description: "Schedule a follow-up appointment for the patient",
    parameters: {
      type: "object",
      properties: {
        patientName: {
          type: "string",
          description: "The name of the patient",
        },
        timeframe: {
          type: "string",
          description:
            "When the appointment should be scheduled (e.g., '2 weeks', '3 months')",
        },
        reason: {
          type: "string",
          description: "The reason for the follow-up appointment",
        },
      },
      required: ["patientName", "timeframe"],
    },
  },
  {
    type: "function",
    name: "sendLabOrder",
    description: "Send a lab order for the patient",
    parameters: {
      type: "object",
      properties: {
        patientName: {
          type: "string",
          description: "The name of the patient",
        },
        testType: {
          type: "string",
          description: "The type of lab test to order",
        },
        urgency: {
          type: "string",
          enum: ["routine", "urgent", "stat"],
          description: "The urgency of the lab order",
        },
      },
      required: ["patientName", "testType"],
    },
  },
  {
    type: "function",
    name: "generateConversationSummary",
    description: "Generate a summary of the conversation",
    parameters: {
      type: "object",
      properties: {
        includeActions: {
          type: "boolean",
          description: "Whether to include detected actions in the summary",
        },
      },
      required: [],
    },
  },
  {
    type: "function",
    name: "endSession",
    description: "End the current session and redirect to the summary page",
    parameters: {
      type: "object",
      properties: {
        reason: {
          type: "string",
          description:
            "The reason for ending the session (e.g., 'conversation complete', 'all questions answered')",
        },
        autoGenerateSummary: {
          type: "boolean",
          description:
            "Whether to automatically generate a summary before ending",
        },
      },
      required: ["reason"],
    },
  },
];
