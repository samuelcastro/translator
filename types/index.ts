export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  tokens?: number;
  type: string;
  response?: {
    usage: {
      total_tokens: number;
      input_tokens: number;
      output_tokens: number;
    };
  };
}

export interface Conversation {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: string;
  isFinal: boolean;
  status?: "speaking" | "processing" | "final";
}

export interface Tool {
  type: "function";
  name: string;
  description: string;
  parameters?: {
    type: "object";
    properties: Record<
      string,
      {
        type: string;
        description: string;
        enum?: string[];
      }
    >;
    required?: string[];
  };
}

export interface ActionData {
  patientName: string;
  timeframe?: string;
  reason?: string;
  testType?: string;
  urgency?: "routine" | "urgent" | "stat";
}

export interface DetectedAction {
  type: string;
  data: ActionData;
  timestamp: string;
}

export interface WebhookPayload {
  scheduleFollowupAppointment?: ActionData;
  sendLabOrder?: ActionData;
  generateConversationSummary?: {
    includeActions?: boolean;
  };
}

export interface WebhookResponse {
  success: boolean;
  actionType: string;
  message: string;
}

export interface FunctionResult {
  success: boolean;
  message: string;
  error?: string;
  summary?: string;
}

// Type for function that can be registered with OpenAI
export type RegisterableFunction = (args: unknown) => Promise<FunctionResult>;

// Type for the conversation data stored in Supabase
export interface ConversationRecord {
  id: string;
  conversation_data: Conversation[];
  summary: string | null;
  created_at: string;
}

// Type for the conversation actions stored in Supabase
export interface ConversationAction {
  id: string;
  conversation_id: string;
  action_type: string;
  action_data: ActionData;
  created_at: string;
}

// Type for TextInput component props
export interface TextInputProps {
  onSubmit: (text: string) => void;
  disabled: boolean;
  placeholder?: string;
}
