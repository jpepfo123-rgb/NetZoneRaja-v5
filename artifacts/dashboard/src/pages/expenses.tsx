import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { Receipt, Plus, CheckCircle, XCircle, Clock, Wallet } from "lucide-react";

const CATEGORIES = ["Travel","Food","Communication","Marketing","Utilities","Other"];
const STATUS_COLORS: Record<string, string> = {
  pending:  "bg-yellow-100 text-yellow-700 border-yellow-200",
  approved: "bg-green-100 text-green-700 border-green-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
};

interface Expense {
  id: string;
  agent_id: string;
  agent_name: string;
  amount: number;
  category: string;
  description: string;
  status: string;
  expense_date: string;
  notes?: string;
  created_at: string;
}

export default function ExpensesPage() {
  const { user } = useRequireAuth();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    amount: "", category: "Travel", description: "",
    expense_date: format(new Date(), "yyyy-MM-dd"), notes: "",
  });

  const { data: expenses = [], isLoading } = useQuery<Expense[]>({
    queryKey: ["/api/expenses", statusFilter],
    queryFn: () => api(`/expenses${statusFilter !== "all" ? `?status=${statusFilter}` : ""}`),
  });

  const addExpense = useMutation({
    mutationFn: (body: any) => api("/expenses", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/expenses"] }); setOpen(false); setForm({ amount: "", category: "Travel", description: "", expense_date: format(new Date(), "yyyy-MM-dd"), notes: "" }); },
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api(`/expenses/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/expenses"] }),
  });

  const totalApproved = expenses.filter(e => e.status === "approved").reduce((s, e) => s + Number(e.amount), 0);
  const totalPending  = expenses.filter(e => e.status === "pending").reduce((s, e) => s + Number(e.amount), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Receipt className="w-7 h-7 text-primary" />
            Expenses
          </h1>
          <p className="text-muted-foreground mt-1">Track and manage agent expense claims</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" />Add Expense</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Expense</DialogTitle></DialogHeader>
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Amount (₹)</label>
                  <Input type="number" className="mt-1" placeholder="0.00" value={form.amount}
                    onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium">Date</label>
                  <Input type="date" className="mt-1" value={form.expense_date}
                    onChange={e => setForm(f => ({ ...f, expense_date: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Category</label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Input className="mt-1" placeholder="What was this expense for?" value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium">Notes (optional)</label>
                <Input className="mt-1" placeholder="Additional details" value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
              <Button className="w-full" disabled={!form.amount || !form.description || addExpense.isPending}
                onClick={() => addExpense.mutate({ ...form, amount: parseFloat(form.amount) })}>
                {addExpense.isPending ? "Saving..." : "Submit Expense"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: "Total Approved", value: `₹${totalApproved.toLocaleString()}`, icon: CheckCircle, color: "text-green-600 bg-green-50" },
          { label: "Pending Review", value: `₹${totalPending.toLocaleString()}`, icon: Clock, color: "text-yellow-600 bg-yellow-50" },
          { label: "Total Entries", value: expenses.length, icon: Wallet, color: "text-blue-600 bg-blue-50" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="pt-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${s.color}`}>
                <s.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {["all","pending","approved","rejected"].map(s => (
          <Button key={s} variant={statusFilter === s ? "default" : "outline"} size="sm"
            onClick={() => setStatusFilter(s)} className="capitalize">
            {s === "all" ? "All" : s}
          </Button>
        ))}
      </div>

      {/* Expense list */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : expenses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-16 text-muted-foreground gap-2">
            <Receipt className="w-12 h-12 opacity-20" />
            <p>No expenses found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {expenses.map(e => (
            <Card key={e.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-lg">₹{Number(e.amount).toLocaleString()}</span>
                      <Badge variant="outline" className="text-xs">{e.category}</Badge>
                      <Badge variant="outline" className={`text-xs ${STATUS_COLORS[e.status]}`}>
                        {e.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-foreground mt-1">{e.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {e.agent_name} · {format(new Date(e.expense_date), "dd MMM yyyy")}
                    </p>
                    {e.notes && <p className="text-xs text-muted-foreground italic mt-1">{e.notes}</p>}
                  </div>
                  {user?.role === "admin" && e.status === "pending" && (
                    <div className="flex gap-2 flex-shrink-0">
                      <Button size="sm" variant="outline"
                        className="text-green-600 border-green-200 hover:bg-green-50 gap-1"
                        onClick={() => updateStatus.mutate({ id: e.id, status: "approved" })}>
                        <CheckCircle className="w-3 h-3" /> Approve
                      </Button>
                      <Button size="sm" variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-50 gap-1"
                        onClick={() => updateStatus.mutate({ id: e.id, status: "rejected" })}>
                        <XCircle className="w-3 h-3" /> Reject
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
