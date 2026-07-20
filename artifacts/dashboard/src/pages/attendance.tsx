import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, subDays, eachDayOfInterval } from "date-fns";
import { useListAgents } from "@workspace/api-client-react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { CalendarDays, Clock, LogIn, LogOut, CheckCircle } from "lucide-react";

interface AttendanceRow {
  id: string;
  agent_id: string;
  agent_name: string;
  agent_name_resolved?: string;
  check_in?: string;
  check_out?: string;
  date: string;
  status: string;
  notes?: string;
}

const STATUS_STYLE: Record<string, string> = {
  present:  "bg-green-100 text-green-700",
  absent:   "bg-red-100 text-red-700",
  half_day: "bg-amber-100 text-amber-700",
  leave:    "bg-blue-100 text-blue-700",
};

function fmtTime(ts?: string) {
  if (!ts) return "—";
  return format(new Date(ts), "hh:mm a");
}

function duration(check_in?: string, check_out?: string) {
  if (!check_in || !check_out) return null;
  const mins = Math.round((new Date(check_out).getTime() - new Date(check_in).getTime()) / 60000);
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export default function AttendancePage() {
  const { user } = useRequireAuth();
  const qc = useQueryClient();
  const [agentId, setAgentId] = useState("all");
  const today = format(new Date(), "yyyy-MM-dd");
  const from = format(subDays(new Date(), 29), "yyyy-MM-dd");

  const { data: agents } = useListAgents();

  const { data: rows = [], isLoading } = useQuery<AttendanceRow[]>({
    queryKey: ["/api/attendance", agentId, from, today],
    queryFn: () => api(`/attendance?from=${from}&to=${today}${agentId !== "all" ? `&agentId=${agentId}` : ""}`),
  });

  const { data: todayRows = [] } = useQuery<AttendanceRow[]>({
    queryKey: ["/api/attendance/today"],
    queryFn: () => api("/attendance/today"),
    refetchInterval: 60_000,
  });

  const checkIn = useMutation({
    mutationFn: () => api("/attendance/checkin", { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/attendance"] }),
  });
  const checkOut = useMutation({
    mutationFn: () => api("/attendance/checkout", { method: "PATCH" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/attendance"] }),
  });

  const myTodayRow = todayRows.find(r => r.agent_id === user?.id?.toString());

  const presentToday = todayRows.filter(r => r.check_in).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <CalendarDays className="w-7 h-7 text-primary" />
            Attendance
          </h1>
          <p className="text-muted-foreground mt-1">Daily check-in / check-out tracking</p>
        </div>
        {/* Check-in / out buttons for agents */}
        <div className="flex gap-2">
          {!myTodayRow?.check_in ? (
            <Button className="gap-2" onClick={() => checkIn.mutate()} disabled={checkIn.isPending}>
              <LogIn className="w-4 h-4" />
              {checkIn.isPending ? "Checking in..." : "Check In"}
            </Button>
          ) : !myTodayRow?.check_out ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                <Clock className="w-4 h-4 inline mr-1" />Checked in at {fmtTime(myTodayRow.check_in)}
              </span>
              <Button variant="outline" className="gap-2" onClick={() => checkOut.mutate()} disabled={checkOut.isPending}>
                <LogOut className="w-4 h-4" />
                {checkOut.isPending ? "Checking out..." : "Check Out"}
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm font-medium">
                {fmtTime(myTodayRow.check_in)} – {fmtTime(myTodayRow.check_out)}
                {" "}({duration(myTodayRow.check_in, myTodayRow.check_out)})
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Today's summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Present Today",  value: presentToday,                               color: "text-green-600 bg-green-50" },
          { label: "Total Agents",   value: (agents ?? []).length,                       color: "text-blue-600 bg-blue-50" },
          { label: "Absent Today",   value: Math.max(0, (agents ?? []).length - presentToday), color: "text-red-500 bg-red-50" },
          { label: "Attendance Rate", value: agents?.length ? `${Math.round((presentToday / agents.length) * 100)}%` : "—", color: "text-primary bg-primary/10" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="pt-4">
              <p className={`text-2xl font-bold ${s.color.split(" ")[0]}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Today's live list */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Today — {format(new Date(), "EEEE, d MMM yyyy")}</CardTitle>
        </CardHeader>
        <CardContent>
          {todayRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No check-ins yet today.</p>
          ) : (
            <div className="divide-y">
              {todayRows.map(r => (
                <div key={r.id} className="flex items-center gap-4 py-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                    {(r.agent_name_resolved ?? r.agent_name ?? "?").split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <span className="flex-1 text-sm font-medium">{r.agent_name_resolved ?? r.agent_name}</span>
                  <span className="text-xs text-muted-foreground">{fmtTime(r.check_in)}</span>
                  <span className="text-xs text-muted-foreground">→</span>
                  <span className="text-xs text-muted-foreground">{fmtTime(r.check_out)}</span>
                  {duration(r.check_in, r.check_out) && (
                    <Badge variant="secondary" className="text-xs">{duration(r.check_in, r.check_out)}</Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* History table */}
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold">Last 30 Days</h2>
        {user?.role === "admin" && (
          <Select value={agentId} onValueChange={setAgentId}>
            <SelectTrigger className="w-44 h-8 text-sm"><SelectValue placeholder="All agents" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Agents</SelectItem>
              {(agents ?? []).map(a => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Date</th>
                {user?.role === "admin" && <th className="px-4 py-2 text-left font-medium">Agent</th>}
                <th className="px-4 py-2 text-left font-medium">Check In</th>
                <th className="px-4 py-2 text-left font-medium">Check Out</th>
                <th className="px-4 py-2 text-left font-medium">Duration</th>
                <th className="px-4 py-2 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map(r => (
                <tr key={r.id} className="hover:bg-muted/20">
                  <td className="px-4 py-2">{format(new Date(r.date), "dd MMM yyyy")}</td>
                  {user?.role === "admin" && <td className="px-4 py-2">{r.agent_name_resolved ?? r.agent_name}</td>}
                  <td className="px-4 py-2">{fmtTime(r.check_in)}</td>
                  <td className="px-4 py-2">{fmtTime(r.check_out)}</td>
                  <td className="px-4 py-2">{duration(r.check_in, r.check_out) ?? "—"}</td>
                  <td className="px-4 py-2">
                    <Badge variant="outline" className={`text-xs ${STATUS_STYLE[r.status] ?? ""}`}>
                      {r.status}
                    </Badge>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No records found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
