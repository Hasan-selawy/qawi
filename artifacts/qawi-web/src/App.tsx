import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { LanguageProvider } from "@/hooks/use-language";
import { AuthProvider } from "@/hooks/use-auth";
import { RoleRoute } from "@/components/RoleRoute";
import { AppShell } from "@/components/layout/AppShell";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { OfflineBanner } from "@/components/OfflineBanner";

// Pages
import { RoleHome } from "@/pages/home";
import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";

import AdminDashboard from "@/pages/admin/dashboard";
import AdminMembers from "@/pages/admin/members";
import AdminCoaches from "@/pages/admin/coaches";
import AdminSubscriptions from "@/pages/admin/subscriptions";
import AdminAnalytics from "@/pages/admin/analytics";
import AdminRevenue from "@/pages/admin/revenue";
import AdminReports from "@/pages/admin/reports";

import CoachDashboard from "@/pages/coach/dashboard";
import MemberDetail from "@/pages/coach/member-detail";
import CreatePlan from "@/pages/coach/create-plan";
import Templates from "@/pages/coach/templates";
import Library from "@/pages/coach/library";
import CoachNutrition from "@/pages/coach/nutrition";

import SuperDashboard from "@/pages/super/dashboard";
import SuperGyms from "@/pages/super/gyms";
import SuperGymDetail from "@/pages/super/gym-detail";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={RoleHome} />
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />

      {/* Admin Routes */}
      <Route path="/admin/dashboard">
        <RoleRoute role="GYM_ADMIN"><AppShell><ErrorBoundary><AdminDashboard /></ErrorBoundary></AppShell></RoleRoute>
      </Route>
      <Route path="/admin/members">
        <RoleRoute role="GYM_ADMIN"><AppShell><ErrorBoundary><AdminMembers /></ErrorBoundary></AppShell></RoleRoute>
      </Route>
      <Route path="/admin/coaches">
        <RoleRoute role="GYM_ADMIN"><AppShell><ErrorBoundary><AdminCoaches /></ErrorBoundary></AppShell></RoleRoute>
      </Route>
      <Route path="/admin/subscriptions">
        <RoleRoute role="GYM_ADMIN"><AppShell><ErrorBoundary><AdminSubscriptions /></ErrorBoundary></AppShell></RoleRoute>
      </Route>
      <Route path="/admin/analytics">
        <RoleRoute role="GYM_ADMIN"><AppShell><ErrorBoundary><AdminAnalytics /></ErrorBoundary></AppShell></RoleRoute>
      </Route>
      <Route path="/admin/revenue">
        <RoleRoute role="GYM_ADMIN"><AppShell><ErrorBoundary><AdminRevenue /></ErrorBoundary></AppShell></RoleRoute>
      </Route>
      <Route path="/admin/reports">
        <RoleRoute role="GYM_ADMIN"><AppShell><ErrorBoundary><AdminReports /></ErrorBoundary></AppShell></RoleRoute>
      </Route>

      {/* Coach Routes */}
      <Route path="/coach/dashboard">
        <RoleRoute role="COACH"><AppShell><ErrorBoundary><CoachDashboard /></ErrorBoundary></AppShell></RoleRoute>
      </Route>
      <Route path="/coach/members/:id">
        {(params) => <RoleRoute role="COACH"><AppShell><ErrorBoundary><MemberDetail id={params.id!} /></ErrorBoundary></AppShell></RoleRoute>}
      </Route>
      <Route path="/coach/plans/create">
        <RoleRoute role="COACH"><AppShell><ErrorBoundary><CreatePlan /></ErrorBoundary></AppShell></RoleRoute>
      </Route>
      <Route path="/coach/templates">
        <RoleRoute role="COACH"><AppShell><ErrorBoundary><Templates /></ErrorBoundary></AppShell></RoleRoute>
      </Route>
      <Route path="/coach/library">
        <RoleRoute role={["COACH", "GYM_ADMIN"]}><AppShell><ErrorBoundary><Library /></ErrorBoundary></AppShell></RoleRoute>
      </Route>
      <Route path="/coach/nutrition">
        <RoleRoute role="COACH"><AppShell><ErrorBoundary><CoachNutrition /></ErrorBoundary></AppShell></RoleRoute>
      </Route>

      {/* Super Admin Routes */}
      <Route path="/super/dashboard">
        <RoleRoute role="SUPER_ADMIN"><AppShell><ErrorBoundary><SuperDashboard /></ErrorBoundary></AppShell></RoleRoute>
      </Route>
      <Route path="/super/gyms">
        <RoleRoute role="SUPER_ADMIN"><AppShell><ErrorBoundary><SuperGyms /></ErrorBoundary></AppShell></RoleRoute>
      </Route>
      <Route path="/super/gyms/:id">
        <RoleRoute role="SUPER_ADMIN"><AppShell><ErrorBoundary><SuperGymDetail /></ErrorBoundary></AppShell></RoleRoute>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <AuthProvider>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <OfflineBanner />
              <Router />
            </WouterRouter>
            <Toaster position="top-right" richColors theme="dark" />
          </TooltipProvider>
        </AuthProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;
