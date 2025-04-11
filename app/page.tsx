"use client";

import React, { useState, useEffect, useRef } from "react";
import useWebRTCAudioSession from "@/hooks/use-webrtc";
import { TextInput } from "@/components/text-input";
import { motion } from "framer-motion";
import type { DetectedAction } from "@/types";
import { medicalTools } from "@/lib/medical-tools";
import { useMedicalToolFunctions } from "@/hooks/use-medical-tools";
import useWakeWordDetection from "@/hooks/use-wake-word";
import Link from "next/link";

// ShadCN Components
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Mic,
  MicOff,
  TerminalSquare,
  ChevronDown,
  FileText,
  FlaskConical,
  Calendar,
  Headphones,
  Volume2,
  AlertCircle,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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
        <motion.div
          className="mb-6 max-w-3xl"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-2xl font-semibold tracking-tight">
            Welcome to your session
          </h2>
          <p className="text-muted-foreground mt-1">
            Say <span className="font-semibold">"Hey Sully"</span> clearly to
            begin your interpreter session. Make sure your microphone is enabled
            and speak at a normal volume.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Control Panel */}
          <motion.div
            className="lg:col-span-3"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <CardTitle>Session Status</CardTitle>
                  <Link href="/history">
                    <Button variant="outline" size="sm" className="h-8">
                      <FileText className="h-4 w-4 mr-2" />
                      History
                    </Button>
                  </Link>
                </div>
                <CardDescription>
                  Current status of your interpreter session
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!isSessionActive && (
                  <div className="flex items-center justify-center p-4 border rounded-md bg-muted/20">
                    <div className="flex items-center space-x-2">
                      {showMicrophonePermissionRequest ? (
                        <>
                          <AlertCircle className="h-5 w-5 text-red-500" />
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-red-500">
                              Microphone access needed
                            </span>
                            <Button
                              variant="link"
                              size="sm"
                              className="h-auto p-0 text-xs text-blue-500"
                              onClick={() => {
                                // Request microphone permission
                                navigator.mediaDevices
                                  .getUserMedia({ audio: true })
                                  .then(() => window.location.reload())
                                  .catch((err) =>
                                    console.error(
                                      "Permission request failed:",
                                      err
                                    )
                                  );
                              }}
                            >
                              Allow microphone access
                            </Button>
                          </div>
                        </>
                      ) : isListening ? (
                        <>
                          <Volume2 className="h-5 w-5 text-green-500 animate-pulse" />
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">
                              Listening for "Hey Sully"...
                            </span>
                          </div>
                        </>
                      ) : wakeWordError ? (
                        <>
                          <AlertCircle className="h-5 w-5 text-amber-500" />
                          <span className="text-sm font-medium">
                            {wakeWordError}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="h-5 w-5 flex items-center justify-center">
                            <span className="h-2.5 w-2.5 bg-amber-500 rounded-full animate-pulse"></span>
                          </span>
                          <span className="text-sm font-medium">
                            Starting speech recognition...
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {wakeWordError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{wakeWordError}</AlertDescription>
                  </Alert>
                )}

                {isSessionActive && (
                  <div className="space-y-2">
                    <Button
                      variant="destructive"
                      className="w-full"
                      onClick={handleStartStopClick}
                    >
                      <MicOff className="mr-2 h-4 w-4" />
                      End Session
                    </Button>

                    <Button
                      variant="secondary"
                      className="w-full"
                      onClick={handleEndConversation}
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      Summarize Conversation
                    </Button>

                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={handleNewConversation}
                    >
                      <Headphones className="mr-2 h-4 w-4" />
                      New Conversation
                    </Button>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex flex-col items-start">
                {status && (
                  <div className="w-full space-y-1.5">
                    <div className="text-sm font-medium">Status</div>
                    <div className="flex items-center space-x-2">
                      <div
                        className={`h-2.5 w-2.5 rounded-full ${
                          isSessionActive
                            ? "bg-green-500 animate-pulse"
                            : "bg-amber-500"
                        }`}
                      />
                      <span className="text-sm text-muted-foreground">
                        {status}
                      </span>
                    </div>
                  </div>
                )}
              </CardFooter>
            </Card>

            {msgs.length > 4 && activeTab === "conversation" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="mt-4"
              >
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Session Stats</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center space-x-2">
                      <TerminalSquare className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Messages: {msgs.length}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Session running for {Math.floor(msgs.length / 2)} minutes
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </motion.div>

          {/* Main Content Area */}
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
                    <ScrollArea className="h-[500px] pr-4">
                      {conversation.length === 0 ? (
                        <div className="h-full flex items-center justify-center">
                          <div className="text-center p-8 max-w-md">
                            <div className="bg-muted rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                              <Mic className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <h3 className="font-medium mb-2">
                              Waiting to begin
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              Say{" "}
                              <span className="font-semibold">"Hey Sully"</span>{" "}
                              clearly to activate the interpreter. Make sure
                              your microphone is on and speak at a normal
                              volume.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {conversation.map((msg) => {
                            const isPatient =
                              msg.role === "user" &&
                              messageLanguages[msg.id] === "spanish";
                            const isDoctor =
                              msg.role === "user" &&
                              messageLanguages[msg.id] !== "spanish";
                            const isAssistant = msg.role === "assistant";

                            return (
                              <div
                                key={msg.id}
                                className={`flex ${
                                  isPatient ? "justify-end" : "justify-start"
                                }`}
                              >
                                <div
                                  className={`
                                    relative max-w-[85%] px-4 py-3 rounded-lg
                                    ${
                                      isPatient
                                        ? "bg-blue-100 dark:bg-blue-950/70 text-blue-900 dark:text-blue-100"
                                        : isDoctor
                                        ? "bg-indigo-100 dark:bg-indigo-950/70 text-indigo-900 dark:text-indigo-100"
                                        : "bg-muted"
                                    }
                                  `}
                                >
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge
                                      variant={
                                        isPatient
                                          ? "default"
                                          : isDoctor
                                          ? "secondary"
                                          : "outline"
                                      }
                                      className="text-xs font-normal py-0"
                                    >
                                      {isPatient
                                        ? "Patient 🇪🇸"
                                        : isDoctor
                                        ? "Doctor 🇺🇸"
                                        : "Interpreter 🌐"}
                                    </Badge>
                                    {!msg.isFinal && (
                                      <span className="flex h-2 w-2 bg-blue-500 rounded-full animate-pulse" />
                                    )}
                                  </div>
                                  <p className="whitespace-pre-wrap break-words">
                                    {msg.text}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </ScrollArea>

                    <div className="mt-4">
                      <TextInput
                        onSubmit={sendTextMessage}
                        disabled={!isSessionActive}
                        placeholder={
                          isSessionActive
                            ? "Type your message..."
                            : "Say 'Hey Sully' to begin..."
                        }
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="summary" className="m-0">
                    <div className="space-y-6">
                      <Card className="border-blue-200 dark:border-blue-800/40 bg-blue-50/50 dark:bg-blue-950/20">
                        <CardHeader>
                          <CardTitle className="text-base">
                            Conversation Summary
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {conversationSummary ? (
                            <div className="whitespace-pre-line text-sm">
                              {conversationSummary.replace(/SUMMARY:/, "")}
                            </div>
                          ) : (
                            <div className="flex items-center justify-center p-8">
                              <div className="flex flex-col items-center">
                                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-500"></div>
                                <p className="mt-2 text-sm text-muted-foreground">
                                  Generating summary...
                                </p>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      <div>
                        <h3 className="text-lg font-semibold mb-3">
                          Detected Actions
                        </h3>
                        {detectedActions.length > 0 ? (
                          <div className="grid gap-3 md:grid-cols-2">
                            {detectedActions.map((action, index) => (
                              <Card
                                key={index}
                                className={
                                  action.type === "scheduleFollowupAppointment"
                                    ? "border-amber-200 dark:border-amber-800/40 bg-amber-50/50 dark:bg-amber-950/20"
                                    : "border-emerald-200 dark:border-emerald-800/40 bg-emerald-50/50 dark:bg-emerald-950/20"
                                }
                              >
                                <CardHeader className="pb-2">
                                  <CardTitle className="text-base flex items-center">
                                    {action.type ===
                                    "scheduleFollowupAppointment" ? (
                                      <>
                                        <Calendar className="mr-2 h-4 w-4" />
                                        Follow-up Appointment
                                      </>
                                    ) : (
                                      <>
                                        <FlaskConical className="mr-2 h-4 w-4" />
                                        Lab Order
                                      </>
                                    )}
                                  </CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <div className="space-y-2 text-sm">
                                    {Object.entries(action.data).map(
                                      ([key, value]) => (
                                        <div
                                          key={key}
                                          className="grid grid-cols-3 gap-1"
                                        >
                                          <div className="text-muted-foreground capitalize">
                                            {key
                                              .replace(/([A-Z])/g, " $1")
                                              .trim()}
                                            :
                                          </div>
                                          <div className="col-span-2 font-medium">
                                            {value as string}
                                          </div>
                                        </div>
                                      )
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        ) : (
                          <Card className="border-dashed">
                            <CardContent className="flex flex-col items-center justify-center p-6">
                              <div className="rounded-full bg-muted p-3 mb-3">
                                <ChevronDown className="h-5 w-5 text-muted-foreground" />
                              </div>
                              <p className="mb-1 text-sm font-medium">
                                No Actions Detected
                              </p>
                              <p className="text-sm text-muted-foreground text-center">
                                When actions like follow-up appointments or lab
                                orders are detected, they will appear here.
                              </p>
                            </CardContent>
                          </Card>
                        )}
                      </div>

                      <div className="flex justify-center mt-4">
                        <Button onClick={handleNewConversation}>
                          Start New Conversation
                        </Button>
                      </div>
                    </div>
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
