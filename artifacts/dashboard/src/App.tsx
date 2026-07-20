import { Route, Switch, Router as WouterRouter } from 'wouter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { initAuth } from '@/lib/auth';

import NotFound from '@/pages/not-found';
import LoginPage from '@/pages/login';
import DashboardPage from '@/pages/dashboard';
import CallsPage from '@/pages/calls';
import CustomersPage from '@/pages/customers';
import ReportsPage from '@/pages/reports';
import AgentsPage from '@/pages/agents';
import CategoriesPage from '@/pages/categories';
import CustomerDetailPage from '@/pages/customer-detail';
import PipelinePage from '@/pages/pipeline';
import TargetsPage from '@/pages/targets';
import ExpensesPage from '@/pages/expenses';
import AttendancePage from '@/pages/attendance';
import { DashboardLayout } from '@/components/layout';

// Initialize auth token interceptor for API client
initAuth();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoutes() {
  return (
    <DashboardLayout>
      <Switch>
        <Route path="/dashboard" component={DashboardPage} />
        <Route path="/calls" component={CallsPage} />
        <Route path="/customers/:id" component={CustomerDetailPage} />
        <Route path="/customers" component={CustomersPage} />
        <Route path="/reports" component={ReportsPage} />
        <Route path="/agents" component={AgentsPage} />
        <Route path="/categories" component={CategoriesPage} />
        <Route path="/pipeline" component={PipelinePage} />
        <Route path="/targets" component={TargetsPage} />
        <Route path="/expenses" component={ExpensesPage} />
        <Route path="/attendance" component={AttendancePage} />
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={LoginPage} />
      <Route path="/:rest*">
        <ProtectedRoutes />
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
