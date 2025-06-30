"use client";

import { Button } from "../../components/ui/button";
import React, { useState, useEffect } from "react";
import {
  Pie,
  PieChart,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  Cell,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "../../components/ui/chart";

interface CallAnalyticsProps {
  onNextCall: () => void;
  clientEmail?: string;
  callId?: string;
}

// Mock data structure
const mockAnalyticsData = {
  client_email: {
    S: "test@example.com",
  },
  created_at: {
    S: "2025-06-28T10:20:08.979455+00:00",
  },
  actionItems: {
    L: [
      {
        S: "Follow up with customer if the reset email is not received.",
      },
      {
        S: "Consider manual password reset if issue persists.",
      },
    ],
  },
  agentPerformance: {
    M: {
      avgResponseLatencySeconds: {
        N: "15",
      },
      empathyScore: {
        N: "70",
      },
      knowledgeScore: {
        N: "75",
      },
      professionalismScore: {
        N: "80",
      },
    },
  },
  callMetrics: {
    M: {
      agentTalkTime: {
        N: "60",
      },
      customerTalkTime: {
        N: "40",
      },
      duration: {
        S: "00:50",
      },
      holdTime: {
        N: "0",
      },
    },
  },
  call_id: {
    S: "mock-call-id",
  },
  emotions: {
    L: [
      {
        M: {
          emotion: {
            S: "Frustration",
          },
          intensity: {
            N: "70",
          },
        },
      },
      {
        M: {
          emotion: {
            S: "Anxiety",
          },
          intensity: {
            N: "45",
          },
        },
      },
    ],
  },
  issueResolution: {
    M: {
      category: {
        S: "Technical Support",
      },
      escalationRisk: {
        N: "40",
      },
      resolutionTimeMinutes: {
        N: "0",
      },
      resolved: {
        BOOL: false,
      },
    },
  },
  keyInsights: {
    L: [
      {
        S: "Customer did not receive the password reset email.",
      },
      {
        S: "Agent suggested checking spam or junk folder.",
      },
      {
        S: "Potential need for manual password reset or escalation.",
      },
    ],
  },
  memory: {
    M: {
      deliverables: {
        L: [
          {
            S: "Customer attempted password reset but did not receive email.",
          },
          {
            S: "Agent advised checking spam folder.",
          },
        ],
      },
      improvementAreas: {
        L: [
          {
            S: "Offer manual reset or escalation sooner if email is not received.",
          },
        ],
      },
    },
  },
  satisfaction: {
    M: {
      prediction: {
        S: "Neutral",
      },
      score: {
        N: "60",
      },
    },
  },
  sentiment: {
    M: {
      label: {
        S: "Neutral",
      },
      score: {
        N: "50",
      },
    },
  },
  tags: {
    L: [
      {
        S: "Password Reset",
      },
      {
        S: "Email Issue",
      },
      {
        S: "Technical Support",
      },
    ],
  },
};

export const CallAnalytics: React.FC<CallAnalyticsProps> = ({
  onNextCall,
  clientEmail = "test@example.com",
  callId,
}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCallAnalytics = async () => {
    console.log('🔍 fetchCallAnalytics called with callId:', callId);
    console.log('🔍 callId type:', typeof callId);
    console.log('🔍 callId truthy:', !!callId);
    
    if (!callId) {
      console.log('❌ No call ID provided, setting error');
      setError("No call ID provided");
      return;
    }

    console.log('✅ Starting API call with callId:', callId);
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        "https://r1m1mxunle.execute-api.ap-southeast-2.amazonaws.com/default/getCallAnalytics",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            client_email: clientEmail,
            call_id: callId,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const apiData = await response.json();

      // Transform API response to match the component's expected format
      const transformedData = {
        client_email: { S: apiData.client_email || clientEmail },
        created_at: { S: new Date().toISOString() },
        call_id: { S: apiData.call_id || callId },
        sentiment: {
          M: {
            score: { N: apiData.sentiment?.score?.toString() || "50" },
            label: { S: apiData.sentiment?.label || "Neutral" },
          },
        },
        satisfaction: {
          M: {
            score: { N: apiData.satisfaction?.score?.toString() || "60" },
            prediction: { S: apiData.satisfaction?.prediction || "Neutral" },
          },
        },
        emotions: {
          L: (apiData.emotions || []).map((emotion: { emotion: string; intensity?: number }) => ({
            M: {
              emotion: { S: emotion.emotion },
              intensity: { N: emotion.intensity?.toString() || "0" },
            },
          })),
        },
        callMetrics: {
          M: {
            duration: { S: apiData.callMetrics?.duration || "00:00" },
            agentTalkTime: {
              N: apiData.callMetrics?.agentTalkTime?.toString() || "0",
            },
            customerTalkTime: {
              N: apiData.callMetrics?.customerTalkTime?.toString() || "0",
            },
            holdTime: { N: apiData.callMetrics?.holdTime?.toString() || "0" },
          },
        },
        issueResolution: {
          M: {
            resolved: { BOOL: apiData.issueResolution?.resolved || false },
            category: { S: apiData.issueResolution?.category || "General" },
            resolutionTimeMinutes: {
              N:
                apiData.issueResolution?.resolutionTimeMinutes?.toString() ||
                "0",
            },
            escalationRisk: {
              N: apiData.issueResolution?.escalationRisk?.toString() || "0",
            },
          },
        },
        agentPerformance: {
          M: {
            professionalismScore: {
              N:
                apiData.agentPerformance?.professionalismScore?.toString() ||
                "80",
            },
            empathyScore: {
              N: apiData.agentPerformance?.empathyScore?.toString() || "70",
            },
            knowledgeScore: {
              N: apiData.agentPerformance?.knowledgeScore?.toString() || "75",
            },
            avgResponseLatencySeconds: {
              N:
                apiData.agentPerformance?.avgResponseLatencySeconds?.toString() ||
                "15",
            },
          },
        },
        keyInsights: {
          L: (apiData.keyInsights || []).map((insight: string) => ({
            S: insight,
          })),
        },
        actionItems: {
          L: (apiData.actionItems || []).map((item: string) => ({ S: item })),
        },
        tags: {
          L: (apiData.tags || []).map((tag: string) => ({ S: tag })),
        },
        memory: {
          M: {
            deliverables: {
              L: (apiData.memory?.deliverables || []).map((item: string) => ({
                S: item,
              })),
            },
            improvementAreas: {
              L: (apiData.memory?.improvementAreas || []).map(
                (item: string) => ({ S: item })
              ),
            },
          },
        },
      };

      setData(transformedData);
    } catch (err) {
      console.error("Error fetching call analytics:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch analytics";
      console.error("Request details:", {
        url: "https://r1m1mxunle.execute-api.ap-southeast-2.amazonaws.com/default/getCallAnalytics",
        body: JSON.stringify({
          client_email: clientEmail,
          call_id: callId,
        }),
        error: errorMessage
      });
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('🔍 CallAnalytics useEffect triggered');
    console.log('  - clientEmail:', clientEmail);
    console.log('  - callId:', callId);
    fetchCallAnalytics();
  }, [clientEmail, callId]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 dark:text-green-400";
    if (score >= 60) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getScoreBg = (score: number) => {
    if (score >= 80)
      return "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800";
    if (score >= 60)
      return "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800";
    return "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800";
  };

  // Chart configurations
  const performanceChartConfig = {
    score: { label: "Score" },
    empathy: { label: "Empathy", color: "hsl(var(--chart-1))" },
    knowledge: { label: "Knowledge", color: "hsl(var(--chart-2))" },
    professionalism: { label: "Professionalism", color: "hsl(var(--chart-3))" },
    responseTime: { label: "Response Time", color: "hsl(var(--chart-4))" },
  } satisfies ChartConfig;

  const talkTimeChartConfig = {
    agent: { label: "Agent", color: "hsl(var(--chart-1))" },
    customer: { label: "Customer", color: "hsl(var(--chart-2))" },
  } satisfies ChartConfig;

  const emotionChartConfig = {
    intensity: {
      label: "Intensity",
      color: "hsl(var(--chart-1))",
    },
  } satisfies ChartConfig;

  if (loading || !data) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">
            📊 Call Analytics
          </h1>
          <Button onClick={onNextCall}>Go To Next Call</Button>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">
            📊 Call Analytics
          </h1>
          <Button onClick={onNextCall}>Go To Next Call</Button>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-red-500 mb-4">❌ Error loading analytics</div>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={fetchCallAnalytics} variant="outline">
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Transform data for charts
  const performanceData = [
    {
      metric: "Empathy",
      score: parseInt(data.agentPerformance.M.empathyScore.N),
    },
    {
      metric: "Knowledge",
      score: parseInt(data.agentPerformance.M.knowledgeScore.N),
    },
    {
      metric: "Professional",
      score: parseInt(data.agentPerformance.M.professionalismScore.N),
    },
    {
      metric: "Response",
      score:
        100 - parseInt(data.agentPerformance.M.avgResponseLatencySeconds.N),
    },
  ];

  const talkTimeData = [
    {
      category: "agent",
      value: parseInt(data.callMetrics.M.agentTalkTime.N),
      fill: "var(--color-agent)",
    },
    {
      category: "customer",
      value: parseInt(data.callMetrics.M.customerTalkTime.N),
      fill: "var(--color-customer)",
    },
  ];

  const emotionData = data.emotions.L.map((e) => ({
    emotion: e.M.emotion.S,
    intensity: parseInt(e.M.intensity.N),
  })).sort((a, b) => a.intensity - b.intensity);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">
          📊 Call Analytics
        </h1>
        <div className="flex gap-2">
          <Button onClick={fetchCallAnalytics} variant="outline" size="sm">
            🔄 Refresh
          </Button>
          <Button onClick={onNextCall}>Go To Next Call</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 h-[calc(100vh-12rem)] max-w-none">
        {/* Left Column - Call Overview & Performance */}
        <div className="xl:col-span-1 flex flex-col gap-6 h-full">
          {/* Call Overview */}
          <Card className="flex-1">
            <CardHeader>
              <CardTitle>Call Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Client Email
                  </span>
                  <span className="text-sm font-medium">
                    {data.client_email.S}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Duration
                  </span>
                  <span className="text-sm font-medium">
                    {data.callMetrics.M.duration.S}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Category
                  </span>
                  <span className="text-sm font-medium">
                    {data.issueResolution.M.category.S}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Resolved
                  </span>
                  <span
                    className={`text-sm font-medium ${
                      data.issueResolution.M.resolved.BOOL
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {data.issueResolution.M.resolved.BOOL ? "Yes" : "No"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Agent Performance */}
          <Card className="flex-[2]">
            <CardHeader className="items-center pb-0">
              <CardTitle>Agent Performance</CardTitle>
              <CardDescription>Performance metrics breakdown</CardDescription>
            </CardHeader>
            <CardContent className="pb-0">
              <ChartContainer
                config={performanceChartConfig}
                className="mx-auto aspect-square max-h-[280px]"
              >
                <RadarChart data={performanceData}>
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent />}
                  />
                  <PolarAngleAxis dataKey="metric" />
                  <PolarGrid />
                  <Radar
                    dataKey="score"
                    fill="var(--color-empathy)"
                    fillOpacity={0.6}
                    dot={{
                      r: 4,
                      fillOpacity: 1,
                    }}
                  />
                </RadarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Sentiment & Satisfaction */}
          <Card className="flex-1">
            <CardHeader>
              <CardTitle>Customer Sentiment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div
                  className={`p-3 rounded-lg border ${getScoreBg(
                    parseInt(data.sentiment.M.score.N)
                  )}`}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Sentiment</span>
                    <span
                      className={`text-sm font-bold ${getScoreColor(
                        parseInt(data.sentiment.M.score.N)
                      )}`}
                    >
                      {data.sentiment.M.label.S}
                    </span>
                  </div>
                </div>
                <div
                  className={`p-3 rounded-lg border ${getScoreBg(
                    parseInt(data.satisfaction.M.score.N)
                  )}`}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Satisfaction</span>
                    <span
                      className={`text-sm font-bold ${getScoreColor(
                        parseInt(data.satisfaction.M.score.N)
                      )}`}
                    >
                      {data.satisfaction.M.prediction.S} (
                      {data.satisfaction.M.score.N}%)
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Middle Column - Insights & Action Items */}
        <div className="xl:col-span-1 flex flex-col gap-6 h-full">
          {/* Key Insights */}
          <Card className="flex-1">
            <CardHeader>
              <CardTitle>Key Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.keyInsights.L.map((insight, index) => (
                  <div
                    key={index}
                    className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg"
                  >
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      {insight.S}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Action Items */}
          <Card className="flex-1">
            <CardHeader>
              <CardTitle>Action Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.actionItems.L.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg"
                  >
                    <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                    <p className="text-sm text-orange-700 dark:text-orange-300">
                      {item.S}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Tags */}
          <Card className="flex-1">
            <CardHeader>
              <CardTitle>Tags</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {data.tags.L.map((tag, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm rounded-full"
                  >
                    {tag.S}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Talk Time & Memory */}
        <div className="xl:col-span-1 flex flex-col gap-6 h-full">
          {/* Call Metrics */}
          <Card className="flex-[2]">
            <CardHeader className="items-center pb-0">
              <CardTitle>Talk Time Distribution</CardTitle>
              <CardDescription>Agent vs Customer talk time</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 pb-0">
              <ChartContainer
                config={talkTimeChartConfig}
                className="mx-auto aspect-square max-h-[250px]"
              >
                <PieChart>
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent hideLabel />}
                  />
                  <Pie
                    data={talkTimeData}
                    dataKey="value"
                    nameKey="category"
                    innerRadius={60}
                    strokeWidth={5}
                    // FIX: Restore recharts animation props for smooth drawing
                    isAnimationActive={true}
                    animationDuration={800}
                  >
                    {talkTimeData.map((entry) => (
                      <Cell key={entry.category} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Hold Time:</span>
                  <span className="font-medium">
                    {data.callMetrics.M.holdTime.N}s
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Duration:</span>
                  <span className="font-medium">
                    {data.callMetrics.M.duration.S}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Emotions */}
          <Card className="flex-[2]">
            <CardHeader>
              <CardTitle>Emotion Analysis</CardTitle>
              <CardDescription>
                Detected emotion intensity during the call
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={emotionChartConfig}>
                <BarChart
                  accessibilityLayer
                  data={emotionData}
                  layout="vertical"
                  margin={{
                    left: 20,
                  }}
                >
                  <YAxis
                    dataKey="emotion"
                    type="category"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                  />
                  <XAxis dataKey="intensity" type="number" hide />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent hideLabel />}
                  />
                  <Bar
                    dataKey="intensity"
                    fill="var(--color-intensity)"
                    radius={5}
                  />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Memory & Improvement */}
          <Card className="flex-1">
            <CardHeader>
              <CardTitle>Memory & Improvements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-2">
                    Deliverables
                  </h4>
                  <div className="space-y-1">
                    {data.memory.M.deliverables.L.map((item, index) => (
                      <p key={index} className="text-xs text-muted-foreground">
                        {item.S}
                      </p>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-2">
                    Improvement Areas
                  </h4>
                  <div className="space-y-1">
                    {data.memory.M.improvementAreas.L.map((item, index) => (
                      <p key={index} className="text-xs text-muted-foreground">
                        {item.S}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
