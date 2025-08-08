import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ERPAuthProvider, useERPAuth } from "@/contexts/ERPAuthContext";

// Import pages
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Index from "@/pages/Index";
import ProtectedRoute from "@/routes/ProtectedRoute";

// Import route configurations
import { salesRoutes } from "@/routes/salesRoutes";
import { inventoryRoutes } from "@/routes/inventoryRoutes";
import { procurementRoutes } from "@/routes/procurementRoutes";
import { financialsRoutes } from "@/routes/financialsRoutes";
import { analyticsRoutes } from "@/routes/analyticsRoutes";
import { settingsRoutes } from "@/routes/settingsRoutes";
import { userRoutes } from "@/routes/userRoutes";

const queryClient = new QueryClient();

// App content component that uses auth context
const AppContent = () => {
  const { isAuthenticated, isLoading } = useERPAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route 
          path="/login" 
          element={!isAuthenticated ? <Login /> : <Navigate to="/" replace />} 
        />
        <Route 
          path="/register" 
          element={!isAuthenticated ? <Register /> : <Navigate to="/" replace />} 
        />
        
        {/* Protected routes */}
        <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
        
        {/* Sales routes */}
        {salesRoutes.map((route, index) => (
          <Route
            key={`sales-${index}`}
            path={route.path}
            element={<ProtectedRoute requiredModule="sales">{route.element}</ProtectedRoute>}
          />
        ))}
        
        {/* Inventory routes */}
        {inventoryRoutes.map((route, index) => (
          <Route
            key={`inventory-${index}`}
            path={route.path}
            element={<ProtectedRoute requiredModule="inventory">{route.element}</ProtectedRoute>}
          />
        ))}
        
        {/* Procurement routes */}
        {procurementRoutes.map((route, index) => (
          <Route
            key={`procurement-${index}`}
            path={route.path}
            element={<ProtectedRoute requiredModule="procurement">{route.element}</ProtectedRoute>}
          />
        ))}
        
        {/* Financial routes */}
        {financialsRoutes.map((route, index) => (
          <Route
            key={`finance-${index}`}
            path={route.path}
            element={<ProtectedRoute requiredModule="finance">{route.element}</ProtectedRoute>}
          />
        ))}
        
        {/* Analytics routes */}
        {analyticsRoutes.map((route, index) => (
          <Route
            key={`analytics-${index}`}
            path={route.path}
            element={<ProtectedRoute>{route.element}</ProtectedRoute>}
          />
        ))}
        
        {/* Settings routes */}
        {settingsRoutes.map((route, index) => (
          <Route
            key={`settings-${index}`}
            path={route.path}
            element={<ProtectedRoute>{route.element}</ProtectedRoute>}
          />
        ))}
        
        {/* User management routes (manager only) */}
        {userRoutes.map((route, index) => (
          <Route
            key={`user-${index}`}
            path={route.path}
            element={<ProtectedRoute requireManager={true}>{route.element}</ProtectedRoute>}
          />
        ))}
        
        {/* Fallback route */}
        <Route 
          path="*" 
          element={isAuthenticated ? <Navigate to="/" replace /> : <Navigate to="/login" replace />} 
        />
      </Routes>
    </BrowserRouter>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider>
          <Toaster />
          <Sonner />
          <ERPAuthProvider>
            <AppContent />
          </ERPAuthProvider>
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
