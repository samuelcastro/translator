"use client";

import { toast } from "sonner";
import { useTranslations } from "@/components/translations-context";
import { ActionData, DetectedAction, FunctionResult } from "@/types";
import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";

interface UseMedicalToolFunctionsProps {
  setDetectedActions: React.Dispatch<React.SetStateAction<DetectedAction[]>>;
  detectedActions: DetectedAction[];
  conversation: any[];
  conversationSummary: string;
  onSessionEnd?: () => void;
  setSummary?: React.Dispatch<React.SetStateAction<string>>;
}

export const useMedicalToolFunctions = ({
  setDetectedActions,
  conversation,
  conversationSummary,
  detectedActions,
  onSessionEnd,
  setSummary,
}: UseMedicalToolFunctionsProps) => {
  const { t } = useTranslations();
  const router = useRouter();

  // Log whenever props change to help debug
  useEffect(() => {
    console.log("Medical tools initialized with:", {
      conversationLength: conversation.length,
      hasSummary: !!conversationSummary,
      actionsCount: detectedActions.length,
    });
  }, [conversation.length, conversationSummary, detectedActions.length]);

  const scheduleFollowupAppointment = useCallback(
    async (args: unknown): Promise<FunctionResult> => {
      try {
        console.log("Scheduling follow-up appointment:", args);
        toast.success("Scheduling follow-up appointment 📅", {
          description: "Sending appointment request to the system...",
        });

        // Add to detected actions immediately to ensure it's captured
        const newAction = {
          type: "scheduleFollowupAppointment",
          data: args as ActionData,
          timestamp: new Date().toISOString(),
        };

        setDetectedActions((prev) => {
          // Check if this exact action already exists to prevent duplicates
          const actionExists = prev.some(
            (a) =>
              a.type === newAction.type &&
              JSON.stringify(a.data) === JSON.stringify(newAction.data)
          );

          if (actionExists) {
            console.log("Action already exists, skipping addition");
            return prev;
          }

          console.log("Adding new action to state:", newAction);
          return [...prev, newAction];
        });

        // Send to webhook API
        const response = await fetch("/api/webhook", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scheduleFollowupAppointment: args }),
        });

        if (!response.ok) {
          console.error("Webhook response not OK:", await response.text());
          throw new Error("Failed to schedule appointment");
        }

        const data = await response.json();
        console.log("Webhook response:", data);

        return {
          success: true,
          message: "Follow-up appointment scheduled successfully",
        };
      } catch (error) {
        console.error("Error scheduling appointment:", error);
        return {
          success: false,
          message: "Failed to schedule appointment",
          error: String(error),
        };
      }
    },
    [setDetectedActions]
  );

  const sendLabOrder = useCallback(
    async (args: unknown): Promise<FunctionResult> => {
      try {
        console.log("Sending lab order:", args);
        toast.success("Sending lab order 🔬", {
          description: "Processing lab order request...",
        });

        // Add to detected actions immediately to ensure it's captured
        const newAction = {
          type: "sendLabOrder",
          data: args as ActionData,
          timestamp: new Date().toISOString(),
        };

        setDetectedActions((prev) => {
          // Check if this exact action already exists to prevent duplicates
          const actionExists = prev.some(
            (a) =>
              a.type === newAction.type &&
              JSON.stringify(a.data) === JSON.stringify(newAction.data)
          );

          if (actionExists) {
            console.log("Action already exists, skipping addition");
            return prev;
          }

          console.log("Adding new action to state:", newAction);
          return [...prev, newAction];
        });

        // Send to webhook API
        const response = await fetch("/api/webhook", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sendLabOrder: args }),
        });

        if (!response.ok) {
          console.error("Webhook response not OK:", await response.text());
          throw new Error("Failed to send lab order");
        }

        const data = await response.json();
        console.log("Webhook response:", data);

        return { success: true, message: "Lab order sent successfully" };
      } catch (error) {
        console.error("Error sending lab order:", error);
        return {
          success: false,
          message: "Failed to send lab order",
          error: String(error),
        };
      }
    },
    [setDetectedActions]
  );

  const generateConversationSummary = useCallback(
    async (args: unknown): Promise<FunctionResult> => {
      try {
        console.log("Generating conversation summary with args:", args);
        console.log("Current detected actions:", detectedActions);
        console.log("Current conversation summary:", conversationSummary);

        // Parse arguments
        const { includeActions = true, forceGenerate = false } =
          (args as {
            includeActions?: boolean;
            forceGenerate?: boolean;
          }) || {};

        toast.success("Generating conversation summary 📝", {
          description: "Creating and saving conversation summary...",
        });

        // Generate a summary if one doesn't exist yet or if forceGenerate is true
        let summary = conversationSummary;
        if (!summary || summary.trim() === "" || forceGenerate) {
          console.log("Generating new summary text");

          // Create a simple summary from the conversation
          const patientMessages = conversation
            .filter((msg) => msg.role === "user" && msg.isFinal)
            .map((msg) => msg.text);

          const doctorMessages = conversation
            .filter((msg) => msg.role === "assistant" && msg.isFinal)
            .map((msg) => msg.text);

          // Create a basic summary
          summary = `SUMMARY:\n\nThis conversation included a medical consultation between a doctor and patient. `;

          // Add information about detected actions
          if (detectedActions.length > 0) {
            summary += `\n\nActions detected during the conversation:\n`;

            detectedActions.forEach((action) => {
              if (action.type === "scheduleFollowupAppointment") {
                summary += `- Follow-up appointment scheduled for patient ${
                  action.data.patientName
                } in ${action.data.timeframe} for reason: ${
                  action.data.reason || "General follow-up"
                }\n`;
              } else if (action.type === "sendLabOrder") {
                summary += `- Lab order sent for patient ${
                  action.data.patientName
                }, test type: ${action.data.testType}, urgency: ${
                  action.data.urgency || "routine"
                }\n`;
              }
            });
          }

          // Add specific note about no actions if none were detected
          if (detectedActions.length === 0) {
            summary += `\nNo specific follow-up appointments or lab orders were detected during this conversation.`;
          }

          summary += `\n\nThe conversation consisted of ${patientMessages.length} patient messages and ${doctorMessages.length} doctor/interpreter messages.`;

          // Directly update the summary state if setSummary is available
          if (setSummary) {
            console.log("Directly setting conversation summary to:", summary);
            setSummary(summary);
          }
        }

        // Save all conversation data
        const saveResponse = await fetch("/api/conversation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversation,
            summary: summary,
            actions: detectedActions,
          }),
        });

        if (!saveResponse.ok) {
          const errorText = await saveResponse.text();
          console.error("Failed to save conversation:", errorText);
          throw new Error(`Failed to save conversation: ${errorText}`);
        }

        const responseData = await saveResponse.json();
        console.log("Conversation saved successfully:", responseData);

        // Call onSessionEnd to ensure UI is updated with the summary
        if (onSessionEnd) {
          console.log(
            "Calling onSessionEnd callback from generateConversationSummary"
          );
          onSessionEnd();
        }

        // Return the summary in the result
        return {
          success: true,
          message: "Conversation summary generated and conversation saved",
          summary: summary,
        };
      } catch (error) {
        console.error("Error generating summary:", error);

        // Even if there's an error, try to create a basic summary
        if (
          (!conversationSummary || conversationSummary.trim() === "") &&
          setSummary
        ) {
          const fallbackSummary = `Summary of conversation (generated after an error occurred):\n\nConversation between doctor and patient with ${detectedActions.length} detected actions.`;
          setSummary(fallbackSummary);

          return {
            success: false,
            message: "Error generating detailed summary, basic summary created",
            error: String(error),
            summary: fallbackSummary,
          };
        }

        return {
          success: false,
          message: "Failed to generate summary",
          error: String(error),
        };
      }
    },
    [
      conversation,
      conversationSummary,
      detectedActions,
      onSessionEnd,
      setSummary,
    ]
  );

  const endSession = useCallback(
    async (args: unknown): Promise<FunctionResult> => {
      try {
        console.log("Ending session with args:", args);

        // Parse the args to the expected shape
        const {
          reason = "The conversation is complete",
          autoGenerateSummary = false,
        } = (args as { reason?: string; autoGenerateSummary?: boolean }) || {};

        toast.success("Ending conversation session", {
          description: reason,
        });

        // If autoGenerateSummary is true, generate the summary first
        if (autoGenerateSummary) {
          console.log("Auto-generating summary before ending session");
          await generateConversationSummary({});
        } else {
          // Still save the conversation data even if we're not generating a new summary
          const saveResponse = await fetch("/api/conversation", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              conversation,
              summary: conversationSummary,
              actions: detectedActions,
            }),
          });

          if (!saveResponse.ok) {
            const errorText = await saveResponse.text();
            console.error("Failed to save conversation data:", errorText);
            throw new Error(`Failed to save conversation: ${errorText}`);
          }

          console.log("Conversation saved successfully");
        }

        // Call the onSessionEnd callback if provided
        if (onSessionEnd) {
          console.log("Calling onSessionEnd callback to show summary");
          setTimeout(() => {
            onSessionEnd();
          }, 500);
        }

        return {
          success: true,
          message: "Session ended successfully",
        };
      } catch (error) {
        console.error("Error ending session:", error);
        return {
          success: false,
          message: "Failed to end session properly",
          error: String(error),
        };
      }
    },
    [
      generateConversationSummary,
      conversation,
      conversationSummary,
      detectedActions,
      onSessionEnd,
    ]
  );

  return {
    scheduleFollowupAppointment,
    sendLabOrder,
    generateConversationSummary,
    endSession,
  };
};
