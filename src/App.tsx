import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import { AppShell } from "@/components/cg/AppShell";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CloseoutProvider } from "@/state/closeout";

import AuditHistory from "./pages/AuditHistory";
import Dashboard from "./pages/Dashboard";
import Exceptions from "./pages/Exceptions";
import NotFound from "./pages/NotFound";
import Owners from "./pages/Owners";
import Rules from "./pages/Rules";
import Settings from "./pages/Settings";
import Sources from "./pages/Sources";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <CloseoutProvider>
        <Toaster position="bottom-right" />
        <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, "")} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            <Route element={<AppShell />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/sources" element={<Sources />} />
              <Route path="/rules" element={<Rules />} />
              <Route path="/exceptions" element={<Exceptions />} />
              <Route path="/owners" element={<Owners />} />
              <Route path="/audit" element={<AuditHistory />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </CloseoutProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
