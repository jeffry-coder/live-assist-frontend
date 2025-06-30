import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { fetchCustomerInfo } from "../services/customerApi";
import { CustomerInfo } from "../types/customer";

interface CustomerOverviewProps {
  email: string;
}

export const CustomerOverviewCard: React.FC<CustomerOverviewProps> = ({
  email,
}) => {
  const {
    data: customer,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["customer", email],
    queryFn: () => fetchCustomerInfo(email),
    enabled: !!email,
  });

  const getTierColor = (tier: string) => {
    switch (tier.toLowerCase()) {
      case "premium":
      case "pro":
        return "bg-yellow-600 text-yellow-50 hover:bg-yellow-700";
      case "enterprise":
        return "bg-purple-600 text-purple-50 hover:bg-purple-700";
      case "basic":
        return "bg-gray-600 text-gray-50 hover:bg-gray-700";
      default:
        return "bg-blue-600 text-blue-50 hover:bg-blue-700";
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="grid grid-cols-3 gap-4">
              <div className="h-8 bg-gray-200 rounded"></div>
              <div className="h-8 bg-gray-200 rounded"></div>
              <div className="h-8 bg-gray-200 rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-red-600 text-center">
            Error loading customer data: {error.message}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!customer) {
    return null;
  }

  const fullName = `${customer.first_name} ${customer.last_name}`;
  
  const callAmount = customer.call_amount ? parseInt(customer.call_amount) : 0;
  const lastCallDate = customer.last_call_date || "Never";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold">{fullName}</span>
              <Badge className={getTierColor(customer.tier)}>
                {customer.tier}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground font-normal break-words">
              {customer.email}
            </p>
            <p className="text-sm text-muted-foreground font-normal break-words">
              {customer.job_title}
            </p>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-6">
          <div className="text-center space-y-1">
            <div className="text-2xl font-bold">{callAmount}</div>
            <div className="text-xs text-muted-foreground">Total Calls</div>
          </div>
          <div className="text-center space-y-1">
            <div className="text-2xl font-bold">{lastCallDate}</div>
            <div className="text-xs text-muted-foreground">Last Contact</div>
          </div>
          <div className="text-center space-y-1">
            <div className="text-lg font-bold truncate px-1">
              {customer.company_name}
            </div>
            <div className="text-xs text-muted-foreground">Company</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
