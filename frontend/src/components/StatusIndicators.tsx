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

interface CustomerProblem {
  id: string;
  title: string;
  description: string;
  category: "billing" | "technical" | "feature" | "account";
  severity: "low" | "medium" | "high" | "critical";
  status: "resolved" | "open" | "in-progress" | "escalated";
  reportedDate: string;
  resolvedDate?: string;
  assignedTo?: string;
  tags: string[];
}

interface HubSpotTicket {
  id: string;
  properties: {
    content: string;
    createdate: string;
    hs_lastmodifieddate: string;
    hs_object_id: string;
    hs_pipeline_stage: string;
    hs_ticket_category: string | null;
    hs_ticket_priority: string | null;
    hubspot_owner_id: string;
    subject: string;
  };
  created_at: string;
  updated_at: string;
  archived: boolean;
  archived_at: string | null;
}

interface ApiResponse {
  total: number;
  tickets: HubSpotTicket[];
}

interface StatusIndicatorsProps {
  problems?: CustomerProblem[];
  isCallActive?: boolean;
  customerName?: string;
}

export const StatusIndicators: React.FC<StatusIndicatorsProps> = ({
  problems,
  isCallActive = false,
  customerName,
}) => {
  const [customerProblems, setCustomerProblems] = useState<CustomerProblem[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCustomerProblems = async (name: string) => {
    setIsLoading(true);
    setError(null);

    try {
      let data: ApiResponse;

      // Check if we're in Electron environment
      if (window.electronAPI) {
        console.log("Using Electron IPC for ticket API call");
        data = await window.electronAPI.fetchTicketsByName(name, 100);
      } else {
        // Fallback to direct fetch for web environment
        console.log("Using direct fetch for ticket API call");
        const response = await fetch(
          "https://62wzl5xvn0.execute-api.ap-southeast-2.amazonaws.com/default/getTicketByName",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              owner_name: name,
              limit: 100,
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        data = await response.json();
      }

      // Map HubSpot tickets to CustomerProblem format
      const mappedProblems: CustomerProblem[] = data.tickets.map((ticket) => ({
        id: ticket.id,
        title: capitalizeFirstLetter(
          ticket.properties.subject || "Untitled Issue"
        ),
        description: ticket.properties.content || "No description available",
        category: mapTicketCategory(ticket.properties.hs_ticket_category),
        severity: mapTicketPriority(ticket.properties.hs_ticket_priority),
        status: mapPipelineStage(ticket.properties.hs_pipeline_stage),
        reportedDate: new Date(
          ticket.properties.createdate
        ).toLocaleDateString(),
        resolvedDate:
          ticket.properties.hs_pipeline_stage === "4"
            ? new Date(
                ticket.properties.hs_lastmodifieddate
              ).toLocaleDateString()
            : undefined,
        assignedTo: ticket.properties.hubspot_owner_id,
        tags: extractTags(ticket.properties.content, ticket.properties.subject),
      }));

      setCustomerProblems(mappedProblems);
    } catch (err) {
      console.error("Error fetching customer problems:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fetch customer problems"
      );
      setCustomerProblems([]);
    } finally {
      setIsLoading(false);
    }
  };

  const mapTicketCategory = (
    category: string | null
  ): CustomerProblem["category"] => {
    if (!category) return "technical";
    const cat = category.toLowerCase();
    if (cat.includes("Billing") || cat.includes("payment")) return "billing";
    if (cat.includes("Feature") || cat.includes("enhancement"))
      return "feature";
    if (cat.includes("Account") || cat.includes("access")) return "account";
    return "technical";
  };

  const mapTicketPriority = (
    priority: string | null
  ): CustomerProblem["severity"] => {
    if (!priority) return "medium";
    const prio = priority.toLowerCase();
    if (prio.includes("critical") || prio.includes("urgent")) return "critical";
    if (prio.includes("high")) return "high";
    if (prio.includes("low")) return "low";
    return "medium";
  };

  const mapPipelineStage = (stage: string): CustomerProblem["status"] => {
    switch (stage) {
      case "1":
        return "open";
      case "2":
        return "in-progress";
      case "3":
        return "escalated";
      case "4":
        return "resolved";
      default:
        return "open";
    }
  };

  const extractTags = (content: string, subject: string): string[] => {
    const text = `${content} ${subject}`.toLowerCase();
    const tags: string[] = [];

    if (
      text.includes("billing") ||
      text.includes("payment") ||
      text.includes("invoice")
    )
      tags.push("billing");
    if (
      text.includes("credit card") ||
      text.includes("paypal") ||
      text.includes("chase")
    )
      tags.push("payment");
    if (text.includes("api") || text.includes("integration")) tags.push("API");
    if (text.includes("urgent") || text.includes("critical"))
      tags.push("urgent");
    if (text.includes("bug") || text.includes("error")) tags.push("bug");
    if (text.includes("feature") || text.includes("enhancement"))
      tags.push("enhancement");

    return tags.length > 0 ? tags : ["general"];
  };

  const capitalizeFirstLetter = (str: string): string => {
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  const getSeverityBorderColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "border-l-red-500 bg-red-50/50 dark:bg-red-950/20";
      case "high":
        return "border-l-orange-500 bg-orange-50/50 dark:bg-orange-950/20";
      case "medium":
        return "border-l-yellow-500 bg-yellow-50/50 dark:bg-yellow-950/20";
      case "low":
        return "border-l-green-500 bg-green-50/50 dark:bg-green-950/20";
      default:
        return "border-l-gray-500 bg-gray-50/50 dark:bg-gray-950/20";
    }
  };

  const getSeverityBadgeColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-600 text-red-50 border-red-700";
      case "high":
        return "bg-orange-600 text-orange-50 border-orange-700";
      case "medium":
        return "bg-yellow-600 text-yellow-50 border-yellow-700";
      case "low":
        return "bg-green-600 text-green-50 border-green-700";
      default:
        return "bg-gray-600 text-gray-50 border-gray-700";
    }
  };

  useEffect(() => {
    if (isCallActive) {
      if (customerName) {
        // Customer name is available, fetch problems
        fetchCustomerProblems(customerName);
      } else {
        // Call is active but waiting for customer name, show loading
        setIsLoading(true);
        setError(null);
        setCustomerProblems([]);
      }
    } else {
      // Call not active, reset state
      setIsLoading(false);
      setCustomerProblems([]);
      setError(null);
    }
  }, [isCallActive, customerName]);

  // Use problems prop if provided, otherwise use state from API
  const displayProblems = problems || customerProblems;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "resolved":
        return "bg-green-600 text-green-100";
      case "escalated":
        return "bg-red-600 text-red-100";
      case "in-progress":
        return "bg-blue-600 text-blue-100";
      case "open":
        return "bg-yellow-600 text-yellow-100";
      default:
        return "bg-gray-600 text-gray-100";
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "billing":
        return "💳";
      case "technical":
        return "🔧";
      case "feature":
        return "✨";
      case "account":
        return "👤";
      default:
        return "📋";
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>📋 Customer Past Problems</span>
          <Badge variant="secondary">{displayProblems.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        {!isCallActive ? (
          <div className="flex-1 flex items-center justify-center text-center py-12">
            <div>
              <div className="text-4xl mb-3">📞</div>
              <p className="text-muted-foreground text-sm">
                Start a call to view problems
              </p>
              <p className="text-muted-foreground text-xs mt-1">
                Enter customer email to load their problem history
              </p>
            </div>
          </div>
        ) : isLoading ? (
          <div className="flex-1 flex items-center justify-center text-center py-12">
            <div>
              <div className="text-4xl mb-3">⏳</div>
              <p className="text-muted-foreground text-sm">
                Loading customer problems...
              </p>
              <p className="text-muted-foreground text-xs mt-1">
                Please wait while we fetch the data
              </p>
            </div>
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center text-center py-12">
            <div>
              <div className="text-4xl mb-3">⚠️</div>
              <p className="text-muted-foreground text-sm">
                Failed to load problems
              </p>
              <p className="text-muted-foreground text-xs mt-1">{error}</p>
            </div>
          </div>
        ) : displayProblems.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-center py-12">
            <div>
              <div className="text-4xl mb-3">📋</div>
              <p className="text-muted-foreground text-sm">
                No past problems found
              </p>
              <p className="text-muted-foreground text-xs mt-1">
                This customer has no reported issues
              </p>
            </div>
          </div>
        ) : (
          <ScrollArea className="flex-1 min-h-0">
            <div className="space-y-4">
              {displayProblems.map((problem, index) => (
                <div key={problem.id}>
                  <div
                    className={`p-4 border-l-4 ${getSeverityBorderColor(
                      problem.severity
                    )} rounded-r-md`}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className="text-lg flex-shrink-0"
                        title={problem.category}
                      >
                        {getCategoryIcon(problem.category)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Badge
                            className={getSeverityBadgeColor(problem.severity)}
                            variant="secondary"
                          >
                            {problem.severity.charAt(0).toUpperCase() +
                              problem.severity.slice(1)}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {problem.reportedDate}
                            {problem.assignedTo && ` • ${problem.assignedTo}`}
                          </span>
                        </div>
                        <h4 className="font-medium text-sm mb-1">
                          {problem.title}
                        </h4>
                        <p className="text-sm leading-relaxed text-muted-foreground mb-2">
                          {problem.description}
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="flex flex-wrap gap-1">
                            {problem.tags.slice(0, 3).map((tag, tagIndex) => (
                              <Badge
                                key={tagIndex}
                                variant="outline"
                                className="text-xs"
                              >
                                {capitalizeFirstLetter(tag)}
                              </Badge>
                            ))}
                            {problem.tags.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{problem.tags.length - 3}
                              </Badge>
                            )}
                          </div>
                          <Badge
                            className={getStatusColor(problem.status)}
                            variant="secondary"
                          >
                            {capitalizeFirstLetter(problem.status.replace("-", " "))}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                  {index < displayProblems.length - 1 && (
                    <Separator className="my-3" />
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
