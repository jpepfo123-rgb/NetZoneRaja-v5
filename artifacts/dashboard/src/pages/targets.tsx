import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, subMonths, addMonths } from "date-fns";
import { useListAgents } from "@workspace/api-client-react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { ChevronLeft, ChevronRight, Target, Plus, TrendingUp } from "lucide-react";

interface TargetRow {
  id: string;
  agent_id: string;
  agent_name: string;
  period: string;
  call_target: number;
  conv_target: number;
  revenue_target: number;
  achieved_calls: string;
  achieved_convs: string;
}

function pct(achieved: number, target: number) {
  if (!target) return 0;
  return Math.min(100, Math.round((achieved / target) * 100));
}

function ProgressBar({ value, label, color = "bg-primary" }: { value: number; label: string; color?: string }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className={`font-semibold ${value >= 100 ? "text-green-600" : value >= 70 ? "text-amber-600" : "text-red-500"}`}>
          {value}%
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${value >= 100 ? "bg-green-500" : value >= 70 ? "bg-amber-500" : "bg-red-400"}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

export default function TargetsPage() {
  const { user } = useRequireAuth();
  const qc = useQueryClient();
  const [period, setPeriod] = useState(format(new Date(), "yyyy-MM"));
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ agent_id: "", call_target: "50", conv_target: "10", revenue_target: "0" });

  const { data: agents } = useListAgents();
  const { data: targets = [], isLoading } = useQuery<TargetRow[]>({
    queryKey: ["/api/targets", period],
    queryFn: () => api(`/targets?period=${period}`),
  });

  const createTarget = useMutation({
    mutationFn: (body: any) => api("/targets", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/targets"] }); setOpen(false); },
  });

  const prevMonth = () => setPeriod(format(subMonths(new Date(period + "-01"), 1), "yyyy-MM"));
  const nextMonth = () => setPeriod(format(addMonths(new Date(period + "-01"), 1), "yyyy-MM"));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Target className="w-7 h-7 text-primary" />
            Sales Targets
          </h1>
          <p className="text-muted-foreground mt-1">Monthly performance goals per agent</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prevMonth}><ChevronLeft className="w-4 h-4" /></Button>
          <span className="font-semibold text-sm w-24 text-center">
            {format(new Date(period + "-01"), "MMM yyyy")}
          </span>
          <Button variant="outline" size="icon" onClick={nextMonth}><ChevronRight className="w-4 h-4" /></Button>
          {user?.role === "admin" && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 ml-2"><Plus className="w-4 h-4" />Set Target</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Set Monthly Target</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-2">
                  <div>
                    <label className="text-sm font-medium">Agent</label>
                    <Select value={form.agent_id} onValueChange={v => setForm(f => ({ ...f, agent_id: v }))}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select agent" /></SelectTrigger>
                      <SelectContent>
                        {(agents ?? []).map(a => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  {[
                    { key: "call_target", label: "Call Target" },
                    { key: "conv_target", label: "Conversion Target" },
                    { key: "revenue_target", label: "Revenue Target (₹)" },
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <label className="text-sm font-medium">{label}</label>
                      <Input
                        type="number" className="mt-1"
                        value={form[key as keyof typeof form]}
                        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                      />
                    </div>
                  ))}
                  <Button
                    className="w-full"
                    onClick={() => createTarget.mutate({ ...form, period, call_target: +form.call_target, conv_target: +form.conv_target, revenue_target: +form.revenue_target })}
                    disabled={!form.agent_id || createTarget.isPending}
                  >
                    {createTarget.isPending ? "Saving..." : "Save Target"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : targets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
            <Target className="w-12 h-12 opacity-20" />
            <p className="font-medium">No targets set for {format(new Date(period + "-01"), "MMMM yyyy")}</p>
            {user?.role === "admin" && <p className="text-sm">Use the "Set Target" button to add targets.</p>}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {targets.map(t => {
            const calls = parseInt(t.achieved_calls ?? "0");
            const convs = parseInt(t.achieved_convs ?? "0");
            const callPct = pct(calls, t.call_target);
            const convPct = pct(convs, t.conv_target);
            const overall = Math.round((callPct + convPct) / 2);

            return (
              <Card key={t.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{t.agent_name}</CardTitle>
                    <Badge variant={overall >= 100 ? "default" : overall >= 70 ? "secondary" : "destructive"}>
                      {overall}% overall
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="bg-muted/50 rounded-lg p-2">
                      <p className="text-lg font-bold text-primary">{calls}<span className="text-xs text-muted-foreground">/{t.call_target}</span></p>
                      <p className="text-xs text-muted-foreground">Calls</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-2">
                      <p className="text-lg font-bold text-green-600">{convs}<span className="text-xs text-muted-foreground">/{t.conv_target}</span></p>
                      <p className="text-xs text-muted-foreground">Conversions</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <ProgressBar value={callPct} label="Calls Progress" />
                    <ProgressBar value={convPct} label="Conversion Progress" />
                  </div>
                  {t.revenue_target > 0 && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      Revenue target: ₹{Number(t.revenue_target).toLocaleString()}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
