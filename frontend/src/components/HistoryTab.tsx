import React, { useState, useEffect } from "react";
import { Badge } from "../../components/ui/badge";
import { ScrollArea } from "../../components/ui/scroll-area";

interface ApiCallHistory {
  aiTips: Array<{
    tag: string;
    content: string;
  }>;
  created_at: string;
  turns: Array<{
    speaker: "agent" | "customer";
    transcript: string;
    timestamp: string;
  }>;
  activityFeed: Array<{
    name: string;
    input: string;
    output: string;
    status: string;
  }>;
  call_id: string;
  window_number: number;
}

interface HistoricalCall {
  id: string;
  customerName: string;
  date: string;
  duration: string;
  outcome: "resolved" | "escalated" | "follow-up" | "cancelled";
  aiTips: Array<{
    id: string;
    type: "urgent" | "suggestion" | "info";
    message: string;
    timestamp: string;
  }>;
  activityFeed: Array<{
    id: string;
    type: "ticket" | "update" | "tag" | "note";
    action: string;
    timestamp: string;
  }>;
}

const transformApiDataToHistoricalCalls = (
  apiData: ApiCallHistory[]
): HistoricalCall[] => {
  return apiData.map((call, index) => {
    const firstCustomerMessage = call.turns.find(
      (turn) => turn.speaker === "customer"
    );
    const callDate = new Date(call.created_at);
    const duration =
      call.turns.length > 0
        ? `${Math.max(1, Math.floor(call.turns.length / 2))} Min`
        : "0 Min";

    const getOutcomeFromTips = (
      tips: typeof call.aiTips
    ): "resolved" | "escalated" | "follow-up" | "cancelled" => {
      if (tips.some((tip) => tip.tag.toLowerCase().includes("escalat")))
        return "escalated";
      if (tips.some((tip) => tip.tag.toLowerCase().includes("follow")))
        return "follow-up";
      if (tips.some((tip) => tip.tag.toLowerCase().includes("cancel")))
        return "cancelled";
      return "resolved";
    };

    const mapTipType = (tag: string): "urgent" | "suggestion" | "info" => {
      const lowerTag = tag.toLowerCase();
      if (lowerTag.includes("urgent") || lowerTag.includes("critical"))
        return "urgent";
      if (lowerTag.includes("suggestion") || lowerTag.includes("recommend"))
        return "suggestion";
      return "info";
    };

    const mapActivityType = (
      name: string
    ): "ticket" | "update" | "tag" | "note" => {
      const lowerName = name.toLowerCase();
      if (lowerName.includes("ticket")) return "ticket";
      if (lowerName.includes("update")) return "update";
      if (lowerName.includes("tag")) return "tag";
      return "note";
    };

    return {
      id: call.call_id,
      customerName: firstCustomerMessage
        ? `Customer ${call.window_number}`
        : `Call ${call.window_number}`,
      date: callDate.toISOString().split("T")[0],
      duration,
      outcome: getOutcomeFromTips(call.aiTips),
      aiTips: call.aiTips.map((tip, tipIndex) => ({
        id: `${call.call_id}-tip-${tipIndex}`,
        type: mapTipType(tip.tag),
        message: tip.content,
        timestamp: "Recent",
      })),
      activityFeed: call.activityFeed.map((activity, actIndex) => ({
        id: `${call.call_id}-activity-${actIndex}`,
        type: mapActivityType(activity.name),
        action: `${activity.name}: ${activity.status}`,
        timestamp: "Recent",
      })),
    };
  });
};

const fetchCallHistory = async (): Promise<ApiCallHistory[]> => {
  try {
    const response = await (window as any).electronAPI.fetchCallHistory();
    return response || [];
  } catch (error) {
    console.error("Failed to fetch call history:", error);
    return [];
  }
};

const getOutcomeColor = (outcome: string) => {
  switch (outcome) {
    case "resolved":
      return "bg-green-600 text-green-100 hover:bg-green-700";
    case "escalated":
      return "bg-red-600 text-red-100 hover:bg-red-700";
    case "follow-up":
      return "bg-yellow-600 text-yellow-100 hover:bg-yellow-700";
    case "cancelled":
      return "bg-gray-600 text-gray-100 hover:bg-gray-700";
    default:
      return "bg-blue-600 text-blue-100 hover:bg-blue-700";
  }
};

const getTipTypeColor = (type: string) => {
  switch (type) {
    case "urgent":
      return "bg-red-600/20 text-red-400 border-l-4 border-red-600";
    case "suggestion":
      return "bg-yellow-600/20 text-yellow-400 border-l-4 border-yellow-600";
    case "info":
      return "bg-blue-600/20 text-blue-400 border-l-4 border-blue-600";
    default:
      return "bg-gray-600/20 text-gray-400 border-l-4 border-gray-600";
  }
};

const getActivityTypeIcon = (type: string) => {
  switch (type) {
    case "ticket":
      return "🎫";
    case "update":
      return "🔄";
    case "tag":
      return "🏷️";
    case "note":
      return "📝";
    default:
      return "📋";
  }
};

export const HistoryTab: React.FC = () => {
  const [historicalCalls, setHistoricalCalls] = useState<HistoricalCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCallHistory = async () => {
      try {
        setLoading(true);
        setError(null);
        const apiData = await fetchCallHistory();
        const transformedData = transformApiDataToHistoricalCalls(apiData);
        setHistoricalCalls(transformedData);
      } catch (err) {
        setError("Failed to load call history");
        console.error("Error loading call history:", err);
      } finally {
        setLoading(false);
      }
    };

    loadCallHistory();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Past Calls</h1>
        </div>
        <div className="flex items-center justify-center h-[400px]">
          <p className="text-muted-foreground">Loading call history...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Past Calls</h1>
        </div>
        <div className="flex items-center justify-center h-[400px]">
          <p className="text-red-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Past Calls</h1>
      </div>

      <ScrollArea className="h-[600px]">
        <div className="space-y-4">
          {historicalCalls.map((call) => (
            <div
              key={call.id}
              className="bg-card border border-border rounded-lg p-4 hover:bg-accent/5 transition-colors"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-card-foreground">
                      {call.customerName}
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {call.date} • {call.duration}
                  </p>
                </div>

                <div className="ml-4">
                  <Badge
                    className={`${getOutcomeColor(call.outcome)} capitalize`}
                  >
                    {call.outcome}
                  </Badge>
                </div>
              </div>

              {/* AI Tips Section */}
              {call.aiTips.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm font-medium text-card-foreground">
                      🧠 AI Tips
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {call.aiTips.length} active
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {call.aiTips.map((tip) => (
                      <div
                        key={tip.id}
                        className={`p-3 rounded-lg text-sm ${getTipTypeColor(
                          tip.type
                        )}`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <Badge
                            variant="outline"
                            className="text-xs capitalize border-current bg-transparent"
                          >
                            {tip.type}
                          </Badge>
                          <span className="text-xs opacity-75">
                            {tip.timestamp}
                          </span>
                        </div>
                        <p className="text-sm leading-relaxed">{tip.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Activity Feed Section */}
              {call.activityFeed.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm font-medium text-card-foreground">
                      📈 Activity Feed
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {call.activityFeed.length} recent
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {call.activityFeed.map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm">
                            {getActivityTypeIcon(activity.type)}
                          </span>
                          <span className="text-sm text-card-foreground">
                            {activity.action}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {activity.timestamp}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
