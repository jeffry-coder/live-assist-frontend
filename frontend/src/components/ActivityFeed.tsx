import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { ScrollArea } from "../../components/ui/scroll-area";
import { Separator } from "../../components/ui/separator";
import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/dialog";

interface ActivityItem {
  id: string;
  action: string;
  description: string;
  timestamp: string;
  type: "ticket" | "update" | "tag" | "note" | "email";
  emailData?: {
    subject: string;
    body: string;
    status: string;
  };
}

interface ActivityFeedProps {
  activities?: ActivityItem[];
  isCallActive?: boolean;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({
  activities: propActivities,
  isCallActive = false,
}) => {
  const [apiActivities, setApiActivities] = useState<ActivityItem[]>([]);
  const [isUsingApiData, setIsUsingApiData] = useState(false);
  const [confirmedEmails, setConfirmedEmails] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    if (!isCallActive) {
      // Reset state when call is not active
      setApiActivities([]);
      setIsUsingApiData(false);
      setConfirmedEmails(new Set());
      return;
    }

    // Listen for API response data
    const handleApiResponse = (data: any) => {
      console.log("ActivityFeed: Processing API response data", data);

      try {
        // Parse the response_body JSON string
        const responseBody = JSON.parse(data.response_body);

        if (
          responseBody.activityFeed &&
          Array.isArray(responseBody.activityFeed)
        ) {
          // Convert API response format to ActivityItem format
          const convertedActivities: ActivityItem[] =
            responseBody.activityFeed.map((activity: any, index: number) => {
              // Check if this is a send_email activity
              if (activity.name === "Send Email" && activity.input) {
                try {
                  const emailInput = JSON.parse(activity.input);
                  return {
                    id: `${
                      data.request_payload?.call_id || "unknown"
                    }-activity-${index}`,
                    action: "Send Email",
                    description: `Email ready to send: ${
                      emailInput.subject || "No subject"
                    }`,
                    timestamp: new Date(data.timestamp).toLocaleTimeString(),
                    type: "email" as const,
                    emailData: {
                      subject: emailInput.subject || "No subject",
                      body: emailInput.body || "No content",
                      status: activity.status || "pending",
                    },
                  };
                } catch (error) {
                  console.error("Error parsing email input:", error);
                }
              }

              // For other activity types, use the name as the action
              return {
                id: `${
                  data.request_payload?.call_id || "unknown"
                }-activity-${index}`,
                action: activity.name || "Unknown Action",
                description: activity.output || "No output",
                timestamp: new Date(data.timestamp).toLocaleTimeString(),
                type: mapActivityType(activity.name),
              };
            });

          setApiActivities(convertedActivities);
          setIsUsingApiData(true);
        }
      } catch (error) {
        console.error("Error parsing API response data:", error);
      }
    };

    // Set up event listener for API response data
    if (window.electronAPI?.onApiResponseData) {
      window.electronAPI.onApiResponseData(handleApiResponse);
    }

    return () => {
      // Cleanup - remove listeners if needed
      if (window.electronAPI?.removeAllListeners) {
        window.electronAPI.removeAllListeners("api-response-data");
      }
    };
  }, [isCallActive]);

  const mapActivityType = (
    type: string | undefined
  ): "ticket" | "update" | "tag" | "note" | "email" => {
    if (!type) return "update";

    switch (type) {
      case "Get Contact by Email":
        return "ticket";
      case "Create Support Ticket":
        return "ticket";
      case "Update Contact Property":
        return "update";
      case "Get Contact Deals":
        return "ticket";
      case "Search Contacts by Company":
        return "ticket";
      case "Send Email":
        return "email";
      case "Search Company Manuals":
        return "note";
      default:
        return "update";
    }
  };

  // Use API response data if available, otherwise fall back to props
  const activities = isUsingApiData ? apiActivities : propActivities || [];
  const getTypeIcon = (type: string) => {
    switch (type) {
      case "ticket":
        return { icon: "🎫", shape: "rounded-full", label: "Ticket" };
      case "update":
        return { icon: "⚙️", shape: "rounded-md", label: "Update" };
      case "tag":
        return { icon: "🏷️", shape: "rounded-lg", label: "Tag" };
      case "note":
        return { icon: "📝", shape: "rounded-sm", label: "Note" };
      case "email":
        return { icon: "📧", shape: "rounded-md", label: "Email" };
      default:
        return { icon: "📋", shape: "rounded", label: "Activity" };
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "ticket":
        return "bg-blue-600 text-blue-50 border-blue-700";
      case "update":
        return "bg-emerald-600 text-emerald-50 border-emerald-700";
      case "tag":
        return "bg-purple-600 text-purple-50 border-purple-700";
      case "note":
        return "bg-orange-600 text-orange-50 border-orange-700";
      case "email":
        return "bg-red-600 text-red-50 border-red-700";
      default:
        return "bg-gray-600 text-gray-50 border-gray-700";
    }
  };

  const handleEmailConfirmation = async (
    activityId: string,
    emailData: { subject: string; body: string }
  ) => {
    try {
      const emailPayload = {
        to: "jeffry.code@gmail.com",
        subject: emailData.subject,
        body: emailData.body,
      };

      // Check if we're in Electron environment
      if (window.electronAPI && window.electronAPI.sendEmail) {
        console.log("Using Electron IPC for email sending");
        const response = await window.electronAPI.sendEmail(emailPayload);
        console.log("Email sent successfully via IPC:", response);
      } else {
        // Fallback to direct fetch for web environment
        console.log("Using direct fetch for email sending");
        const response = await fetch(
          "https://eigfrl49hf.execute-api.ap-southeast-2.amazonaws.com/default/sendEmail",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(emailPayload),
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        console.log("Email sent successfully via fetch:", result);
      }

      setConfirmedEmails((prev) => new Set([...prev, activityId]));
    } catch (error) {
      console.error("Error sending email:", error);
      // Still mark as confirmed even if API fails, to prevent retry loops
      setConfirmedEmails((prev) => new Set([...prev, activityId]));
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>📈 Activity Feed</span>
          <Badge variant="outline">{activities.length} recent</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        {activities.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-center py-12">
            <div>
              <div className="text-4xl mb-3">📈</div>
              <p className="text-muted-foreground text-sm">
                No recent activity
              </p>
              <p className="text-muted-foreground text-xs mt-1">
                Actions done by AI will appear here
              </p>
            </div>
          </div>
        ) : (
          <ScrollArea className="flex-1 min-h-0">
            <div className="space-y-4">
              {activities.map((activity, index) => (
                <div key={activity.id}>
                  <div className="flex items-start gap-4 p-4 rounded-md hover:bg-muted/50 transition-colors">
                    <span
                      className="text-lg mt-0.5 flex-shrink-0"
                      title={getTypeIcon(activity.type).label}
                    >
                      {getTypeIcon(activity.type).icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge
                          className={getTypeColor(activity.type)}
                          variant="secondary"
                        >
                          {activity.type.charAt(0).toUpperCase() +
                            activity.type.slice(1)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {activity.timestamp}
                        </span>
                      </div>
                      <p className="font-medium text-sm leading-relaxed">
                        {activity.action}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        {activity.description}
                      </p>

                      {/* Email confirmation button and dialog */}
                      {activity.type === "email" &&
                        activity.emailData &&
                        !confirmedEmails.has(activity.id) && (
                          <div className="mt-3">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs"
                                >
                                  📧 Confirm Send Email
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle>Confirm Email Send</DialogTitle>
                                  <DialogDescription>
                                    Review the email content before sending to
                                    the customer.
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <label className="text-sm font-medium">
                                      Subject:
                                    </label>
                                    <div className="mt-1 p-3 bg-muted rounded-md text-sm">
                                      {activity.emailData.subject}
                                    </div>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">
                                      Content:
                                    </label>
                                    <div className="mt-1 p-3 bg-muted rounded-md text-sm whitespace-pre-wrap max-h-60 overflow-y-auto">
                                      {activity.emailData.body}
                                    </div>
                                  </div>
                                </div>
                                <DialogFooter>
                                  <DialogClose asChild>
                                    <Button variant="outline">Cancel</Button>
                                  </DialogClose>
                                  <DialogClose asChild>
                                    <Button
                                      onClick={() =>
                                        handleEmailConfirmation(
                                          activity.id,
                                          activity.emailData!
                                        )
                                      }
                                      variant="outline"
                                    >
                                      Send Email
                                    </Button>
                                  </DialogClose>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          </div>
                        )}

                      {/* Show confirmation message if email was confirmed */}
                      {activity.type === "email" &&
                        confirmedEmails.has(activity.id) && (
                          <div className="mt-3">
                            <Badge
                              variant="secondary"
                              className="bg-green-100 text-green-800 border-green-300"
                            >
                              ✅ Email Confirmed
                            </Badge>
                          </div>
                        )}
                    </div>
                  </div>
                  {index < activities.length - 1 && (
                    <Separator className="my-1" />
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
