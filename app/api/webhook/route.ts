import { NextResponse } from "next/server";
import type { WebhookPayload, WebhookResponse } from "@/types";

export async function POST(
  request: Request
): Promise<NextResponse<WebhookResponse>> {
  try {
    const data = (await request.json()) as WebhookPayload;
    console.log("Webhook received:", data);

    // Determine the action type
    let actionType: string;
    let actionData: unknown;

    if (data.scheduleFollowupAppointment) {
      actionType = "scheduleFollowupAppointment";
      actionData = data.scheduleFollowupAppointment;
    } else if (data.sendLabOrder) {
      actionType = "sendLabOrder";
      actionData = data.sendLabOrder;
    } else if (data.generateConversationSummary) {
      actionType = "generateConversationSummary";
      actionData = data.generateConversationSummary;
    } else {
      actionType = "unknown";
      actionData = data;
    }

    // Simulate sending to webhook.site
    const webhookUrl =
      process.env.WEBHOOK_SITE_URL || "https://webhook.site/your-id-here";
    const webhookResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        actionType,
        actionData,
        timestamp: new Date().toISOString(),
      }),
    });

    if (!webhookResponse.ok) {
      console.error("Webhook site error:", await webhookResponse.text());
    }

    // Return a success response with simulated delay for realism
    await new Promise((resolve) => setTimeout(resolve, 500));

    return NextResponse.json({
      success: true,
      actionType,
      message: `Action ${actionType} processed successfully`,
    });
  } catch (error) {
    console.error("Error in webhook API:", error);
    return NextResponse.json(
      {
        success: false,
        actionType: "error",
        message:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
