import * as React from "react";
import { useEffect } from "react";
import {
  useGetDashboardStats,
  useGetLiveCalls,
  useGetRepeatCallers,
  useGetAgentPerformance
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PhoneIncoming, PhoneMissed, PhoneOutgoing, Users, CalendarClock, AlertCircle, Clock } from "lucide-react";
import { getToken, CRM_TOKEN_KEY } from "@/lib/auth";

export default function DashboardPage() {
  const queryClient = useQueryClient();

  const { data: stats } = useGetDashboardStats({
    query: { refetchInterval: 15000 }
  });

  const { data: liveCalls } = useGetLiveCalls({
    query: { refetchInterval: 15000 }
  });

  // SSE subscription — get instant push on new calls instead of waiting 15 s
  useEffect(() => {
    const token = getToken();
    if (!token) return;

    // Pass token as query param because EventSource cannot set headers
    const url = `/api/dashboard/events?token=${encodeURIComponent(token)}`;
    const es  = new EventSource(url);

    es.addEventListener("call", () => {
      // Immediately invalidate dashboard query groups → triggers refetch
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/live-calls"] });
    });

    return () => es.close();
  }, [queryClient]);

  const { data: repeatCallers } = useGetRepeatCallers({
    query: { refetchInterval: 60000 }
  });

  const { data: agentPerformance } = useGetAgentPerformance(
    { period: "today" },
    { query: { refetchInterval: 60000 } }
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard Overview</h1>
        <p className="text-muted-foreground mt-1">Real-time metrics for today.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Calls Today"
          value={stats?.todayCalls ?? 0}
          icon={PhoneIncoming}
          trend="+12% from yesterday"
          trendUp={true}
        />
        <StatCard
          title="Missed Calls"
          value={stats?.missedCalls ?? 0}
          icon={PhoneMissed}
          trend="-2% from yesterday"
          trendUp={false}
          valueColor="text-destructive"
        />
        <StatCard
          title="Active Follow-ups"
          value={stats?.followUps ?? 0}
          icon={CalendarClock}
          trend="Requires action"
          trendUp={null}
        />
        <StatCard
          title="Total Customers"
          value={stats?.totalCustomers ?? 0}
          icon={Users}
          trend="+4 this week"
          trendUp={true}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Live Calls */}
        <Card className="lg:col-span-2 flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Live & Recent Calls
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto max-h-[400px]">
            {liveCalls?.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-8">
                <PhoneIncoming className="w-8 h-8 mb-2 opacity-20" />
                <p>No active calls at the moment</p>
              </div>
            ) : (
              <div className="space-y-4">
                {liveCalls?.map(call => (
                  <div key={call.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-full ${
                        call.type === 'incoming' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30' : 
                        call.type === 'outgoing' ? 'bg-green-100 text-green-600 dark:bg-green-900/30' : 
                        'bg-red-100 text-red-600 dark:bg-red-900/30'
                      }`}>
                        {call.type === 'incoming' ? <PhoneIncoming className="w-4 h-4" /> : 
                         call.type === 'outgoing' ? <PhoneOutgoing className="w-4 h-4" /> : 
                         <PhoneMissed className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{call.customerName || call.phoneNumber}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Users className="w-3 h-3" /> {call.agentName}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{formatDuration(call.duration)}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(call.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Repeat Callers */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-500" />
              Repeat Callers
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto max-h-[400px]">
            {repeatCallers?.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-8">
                <p>No repeat callers today</p>
              </div>
            ) : (
              <div className="space-y-4">
                {repeatCallers?.map(caller => (
                  <div key={caller.customerId} className="flex items-center justify-between p-3 rounded-lg border border-orange-100 dark:border-orange-900/30 bg-orange-50/50 dark:bg-orange-900/10">
                    <div>
                      <p className="text-sm font-medium">{caller.customerName || caller.mobile}</p>
                      {caller.category && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300 mt-1">
                          {caller.category}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-lg font-bold text-orange-600 dark:text-orange-400">{caller.callCount}</span>
                      <span className="text-[10px] text-muted-foreground uppercase">calls</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Agent Performance Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Agent Performance (Today)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                <tr>
                  <th className="px-4 py-3 font-medium rounded-tl-lg">Agent</th>
                  <th className="px-4 py-3 font-medium">Total</th>
                  <th className="px-4 py-3 font-medium text-green-600">Out</th>
                  <th className="px-4 py-3 font-medium text-blue-600">In</th>
                  <th className="px-4 py-3 font-medium text-red-600">Missed</th>
                  <th className="px-4 py-3 font-medium rounded-tr-lg">Avg Duration</th>
                </tr>
              </thead>
              <tbody>
                {agentPerformance?.map((agent, i) => (
                  <tr key={agent.agentId} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{agent.agentName}</td>
                    <td className="px-4 py-3">{agent.totalCalls}</td>
                    <td className="px-4 py-3">{agent.outgoingCalls}</td>
                    <td className="px-4 py-3">{agent.incomingCalls}</td>
                    <td className="px-4 py-3">{agent.missedCalls}</td>
                    <td className="px-4 py-3 flex items-center gap-1 text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {formatDuration(agent.avgDuration)}
                    </td>
                  </tr>
                ))}
                {(!agentPerformance || agentPerformance.length === 0) && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      No agent activity recorded today.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  trendUp, 
  valueColor = "text-foreground" 
}: { 
  title: string, 
  value: string | number, 
  icon: any, 
  trend: string, 
  trendUp: boolean | null,
  valueColor?: string
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
          <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
            <Icon className="w-4 h-4 text-primary" />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <span className={`text-3xl font-bold tracking-tight ${valueColor}`}>{value}</span>
          <span className={`text-xs ${trendUp === true ? 'text-green-600' : trendUp === false ? 'text-red-600' : 'text-muted-foreground'}`}>
            {trend}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function formatDuration(seconds: number): string {
  if (!seconds) return "0s";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}
