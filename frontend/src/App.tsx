import React, { useEffect } from 'react';
import { RouterProvider, useRouter } from './context/RouterContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginView } from './pages/LoginView';
import { PatientPortal } from './pages/patient/PatientPortal';
import { AdminWorkspace } from './pages/admin/AdminWorkspace';
import { VerifierWorkspace } from './pages/verifier/VerifierWorkspace';

const MainAppRouter: React.FC = () => {
  const { role, isAuthenticated } = useAuth();
  const { path, navigate } = useRouter();

  useEffect(() => {
    // If not authenticated and not on login, redirect to login
    if (!isAuthenticated) {
      if (path !== '/login') {
        navigate('/login', { replace: true });
      }
      return;
    }

    // If authenticated and visiting root or login, redirect to role workspace
    if (path === '/' || path === '/login') {
      if (role === 'patient') navigate('/patient', { replace: true });
      else if (role === 'admin') navigate('/admin', { replace: true });
      else if (role === 'verifier') navigate('/verifier', { replace: true });
      return;
    }

    // Role-based route guard
    if (role === 'patient' && (path.startsWith('/admin') || path.startsWith('/verifier'))) {
      navigate('/patient', { replace: true });
    } else if (role === 'verifier' && (path.startsWith('/admin') || path.startsWith('/patient'))) {
      navigate('/verifier', { replace: true });
    } else if (role === 'admin' && (path.startsWith('/patient') || path.startsWith('/verifier'))) {
      navigate('/admin', { replace: true });
    }
  }, [isAuthenticated, role, path, navigate]);

  // Unauthenticated screen
  if (!isAuthenticated || path === '/login') {
    return <LoginView />;
  }

  // Role workspaces
  if (role === 'patient') {
    return <PatientPortal />;
  }

  if (role === 'admin') {
    return <AdminWorkspace />;
  }

  if (role === 'verifier') {
    return <VerifierWorkspace />;
  }

  return <LoginView />;
};

export const App: React.FC = () => {
  return (
    <RouterProvider>
      <AuthProvider>
        <MainAppRouter />
      </AuthProvider>
    </RouterProvider>
  );
};

export default App;
