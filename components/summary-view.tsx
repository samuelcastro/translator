import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, FlaskConical, ChevronDown } from "lucide-react";

interface Action {
  type: string;
  data: Record<string, any>;
}

interface SummaryViewProps {
  conversationSummary: string | null;
  detectedActions: Action[];
  handleNewConversation: () => void;
}

export const SummaryView: React.FC<SummaryViewProps> = ({
  conversationSummary,
  detectedActions,
  handleNewConversation,
}) => {
  return (
    <div className="space-y-6">
      <Card className="border-blue-200 dark:border-blue-800/40 bg-blue-50/50 dark:bg-blue-950/20">
        <CardHeader>
          <CardTitle className="text-base">Conversation Summary</CardTitle>
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
        <h3 className="text-lg font-semibold mb-3">Detected Actions</h3>
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
                    {action.type === "scheduleFollowupAppointment" ? (
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
                    {Object.entries(action.data).map(([key, value]) => (
                      <div key={key} className="grid grid-cols-3 gap-1">
                        <div className="text-muted-foreground capitalize">
                          {key.replace(/([A-Z])/g, " $1").trim()}:
                        </div>
                        <div className="col-span-2 font-medium">
                          {value as string}
                        </div>
                      </div>
                    ))}
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
              <p className="mb-1 text-sm font-medium">No Actions Detected</p>
              <p className="text-sm text-muted-foreground text-center">
                When actions like follow-up appointments or lab orders are
                detected, they will appear here.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="flex justify-center mt-4">
        <Button onClick={handleNewConversation}>Start New Conversation</Button>
      </div>
    </div>
  );
};
