import React, { useState } from "react";
import * as ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SidebarProvider, SidebarInset } from "../components/ui/sidebar";
import { AppSidebar } from "./components/AppSidebar";
import { LiveTab } from "./components/LiveTab";
import { HistoryTab } from "./components/HistoryTab";
import { ThemeProvider } from "./components/theme-provider";
import { ModeToggle } from "./components/mode-toggle";

const queryClient = new QueryClient();

// Mock data
const mockCustomer = {
  name: "Sarah Johnson",
  email: "sarah.johnson@techcorp.com",
  company: "TechCorp Solutions",
  callsThisMonth: 12,
  lastContact: "2 days ago",
  satisfactionScore: 4.8,
  accountTier: "Premium",
  avatar: "",
};

const mockAITips = [
  // {
  //   id: "1",
  //   type: "escalation" as const,
  //   message:
  //     "Customer has mentioned billing issues 3 times in the last 10 minutes. Consider escalating to billing specialist.",
  //   timestamp: "2 min ago",
  //   priority: "urgent" as const,
  // },
  // {
  //   id: "2",
  //   type: "upsell" as const,
  //   message:
  //     "Customer is using 90% of their current plan capacity. Good opportunity to discuss upgrade options.",
  //   timestamp: "5 min ago",
  //   priority: "suggestion" as const,
  // },
  // {
  //   id: "3",
  //   type: "history" as const,
  //   message:
  //     "Customer previously expressed interest in enterprise features during last call on March 15th.",
  //   timestamp: "8 min ago",
  //   priority: "info" as const,
  // },
  // {
  //   id: "4",
  //   type: "info" as const,
  //   message:
  //     "Customer's contract renewal is coming up in 30 days. Consider discussing renewal terms.",
  //   timestamp: "12 min ago",
  //   priority: "info" as const,
  // },
  // {
  //   id: "5",
  //   type: "info" as const,
  //   message:
  //     "Customer's contract renewal is coming up in 30 days. Consider discussing renewal terms.",
  //   timestamp: "12 min ago",
  //   priority: "info" as const,
  // },
];

const mockActivities = [
  // {
  //   id: "1",
  //   action: "Created ticket for billing issue",
  //   description:
  //     "Ticket #12345 - Customer reported incorrect charges on last invoice",
  //   timestamp: "3 min ago",
  //   type: "ticket" as const,
  // },
  // {
  //   id: "2",
  //   action: "Updated customer preference",
  //   description: "Set communication preference to email for non-urgent matters",
  //   timestamp: "7 min ago",
  //   type: "update" as const,
  // },
  // {
  //   id: "3",
  //   action: "Tagged account as high-value",
  //   description:
  //     "Added 'high-value' tag based on annual contract value exceeding $50k",
  //   timestamp: "15 min ago",
  //   type: "tag" as const,
  // },
  // {
  //   id: "4",
  //   action: "Added call summary note",
  //   description:
  //     "Documented customer's feature requests and pain points from today's call",
  //   timestamp: "22 min ago",
  //   type: "note" as const,
  // },
];

const mockStatus = {
  connectionStatus: "connected" as const,
  recordingStatus: "listening" as const,
  lastUpdate: "12:34:56 PM",
  awsServicesHealth: {
    s3: "healthy" as const,
    lambda: "healthy" as const,
    transcribe: "degraded" as const,
  },
};

const App = () => {
  const [activeItem, setActiveItem] = useState("live");

  const renderContent = () => {
    switch (activeItem) {
      case "live":
        return (
          <LiveTab
            customer={mockCustomer}
            aiTips={mockAITips}
            activities={mockActivities}
          />
        );
      case "history":
        return <HistoryTab />;
      default:
        return null;
    }
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="electron-ui-theme">
        <SidebarProvider defaultOpen={true}>
          <AppSidebar activeItem={activeItem} onItemSelect={setActiveItem} />
          <SidebarInset>
            <header className="border-b flex items-center justify-between bg-background">
              <div className="p-4">
                <p className="text-muted-foreground text-sm">
                  Real-time AI assistance for customer support calls | AWS Lambda
                  Hackathon Devpost
                </p>
              </div>
              <div className="p-4">
                <ModeToggle />
              </div>
            </header>
            <div className="flex-1 p-4 overflow-auto">{renderContent()}</div>
          </SidebarInset>
        </SidebarProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

function render() {
  const root = ReactDOM.createRoot(document.getElementById("root"));
  root.render(<App />);
}

render();
