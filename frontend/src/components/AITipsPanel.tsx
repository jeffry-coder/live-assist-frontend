import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Separator } from '../../components/ui/separator';

interface AITip {
  id: string;
  type: 'history' | 'upsell' | 'escalation' | 'info';
  message: string;
  timestamp: string;
  priority: 'urgent' | 'suggestion' | 'info';
}

interface AITipsPanelProps {
  tips?: AITip[];
  isCallActive?: boolean;
}

export const AITipsPanel: React.FC<AITipsPanelProps> = ({ tips: propTips, isCallActive = false }) => {
  const [apiTips, setApiTips] = useState<AITip[]>([]);
  const [isUsingApiData, setIsUsingApiData] = useState(false);

  useEffect(() => {
    if (!isCallActive) {
      // Reset state when call is not active
      setApiTips([]);
      setIsUsingApiData(false);
      return;
    }

    // Listen for API response data
    const handleApiResponse = (data: any) => {
      console.log('AITipsPanel: Processing API response data', data);
      
      try {
        // Parse the response_body JSON string
        const responseBody = JSON.parse(data.response_body);
        
        if (responseBody.aiTips && Array.isArray(responseBody.aiTips)) {
          // Convert API response format to AITip format
          const convertedTips: AITip[] = responseBody.aiTips.map((tip: any, index: number) => ({
            id: `${data.request_payload?.call_id || 'unknown'}-${index}`,
            type: mapTagToType(tip.tag),
            message: tip.content,
            timestamp: new Date(data.timestamp).toLocaleTimeString(),
            priority: mapTagToPriority(tip.tag)
          }));
          
          setApiTips(convertedTips);
          setIsUsingApiData(true);
        }
      } catch (error) {
        console.error('Error parsing API response data:', error);
      }
    };

    // Set up event listener for API response data
    if (window.electronAPI?.onApiResponseData) {
      window.electronAPI.onApiResponseData(handleApiResponse);
    }

    return () => {
      // Cleanup - remove listeners if needed
      if (window.electronAPI?.removeAllListeners) {
        window.electronAPI.removeAllListeners('api-response-data');
      }
    };
  }, [isCallActive]);

  const mapTagToType = (tag: string): 'history' | 'upsell' | 'escalation' | 'info' => {
    switch (tag.toLowerCase()) {
      case 'urgent':
      case 'escalation':
        return 'escalation';
      case 'suggestion':
      case 'upsell':
        return 'upsell';
      case 'history':
        return 'history';
      default:
        return 'info';
    }
  };

  const mapTagToPriority = (tag: string): 'urgent' | 'suggestion' | 'info' => {
    switch (tag.toLowerCase()) {
      case 'urgent':
        return 'urgent';
      case 'suggestion':
        return 'suggestion';
      default:
        return 'info';
    }
  };

  // Use API response data if available, otherwise fall back to props
  const tips = isUsingApiData ? apiTips : (propTips || []);
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'history': return { icon: '📋', label: 'History' };
      case 'upsell': return { icon: '📈', label: 'Upsell' };
      case 'escalation': return { icon: '🚨', label: 'Escalation' };
      case 'info': return { icon: 'ℹ️', label: 'Info' };
      default: return { icon: '💡', label: 'Tip' };
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-600 text-red-50 border-red-700';
      case 'suggestion': return 'bg-amber-600 text-amber-50 border-amber-700';
      case 'info': return 'bg-blue-600 text-blue-50 border-blue-700';
      default: return 'bg-gray-600 text-gray-50 border-gray-700';
    }
  };

  const getPriorityBorderColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'border-l-red-500 bg-red-50/50 dark:bg-red-950/20';
      case 'suggestion': return 'border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20';
      case 'info': return 'border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20';
      default: return 'border-l-gray-500 bg-gray-50/50 dark:bg-gray-950/20';
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>🤖 AI Tips</span>
          <Badge variant="secondary">{tips.length} active</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        {tips.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-center py-12">
            <div>
              <div className="text-4xl mb-3">🤖</div>
              <p className="text-muted-foreground text-sm">No AI suggestions yet</p>
              <p className="text-muted-foreground text-xs mt-1">AI tips will appear here during the call</p>
            </div>
          </div>
        ) : (
          <ScrollArea className="flex-1 min-h-0">
            <div className="space-y-4">
              {tips.map((tip, index) => (
                <div key={tip.id}>
                  <div className={`p-4 border-l-4 ${getPriorityBorderColor(tip.priority)} rounded-r-md`}>
                    <div className="flex items-start gap-3">
                      <span className="text-lg flex-shrink-0" title={getTypeIcon(tip.type).label}>{getTypeIcon(tip.type).icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Badge className={getPriorityColor(tip.priority)} variant="secondary">
                            {tip.priority.charAt(0).toUpperCase() + tip.priority.slice(1)}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{tip.timestamp}</span>
                        </div>
                        <p className="text-sm leading-relaxed">{tip.message}</p>
                      </div>
                    </div>
                  </div>
                  {index < tips.length - 1 && <Separator className="my-3" />}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};