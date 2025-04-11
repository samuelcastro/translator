"use client";

import React, { useState, useEffect, useRef } from "react";
import useWebRTCAudioSession from "@/hooks/use-webrtc";
import { motion } from "framer-motion";
import { medicalTools } from "@/lib/medical-tools";
import { useMedicalToolFunctions } from "@/hooks/use-medical-tools";
import useWakeWordDetection from "@/hooks/use-wake-word";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

// Import our new components
import { SessionHeader } from "@/components/session-header";
import { SessionControlPanel } from "@/components/session-control-panel";
import { ConversationView } from "@/components/conversation-view";
import { SummaryView } from "@/components/summary-view";

const MedicalInterpreter: React.FC = () => {
  // State for voice selection (using ash by default from the API route)
  const [activeTab, setActiveTab] = useState<"conversation" | "summary">(
    "conversation"
  );
  const [wakeWordEnabled, setWakeWordEnabled] = useState(true);
  const [sessionStarting, setSessionStarting] = useState(false); // Track session initialization

  // Create a ref for the function to switch tabs - we'll use this to break circular dependency
  const switchToSummaryTab = useRef(() => {
    setActiveTab("summary");
  });

  const handleCallback = () => {
    console.log("Conversation ended automatically, redirecting to summary");
    // Trigger the same flow as manual end conversation
    handleEndConversation();
  };

  // WebRTC Audio Session Hook (using "ash" as the fixed voice option)
  const {
    status,
    isSessionActive,
    registerFunction,
    handleStartStopClick,
    msgs,
    conversation,
    sendTextMessage,
    messageLanguages,
    conversationSummary,
    detectedActions,
    setDetectedActions,
    setConversationSummary,
  } = useWebRTCAudioSession(
    // Add a callback to handle automatic redirection at conversation end
    handleCallback,
    medicalTools
  );

  // Handle wake word detection
  const handleWakeWordDetected = () => {
    if (!isSessionActive && !sessionStarting) {
      console.log("Wake word detected! Starting session...");
      // Set flag to prevent multiple simultaneous starts
      setSessionStarting(true);
      // Immediately disable wake word detection to prevent multiple triggers
      setWakeWordEnabled(false);

      // Start the session with a slight delay to ensure cleanup
      setTimeout(() => {
        handleStartStopClick();
        setSessionStarting(false);
      }, 300);
    }
  };

  // Use wake word detection
  const {
    isListening,
    error: wakeWordError,
    hasMicrophonePermission,
  } = useWakeWordDetection({
    wakeWord: "hey sully",
    onWakeWordDetected: handleWakeWordDetected,
    enabled: wakeWordEnabled && !isSessionActive && !sessionStarting,
  });

  // UI helpers
  const showMicrophonePermissionRequest = hasMicrophonePermission === false;

  // Re-enable wake word detection after session ends
  useEffect(() => {
    if (!isSessionActive && !sessionStarting) {
      // Only re-enable wake word detection if the session has completely ended
      setWakeWordEnabled(true);
    }
  }, [isSessionActive, sessionStarting]);

  // End conversation and show summary
  const handleEndConversation = async (): Promise<void> => {
    if (isSessionActive) {
      // First log the detected actions to ensure they're being tracked
      console.log("Current detected actions:", detectedActions);
      console.log("Current conversation summary:", conversationSummary);

      // Immediately switch to summary tab
      setActiveTab("summary");

      // If we already have a summary, don't request a new one
      if (conversationSummary && conversationSummary.length > 0) {
        console.log("Using existing summary:", conversationSummary);
        return;
      }

      // Request a conversation summary using the specific tool trigger phrase
      sendTextMessage(
        "Please generate a summary of this conversation and use the generateConversationSummary tool to save it, including all detected actions."
      );

      // Manually trigger the summary tool
      try {
        // Wait a bit to allow the AI to process the request and call the tool
        setTimeout(async () => {
          console.log(
            "Manually triggering conversation summary with actions:",
            detectedActions
          );
          console.log(
            "Current conversation summary state:",
            conversationSummary
          );

          // Directly create a summary and set it
          if (!conversationSummary || conversationSummary.length === 0) {
            console.log("Creating a basic summary as fallback");

            // Collect some data about the conversation for the summary
            const patientMessages = conversation
              .filter((msg) => msg.role === "user" && msg.isFinal)
              .map((msg) => msg.text);

            const doctorMessages = conversation
              .filter((msg) => msg.role === "assistant" && msg.isFinal)
              .map((msg) => msg.text);

            // Create a basic summary
            const basicSummary = `SUMMARY:\n\nThis conversation included a medical consultation between a doctor and patient. ${
              detectedActions.length > 0
                ? `\n\nActions were detected during this conversation:\n${detectedActions
                    .map((a) => `- ${a.type}: ${JSON.stringify(a.data)}`)
                    .join("\n")}`
                : `\nNo specific actions were detected during this conversation.`
            }\n\nThe conversation consisted of ${
              patientMessages.length
            } patient messages and ${
              doctorMessages.length
            } doctor/interpreter messages.`;

            // Set the summary directly
            setConversationSummary(basicSummary);

            // Also call the tool to save it
            await medicalToolFunctions.generateConversationSummary({
              includeActions: true,
              forceGenerate: true,
            });
          }
        }, 2000); // Reduced delay for better user experience
      } catch (error) {
        console.error("Error saving conversation data:", error);
      }
    }
  };

  // Get medical tool functions
  const medicalToolFunctions = useMedicalToolFunctions({
    setDetectedActions,
    detectedActions,
    conversation,
    conversationSummary,
    onSessionEnd: () => switchToSummaryTab.current(),
    setSummary: setConversationSummary,
  });

  // Register medical functions for OpenAI to call
  useEffect(() => {
    console.log(
      "Registering medical functions:",
      Object.keys(medicalToolFunctions)
    );

    Object.entries(medicalToolFunctions).forEach(([name, func]) => {
      console.log(`Registering function: ${name}`);
      registerFunction(name, func);
    });

    // Verify the functions have been registered
    setTimeout(() => {
      console.log(
        "Tools registration complete. Ensure they're available when needed."
      );
    }, 500);
  }, [registerFunction, medicalToolFunctions]);

  // Reset conversation
  const handleNewConversation = (): void => {
    // Prevent wake word detection during cleanup
    setWakeWordEnabled(false);
    setSessionStarting(true);

    // Clear any detected actions from previous session
    setDetectedActions([]);

    // Stop current session
    handleStartStopClick();

    // Reset state after a delay
    setTimeout(() => {
      setSessionStarting(false);
      setWakeWordEnabled(true);
      setActiveTab("conversation");
    }, 1000);
  };

  // Add this useEffect to monitor conversationSummary
  useEffect(() => {
    if (conversationSummary) {
      console.log("Conversation summary updated:", conversationSummary);
    }
  }, [conversationSummary]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <main className="container max-w-7xl mx-auto px-4 py-6">
        <SessionHeader />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <SessionControlPanel
            isSessionActive={isSessionActive}
            sessionStarting={sessionStarting}
            status={status}
            isListening={isListening}
            wakeWordError={wakeWordError}
            showMicrophonePermissionRequest={showMicrophonePermissionRequest}
            messagesCount={msgs.length}
            handleStartStopClick={handleStartStopClick}
            handleEndConversation={handleEndConversation}
            handleNewConversation={handleNewConversation}
          />

          <motion.div
            className="lg:col-span-9"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="h-full">
              <Tabs
                value={activeTab}
                onValueChange={(value: string) =>
                  setActiveTab(value as "conversation" | "summary")
                }
              >
                <CardHeader className="pb-0">
                  <div className="flex items-center justify-between">
                    <CardTitle>Medical Interpreter Session</CardTitle>
                    <TabsList>
                      <TabsTrigger value="conversation">
                        Conversation
                      </TabsTrigger>
                      <TabsTrigger value="summary">Summary</TabsTrigger>
                    </TabsList>
                  </div>
                  <Separator className="mt-4" />
                </CardHeader>

                <CardContent className="pt-6">
                  <TabsContent value="conversation" className="m-0">
                    <ConversationView
                      conversation={conversation}
                      messageLanguages={messageLanguages}
                      isSessionActive={isSessionActive}
                      sendTextMessage={sendTextMessage}
                    />
                  </TabsContent>

                  <TabsContent value="summary" className="m-0">
                    <SummaryView
                      conversationSummary={conversationSummary}
                      detectedActions={detectedActions}
                      handleNewConversation={handleNewConversation}
                    />
                  </TabsContent>
                </CardContent>
              </Tabs>
            </Card>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default MedicalInterpreter;
