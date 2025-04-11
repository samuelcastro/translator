import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Mic } from "lucide-react";
import { TextInput } from "@/components/text-input";

interface Message {
  id: string;
  role: string;
  text: string;
  isFinal: boolean;
}

interface ConversationViewProps {
  conversation: Message[];
  messageLanguages: Record<string, string>;
  isSessionActive: boolean;
  sendTextMessage: (text: string) => void;
}

export const ConversationView: React.FC<ConversationViewProps> = ({
  conversation,
  messageLanguages,
  isSessionActive,
  sendTextMessage,
}) => {
  return (
    <>
      <ScrollArea className="h-[500px] pr-4">
        {conversation.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center p-8 max-w-md">
              <div className="bg-muted rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                <Mic className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="font-medium mb-2">Waiting to begin</h3>
              <p className="text-sm text-muted-foreground">
                Say <span className="font-semibold">"Hey Sully"</span> clearly
                to activate the interpreter. Make sure your microphone is on and
                speak at a normal volume.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {conversation.map((msg) => {
              // Patient is a user speaking Spanish
              const isPatient =
                msg.role === "user" && messageLanguages[msg.id] === "spanish";

              // Doctor is a user speaking English (non-Spanish)
              const isDoctor =
                msg.role === "user" && messageLanguages[msg.id] !== "spanish";

              // Sully is the AI assistant
              const isSully = msg.role === "assistant";

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
                          : "Sully 🌐"}
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
    </>
  );
};
