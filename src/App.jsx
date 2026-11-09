import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from "sonner"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, AccessGate, useAuth } from '@/lib/AuthContext';
import Presentations from './pages/Presentations';
import Operations from './pages/Operations';
import ShopReports from './pages/ShopReports';
import Team from './pages/Team';
import PreferencesBridge from './components/PreferencesBridge';
import ManagerOnly from './components/ManagerOnly';
import SharedPresentation from './pages/SharedPresentation';

// QM Pages
import QMLayout from './pages/QMLayout';
import QMDashboard from './pages/QMDashboard';
import QuotesList from './pages/QuotesList';
import QuoteBuilder from './pages/QuoteBuilder';
import QMCustomers from './pages/QMCustomers';
import QMProducts from './pages/QMProducts';
import QMSuppliers from './pages/QMSuppliers';

import SSBrowse from './pages/SSBrowse';
import Tasks from './pages/Tasks';
import SalesBoard from './pages/SalesBoard';
import JobBoard from './pages/JobBoard';
import PurchaseOrders from './pages/PurchaseOrders';
import PurchaseOrderDetail from './pages/PurchaseOrderDetail';
import Reporting from './pages/Reporting';
import Settings from './pages/Settings';

const AuthenticatedApp = () => {
  return (
    <Routes>
      {/* Public quote approval page */}
      <Route path="/quote-approval/:quoteId/:token" element={<div className="p-10">Customer approvals will be enabled after the secure approval endpoint is migrated.</div>} />

      {/* Main app with sidebar */}
      <Route element={<QMLayout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<QMDashboard />} />
        <Route path="/presentations" element={<Presentations />} />
        <Route path="/presentations/:id" element={<Presentations />} />
        <Route path="/invoices" element={<Operations kind="Invoice" />} />
        <Route path="/expenses" element={<Operations kind="Expense" />} />
        <Route path="/reports" element={<ShopReports />} />
        <Route path="/team" element={<Team />} />
        <Route path="/quotes" element={<QuotesList />} />
        <Route path="/quotes/new" element={<QuoteBuilder />} />
        <Route path="/quotes/:id" element={<QuoteBuilder />} />
        <Route path="/customers" element={<QMCustomers />} />
        <Route path="/products" element={<QMProducts />} />
        <Route path="/products/:supplier" element={<QMProducts />} />
        <Route path="/suppliers" element={<QMSuppliers />} />
        <Route path="/ss-browse" element={<SSBrowse />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/salesboard" element={<SalesBoard />} />
        <Route path="/jobboard" element={<JobBoard />} />
        <Route path="/jobboard/:id" element={<JobBoard />} />
        <Route path="/purchase-orders" element={<PurchaseOrders />} />
        <Route path="/purchase-orders/:id" element={<PurchaseOrderDetail />} />
        <Route path="/reporting" element={<ManagerOnly><Reporting /></ManagerOnly>} />
        <Route path="/settings" element={<ManagerOnly><Settings /></ManagerOnly>} />
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function ScopedShop() {
 const {membership}=useAuth();
 return <PreferencesBridge key={membership?.org_id}><AuthenticatedApp /></PreferencesBridge>;
}
function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <Routes><Route path="/p/:token" element={<SharedPresentation />} /><Route path="*" element={<AccessGate><ScopedShop /></AccessGate>} /></Routes>
        </Router>
        <Toaster />
        <SonnerToaster richColors position="top-right" />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App