import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Phone, User, ChevronRight, Kanban } from "lucide-react";

const STAGES = ["New Lead","Contacted","Interested","Proposal Sent","Negotiation","Won","Lost"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_COLORS: Record<Stage, string> = {
  "New Lead":      "bg-slate-100 text-slate-700 border-slate-200",
  "Contacted":     "bg-blue-100 text-blue-700 border-blue-200",
  "Interested":    "bg-cyan-100 text-cyan-700 border-cyan-200",
  "Proposal Sent": "bg-amber-100 text-amber-700 border-amber-200",
  "Negotiation":   "bg-orange-100 text-orange-700 border-orange-200",
  "Won":           "bg-green-100 text-green-700 border-green-200",
  "Lost":          "bg-red-100 text-red-700 border-red-200",
};

const STAGE_HEADER: Record<Stage, string> = {
  "New Lead":      "bg-slate-50 border-slate-200",
  "Contacted":     "bg-blue-50 border-blue-200",
  "Interested":    "bg-cyan-50 border-cyan-200",
  "Proposal Sent": "bg-amber-50 border-amber-200",
  "Negotiation":   "bg-orange-50 border-orange-200",
  "Won":           "bg-green-50 border-green-200",
  "Lost":          "bg-red-50 border-red-200",
};

interface Customer {
  id: string;
  name: string;
  mobile: string;
  company?: string;
  category?: string;
  pipeline_stage?: string;
  agent_name?: string;
}

interface PipelineData {
  stages: Stage[];
  columns: Record<Stage, Customer[]>;
  total: number;
}

function CustomerCard({ customer, onMove }: { customer: Customer; onMove: (id: string, stage: Stage) => void }) {
  const initials = customer.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className="bg-white rounded-lg border p-3 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start gap-2 mb-2">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <Link href={`/customers/${customer.id}`}>
            <p className="text-sm font-semibold text-foreground truncate hover:text-primary cursor-pointer">{customer.name}</p>
          </Link>
          {customer.company && (
            <p className="text-xs text-muted-foreground truncate">{customer.company}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
        <Phone className="w-3 h-3" />
        <span>{customer.mobile}</span>
      </div>
      {customer.agent_name && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
          <User className="w-3 h-3" />
          <span>{customer.agent_name}</span>
        </div>
      )}
      <Select
        value={customer.pipeline_stage ?? "New Lead"}
        onValueChange={(v) => onMove(customer.id, v as Stage)}
      >
        <SelectTrigger className="h-7 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STAGES.map(s => (
            <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export default function PipelinePage() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<PipelineData>({
    queryKey: ["/api/pipeline"],
    queryFn: () => api("/pipeline"),
  });

  const moveStage = useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: Stage }) =>
      api(`/pipeline/${id}`, { method: "PATCH", body: JSON.stringify({ stage }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/pipeline"] }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const columns = data?.columns ?? ({} as Record<Stage, Customer[]>);
  const total = data?.total ?? 0;

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Kanban className="w-7 h-7 text-primary" />
            Lead Pipeline
          </h1>
          <p className="text-muted-foreground mt-1">{total} leads across {STAGES.length} stages</p>
        </div>
        <Link href="/customers">
          <Button variant="outline" className="gap-2">
            <ChevronRight className="w-4 h-4" /> Manage Customers
          </Button>
        </Link>
      </div>

      {/* Summary row */}
      <div className="flex gap-3 flex-wrap">
        {STAGES.map(s => {
          const count = (columns[s] ?? []).length;
          if (!count) return null;
          return (
            <Badge key={s} variant="outline" className={STAGE_COLORS[s]}>
              {s}: {count}
            </Badge>
          );
        })}
      </div>

      {/* Kanban board */}
      <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
        {STAGES.map(stage => {
          const cards = columns[stage] ?? [];
          return (
            <div key={stage} className="flex-shrink-0 w-64">
              <div className={`rounded-t-lg border px-3 py-2 ${STAGE_HEADER[stage]}`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">{stage}</span>
                  <Badge variant="secondary" className="text-xs">{cards.length}</Badge>
                </div>
              </div>
              <div className="rounded-b-lg border border-t-0 bg-muted/30 p-2 space-y-2 min-h-[200px]">
                {cards.map(c => (
                  <CustomerCard
                    key={c.id}
                    customer={c}
                    onMove={(id, s) => moveStage.mutate({ id, stage: s })}
                  />
                ))}
                {cards.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-8">No leads</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
