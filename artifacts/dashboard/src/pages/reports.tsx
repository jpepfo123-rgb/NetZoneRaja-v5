import { useState } from "react";
import { useGetReportSummary, useListAgents } from "@workspace/api-client-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line } from "recharts";
import { format, subDays } from "date-fns";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, FileText } from "lucide-react";

export default function ReportsPage() {
  const [agentId, setAgentId] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("7"); // days
  
  const to = new Date();
  const from = subDays(to, parseInt(dateRange));

  const { data: agents } = useListAgents();
  const { data: summary, isLoading } = useGetReportSummary({
    from: format(from, "yyyy-MM-dd"),
    to: format(to, "yyyy-MM-dd"),
    agentId: agentId !== "all" ? agentId : undefined
  });

  const exportExcel = () => {
    if (!summary?.byDay) return;
    const worksheet = XLSX.utils.json_to_sheet(summary.byDay);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
    XLSX.writeFile(workbook, `report_export_${format(new Date(), "yyyyMMdd")}.xlsx`);
  };

  const exportPDF = () => {
    if (!summary?.byDay) return;
    const doc = new jsPDF();
    doc.text("Activity Report", 14, 15);
    
    const tableData = summary.byDay.map(d => [
      d.date, d.total.toString(), d.incoming.toString(), d.outgoing.toString(), d.missed.toString()
    ]);

    (doc as any).autoTable({
      head: [["Date", "Total", "Incoming", "Outgoing", "Missed"]],
      body: tableData,
      startY: 20,
    });
    
    doc.save(`report_export_${format(new Date(), "yyyyMMdd")}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
          <p className="text-muted-foreground mt-1">Analyze call volume and performance trends.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportExcel} className="gap-2">
            <FileText className="w-4 h-4" /> Export Excel
          </Button>
          <Button variant="outline" onClick={exportPDF} className="gap-2">
            <Download className="w-4 h-4" /> Export PDF
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="py-4 border-b bg-muted/20">
          <div className="flex gap-4">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 Days</SelectItem>
                <SelectItem value="14">Last 14 Days</SelectItem>
                <SelectItem value="30">Last 30 Days</SelectItem>
              </SelectContent>
            </Select>

            <Select value={agentId} onValueChange={setAgentId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select Agent" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Agents</SelectItem>
                {agents?.map(a => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <div className="bg-muted/30 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold">{summary?.totalCalls || 0}</div>
              <div className="text-xs text-muted-foreground uppercase mt-1">Total Calls</div>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-600">{summary?.incomingCalls || 0}</div>
              <div className="text-xs text-blue-600/70 uppercase mt-1">Incoming</div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/10 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-600">{summary?.outgoingCalls || 0}</div>
              <div className="text-xs text-green-600/70 uppercase mt-1">Outgoing</div>
            </div>
            <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-red-600">{summary?.missedCalls || 0}</div>
              <div className="text-xs text-red-600/70 uppercase mt-1">Missed</div>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/10 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-purple-600">{summary?.avgDuration ? Math.floor(summary.avgDuration/60) + 'm' : '0m'}</div>
              <div className="text-xs text-purple-600/70 uppercase mt-1">Avg Duration</div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="h-[300px]">
              <h3 className="text-sm font-semibold mb-4 text-center">Call Volume by Type</h3>
              {isLoading ? (
                <div className="h-full flex items-center justify-center text-muted-foreground">Loading chart...</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={summary?.byDay || []}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" tick={{fontSize: 12}} tickFormatter={(val) => format(new Date(val), "MMM d")} />
                    <YAxis tick={{fontSize: 12}} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="incoming" name="Incoming" stackId="a" fill="hsl(var(--chart-1))" />
                    <Bar dataKey="outgoing" name="Outgoing" stackId="a" fill="hsl(var(--chart-2))" />
                    <Bar dataKey="missed" name="Missed" stackId="a" fill="hsl(var(--destructive))" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="h-[300px]">
              <h3 className="text-sm font-semibold mb-4 text-center">Total Calls Trend</h3>
              {isLoading ? (
                <div className="h-full flex items-center justify-center text-muted-foreground">Loading chart...</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={summary?.byDay || []}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" tick={{fontSize: 12}} tickFormatter={(val) => format(new Date(val), "MMM d")} />
                    <YAxis tick={{fontSize: 12}} />
                    <Tooltip />
                    <Line type="monotone" dataKey="total" name="Total Calls" stroke="hsl(var(--primary))" strokeWidth={3} dot={{r: 4}} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
