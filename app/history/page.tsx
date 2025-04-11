"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { format } from "date-fns";

// ShadCN Components
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Home,
  Calendar,
  FlaskConical,
  ChevronDown,
  ChevronRight,
  Clock,
  MessageSquare,
  FileText,
  AlertCircle,
} from "lucide-react";

interface ConversationAction {
  id: string;
  conversation_id: string;
  action_type: string;
  action_data: any;
  created_at: string;
}

interface Conversation {
  id: string;
  summary: string;
  created_at: string;
  conversation_data: any[];
  actions: ConversationAction[];
}

interface ConversationHistoryResponse {
  conversations: Conversation[];
  mockData?: boolean;
  error?: string;
}

export default function HistoryPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openStates, setOpenStates] = useState<{ [key: string]: boolean }>({});

  // Fetch conversation history when the component mounts
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/history");

        if (!response.ok) {
          const errorData = (await response
            .json()
            .catch(() => ({ error: "Failed to parse response" }))) as {
            error: string;
            mockData?: boolean;
            conversations?: Conversation[];
          };

          console.error("API response error:", response.status, errorData);

          // If the error response includes mock data, use it
          if (errorData && errorData.mockData && errorData.conversations) {
            console.log("Using mock data due to API error");
            setConversations(errorData.conversations);

            // Initialize open states for mock conversations
            const initialOpenStates = errorData.conversations.reduce(
              (acc: Record<string, boolean>, conv: Conversation) => {
                acc[conv.id] = false;
                return acc;
              },
              {}
            );
            setOpenStates(initialOpenStates);

            // Still set an error to display a warning banner
            setError(`${errorData.error || "API error"} (Using demo data)`);
          } else {
            throw new Error(
              errorData.error || `API returned status ${response.status}`
            );
          }
        } else {
          const data = (await response.json()) as ConversationHistoryResponse;
          setConversations(data.conversations);

          // Initialize open states for conversations
          const initialOpenStates = data.conversations.reduce(
            (acc: Record<string, boolean>, conv: Conversation) => {
              acc[conv.id] = false;
              return acc;
            },
            {}
          );
          setOpenStates(initialOpenStates);
        }
      } catch (err: any) {
        console.error("Error fetching history:", err);
        setError(err.message || "An error occurred while fetching history");
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  const toggleOpen = (id: string) => {
    setOpenStates((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Calculate conversation statistics for display
  const getConversationStats = (conversation: Conversation) => {
    const msgCount = conversation.conversation_data?.length || 0;
    const patientMsgs =
      conversation.conversation_data?.filter((msg) => msg.role === "user")
        .length || 0;
    const doctorMsgs =
      conversation.conversation_data?.filter((msg) => msg.role === "assistant")
        .length || 0;

    return { msgCount, patientMsgs, doctorMsgs };
  };

  // Format action data for display
  const formatActionData = (action: ConversationAction) => {
    const data = action.action_data;

    if (action.action_type === "scheduleFollowupAppointment") {
      return (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-blue-500" />
            <span className="font-medium">Follow-up Appointment</span>
          </div>
          <div className="text-sm ml-6">
            <p>Patient: {data.patientName}</p>
            <p>When: {data.timeframe}</p>
            {data.reason && <p>Reason: {data.reason}</p>}
          </div>
        </div>
      );
    } else if (action.action_type === "sendLabOrder") {
      return (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-green-500" />
            <span className="font-medium">Lab Order</span>
          </div>
          <div className="text-sm ml-6">
            <p>Patient: {data.patientName}</p>
            <p>Test: {data.testType}</p>
            {data.urgency && (
              <p>
                Urgency:{" "}
                <Badge
                  variant={
                    data.urgency === "urgent"
                      ? "destructive"
                      : data.urgency === "stat"
                      ? "outline"
                      : "secondary"
                  }
                >
                  {data.urgency}
                </Badge>
              </p>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-1">
        <div className="font-medium">{action.action_type}</div>
        <pre className="text-xs overflow-x-auto">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <main className="container max-w-5xl mx-auto px-4 py-6">
        <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Conversation History
            </h1>
            <p className="text-muted-foreground mt-1">
              Review past patient-doctor conversations and detected actions
            </p>
          </div>
          <Link href="/">
            <Button variant="outline" className="gap-2">
              <Home className="h-4 w-4" />
              Back to Interpreter
            </Button>
          </Link>
        </header>

        {/* Loading and error states */}
        {loading ? (
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="overflow-hidden">
                <CardHeader className="pb-4">
                  <Skeleton className="h-6 w-1/3" />
                  <Skeleton className="h-4 w-1/4 mt-2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-24 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <Alert
            variant={
              error.includes("Using demo data") ? "default" : "destructive"
            }
            className="mb-6"
          >
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>
              {error.includes("Using demo data") ? "Using Demo Data" : "Error"}
            </AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : conversations.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center p-6">
              <div className="rounded-full bg-muted p-3 mb-3">
                <MessageSquare className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="font-medium mb-1">No conversation history</h3>
              <p className="text-sm text-muted-foreground text-center">
                Start a conversation with a patient to see it here
              </p>
              <Link href="/" className="mt-4">
                <Button>Start a Conversation</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {conversations.map((conversation, index) => {
              const { msgCount, patientMsgs, doctorMsgs } =
                getConversationStats(conversation);
              const isOpen = openStates[conversation.id] || false;

              return (
                <motion.div
                  key={conversation.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            {format(
                              new Date(conversation.created_at),
                              "MMMM d, yyyy 'at' h:mm a"
                            )}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            {msgCount} messages ({patientMsgs} patient,{" "}
                            {doctorMsgs} doctor)
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          {conversation.actions.length > 0 && (
                            <Badge
                              variant="secondary"
                              className="whitespace-nowrap"
                            >
                              {conversation.actions.length} action
                              {conversation.actions.length !== 1 ? "s" : ""}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pb-3">
                      <div className="mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <h3 className="font-medium text-sm">Summary</h3>
                        </div>
                        <div className="pl-6 text-sm whitespace-pre-line border-l-2 border-muted">
                          {conversation.summary || "No summary available"}
                        </div>
                      </div>

                      {conversation.actions.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <h3 className="font-medium text-sm">Actions</h3>
                          </div>
                          <div className="space-y-3 pl-6">
                            {conversation.actions.map((action) => (
                              <div key={action.id}>
                                {formatActionData(action)}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                    <CardFooter>
                      <Collapsible
                        open={isOpen}
                        onOpenChange={() => toggleOpen(conversation.id)}
                        className="w-full"
                      >
                        <CollapsibleTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="flex items-center gap-1 w-full"
                          >
                            {isOpen ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                            {isOpen
                              ? "Hide full conversation"
                              : "View full conversation"}
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="pt-2">
                          <Separator className="my-2" />
                          <ScrollArea className="h-[400px] pr-4 mt-2">
                            <div className="space-y-4">
                              {conversation.conversation_data?.map((msg, i) => (
                                <div
                                  key={i}
                                  className={`flex ${
                                    msg.role === "user"
                                      ? "justify-end"
                                      : "justify-start"
                                  }`}
                                >
                                  <div
                                    className={`
                                      relative max-w-[85%] px-4 py-3 rounded-lg
                                      ${
                                        msg.role === "user"
                                          ? "bg-blue-100 dark:bg-blue-950/70 text-blue-900 dark:text-blue-100"
                                          : "bg-indigo-100 dark:bg-indigo-950/70 text-indigo-900 dark:text-indigo-100"
                                      }
                                    `}
                                  >
                                    <div className="flex items-center gap-2 mb-1">
                                      <Badge
                                        variant={
                                          msg.role === "user"
                                            ? "default"
                                            : "secondary"
                                        }
                                        className="text-xs font-normal py-0"
                                      >
                                        {msg.role === "user"
                                          ? "Patient"
                                          : "Doctor"}
                                      </Badge>
                                    </div>
                                    <p className="whitespace-pre-wrap break-words">
                                      {msg.text}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        </CollapsibleContent>
                      </Collapsible>
                    </CardFooter>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
