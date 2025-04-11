import React from "react";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Mic,
  MicOff,
  TerminalSquare,
  FileText,
  Headphones,
  Volume2,
  AlertCircle,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface SessionControlPanelProps {
  isSessionActive: boolean;
  sessionStarting: boolean;
  status: string;
  isListening: boolean;
  wakeWordError: string | null;
  showMicrophonePermissionRequest: boolean;
  messagesCount: number;
  handleStartStopClick: () => void;
  handleEndConversation: () => void;
  handleNewConversation: () => void;
}

export const SessionControlPanel: React.FC<SessionControlPanelProps> = ({
  isSessionActive,
  sessionStarting,
  status,
  isListening,
  wakeWordError,
  showMicrophonePermissionRequest,
  messagesCount,
  handleStartStopClick,
  handleEndConversation,
  handleNewConversation,
}) => {
  return (
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
                              console.error("Permission request failed:", err)
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
                    <span className="text-sm font-medium">{wakeWordError}</span>
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
                <span className="text-sm text-muted-foreground">{status}</span>
              </div>
            </div>
          )}
        </CardFooter>
      </Card>

      {messagesCount > 4 && (
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
                <span className="text-sm">Messages: {messagesCount}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Session running for {Math.floor(messagesCount / 2)} minutes
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
};
