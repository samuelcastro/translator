import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { useTranslations } from "@/components/translations-context";
import { Message } from "@/types";
import React from "react";

interface TokenUsageDisplayProps {
  messages: Message[] | Record<string, unknown>[];
}

interface TokenUsageData {
  role?: string;
  type?: string;
  response?: {
    usage?: {
      total_tokens?: number;
      input_tokens?: number;
      output_tokens?: number;
    };
  };
}

export function TokenUsageDisplay({ messages }: TokenUsageDisplayProps) {
  const { t } = useTranslations();

  // Type guard to check if a message has token data
  const hasTokenData = (msg: unknown): msg is TokenUsageData => {
    if (typeof msg !== "object" || msg === null) return false;

    const typedMsg = msg as Record<string, unknown>;

    if (
      typeof typedMsg.type !== "string" ||
      typedMsg.type !== "response.done"
    ) {
      return false;
    }

    if (!typedMsg.response || typeof typedMsg.response !== "object") {
      return false;
    }

    const response = typedMsg.response as Record<string, unknown>;
    return typeof response.usage === "object" && response.usage !== null;
  };

  // Helper function to safely extract token data
  const getTokenData = (msg: unknown) => {
    if (!hasTokenData(msg)) return null;

    const response = msg.response;
    if (!response?.usage) return null;

    const usage = response.usage;

    return [
      { label: t("tokenUsage.total"), value: usage.total_tokens ?? 0 },
      { label: t("tokenUsage.input"), value: usage.input_tokens ?? 0 },
      { label: t("tokenUsage.output"), value: usage.output_tokens ?? 0 },
    ];
  };

  return (
    <>
      {messages.length > 0 && (
        <Accordion
          type="single"
          collapsible
          key="token-usage"
          className="w-full"
        >
          <AccordionItem value="token-usage">
            <AccordionTrigger>
              <CardTitle className="text-sm font-medium">
                {t("tokenUsage.usage")}
              </CardTitle>
            </AccordionTrigger>
            <AccordionContent>
              <Card>
                <CardContent>
                  <div className="space-y-1 mt-4">
                    {messages
                      .filter((msg): msg is Record<string, unknown> => {
                        const typedMsg = msg as Record<string, unknown>;
                        return (
                          typeof typedMsg.type === "string" &&
                          typedMsg.type === "response.done"
                        );
                      })
                      .slice(-1)
                      .map((msg, index) => {
                        const tokenData = getTokenData(msg);
                        if (!tokenData) return null;

                        return (
                          <Table key={`token-usage-table-${index}`}>
                            <TableBody>
                              {tokenData.map(({ label, value }) => (
                                <TableRow key={label}>
                                  <TableCell className="font-medium motion-preset-focus">
                                    {label}
                                  </TableCell>
                                  <TableCell>{String(value)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        );
                      })}
                  </div>
                </CardContent>
              </Card>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
    </>
  );
}
