import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { CustomerOverviewCard } from "./CustomerOverviewCard";
import { EmailInputCard } from "./EmailInputCard";
import { AITipsPanel } from "./AITipsPanel";
import { ActivityFeed } from "./ActivityFeed";
import { StatusIndicators } from "./StatusIndicators";
import { RecorderStatus } from "./RecorderStatus";
import { CallAnalytics } from "./CallAnalytics";
import { fetchCustomerInfo } from "../services/customerApi";
import DynamoPollingService, {
  DynamoData,
} from "../services/dynamoPollingService";

interface ApiResponseData {
  call_id?: string;
  [key: string]: unknown;
}

interface LiveTabProps {
  customer: {
    name: string;
    email: string;
    company: string;
    callsThisMonth: number;
    lastContact: string;
    satisfactionScore: number;
    accountTier: string;
    avatar?: string;
  };
  aiTips: Array<{
    id: string;
    type: "escalation" | "upsell" | "history" | "info";
    message: string;
    timestamp: string;
    priority: "urgent" | "suggestion" | "info";
  }>;
  activities: Array<{
    id: string;
    action: string;
    description: string;
    timestamp: string;
    type: "ticket" | "update" | "tag" | "note";
  }>;
}

export const LiveTab: React.FC<LiveTabProps> = ({
  customer,
  aiTips,
  activities,
}) => {
  const [customerEmail, setCustomerEmail] = useState<string | null>(null);
  const [customerData, setCustomerData] = useState(customer);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [dynamoData, setDynamoData] = useState<DynamoData | null>(null);
  const [apiCallId, setApiCallId] = useState<string | null>(null);

  // Fetch customer info when email is available
  const {
    data: customerInfo,
    isLoading: isLoadingCustomer,
    error: customerError,
  } = useQuery({
    queryKey: ["customer", customerEmail],
    queryFn: () => fetchCustomerInfo(customerEmail!),
    enabled: !!customerEmail,
  });

  // Generate full customer name from API data
  const customerName = customerInfo
    ? `${customerInfo.first_name} ${customerInfo.last_name}`.trim()
    : null;

  const handleEmailSubmit = (email: string) => {
    setCustomerEmail(email);
    // Update mock data with the entered email
    setCustomerData({
      ...customer,
      email: email,
    });
  };

  const handleEndCall = () => {
    setShowAnalytics(true);
  };

  const handleNextCall = () => {
    setCustomerEmail(null);
    setShowAnalytics(false);
  };

  // Subscribe to DynamoDB service for call_id
  useEffect(() => {
    const dynamoService = DynamoPollingService.getInstance();

    const unsubscribe = dynamoService.subscribe((data: DynamoData) => {
      setDynamoData(data);
    });

    // Get current data if available
    const currentData = dynamoService.getCurrentData();
    if (currentData) {
      setDynamoData(currentData);
    }

    return unsubscribe;
  }, []);

  // Listen for API response data from Python process
  useEffect(() => {
    const handleApiResponse = (data: ApiResponseData) => {
      console.log('🔍 LiveTab: API Response Data received:', data);
      if (data.call_id) {
        console.log('✅ LiveTab: Setting apiCallId to:', data.call_id);
        setApiCallId(data.call_id);
      } else {
        console.log('❌ LiveTab: No call_id in API response data');
      }
    };

    // Add listener for API response data
    console.log('🔍 LiveTab: Setting up electronAPI listener');
    console.log('  - window.electronAPI exists:', !!window.electronAPI);
    console.log('  - onApiResponseData exists:', !!window.electronAPI?.onApiResponseData);
    
    if (window.electronAPI?.onApiResponseData) {
      console.log('✅ LiveTab: Adding onApiResponseData listener');
      const removeListener = window.electronAPI.onApiResponseData(handleApiResponse);
      return removeListener;
    } else {
      console.log('❌ LiveTab: electronAPI or onApiResponseData not available');
    }
  }, []);

  if (showAnalytics) {
    const finalCallId = dynamoData?.call_id || apiCallId;
    console.log('🔍 LiveTab: Rendering CallAnalytics with:');
    console.log('  - dynamoData?.call_id:', dynamoData?.call_id);
    console.log('  - apiCallId:', apiCallId);
    console.log('  - finalCallId:', finalCallId);
    
    return (
      <CallAnalytics
        onNextCall={handleNextCall}
        clientEmail={customerEmail || "test@example.com"}
        callId={finalCallId}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">🔴 Live Call</h1>
        {customerEmail && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 px-4 py-2 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse flex-shrink-0"></div>
              <span className="text-sm font-medium text-red-700 dark:text-red-300">
                Call in progress
              </span>
            </div>
            <button
              onClick={handleEndCall}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              End Call
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 h-[calc(100vh-12rem)]">
        {/* Left Column - Customer Overview or Email Input */}
        <div className="xl:col-span-1 flex flex-col gap-6">
          {customerEmail ? (
            <CustomerOverviewCard email={customerEmail} />
          ) : (
            <EmailInputCard onEmailSubmit={handleEmailSubmit} />
          )}
          <StatusIndicators
            isCallActive={!!customerEmail}
            customerName={customerName}
          />
          <RecorderStatus />
        </div>

        {/* Middle Column - AI Tips */}
        <div className="xl:col-span-1 flex flex-col h-full">
          <AITipsPanel isCallActive={!!customerEmail} />
        </div>

        {/* Right Column - Activity Feed */}
        <div className="xl:col-span-1 flex flex-col h-full">
          <ActivityFeed isCallActive={!!customerEmail} />
        </div>
      </div>
    </div>
  );
};
