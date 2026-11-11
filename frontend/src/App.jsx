import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import ScrollToTop from './components/ScrollToTop';
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import Home from '@/pages/Home';
import People from '@/pages/People';
import PersonDetail from '@/pages/PersonDetail';
import Appointments from '@/pages/Appointments';
import PostingWorkbench from '@/pages/PostingWorkbench';
import Succession from '@/pages/Succession';
import Pathways from '@/pages/Pathways';
import CareerAssistant from '@/pages/CareerAssistant';
import Skills from '@/pages/Skills';
import Development from '@/pages/Development';
import Actions from '@/pages/Actions';
import PathwayExplorer from '@/pages/PathwayExplorer';
import MigrationValidation from '@/pages/MigrationValidation';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Unauthenticated visitors are sent to the sign-in page by ProtectedRoute,
  // so no redirect is triggered here.
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/people" element={<People />} />
          <Route path="/people/:employeeId" element={<PersonDetail />} />
          <Route path="/appointments" element={<Appointments />} />
          <Route path="/posting-workbench" element={<PostingWorkbench />} />
          <Route path="/succession" element={<Succession />} />
          <Route path="/pathways" element={<Pathways />} />
          <Route path="/career-assistant" element={<CareerAssistant />} />
          <Route path="/skills" element={<Skills />} />
          <Route path="/development" element={<Development />} />
          <Route path="/actions" element={<Actions />} />
          <Route path="/pathway-explorer" element={<PathwayExplorer />} />
          <Route path="/migration-validation" element={<MigrationValidation />} />
        </Route>
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App