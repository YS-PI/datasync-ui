import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from 'react-oidc-context';
import { Outlet, RouterProvider, createBrowserRouter } from 'react-router';

import App from './app';
import { routesSection } from './routes/sections';
import { ErrorBoundary } from './routes/components';
import { cognitoOidcConfig, isCognitoConfigured } from './auth';

// ----------------------------------------------------------------------

const router = createBrowserRouter([
  {
    Component: () => (
      <App>
        <Outlet />
      </App>
    ),
    errorElement: <ErrorBoundary />,
    children: routesSection,
  },
]);

const root = createRoot(document.getElementById('root')!);

root.render(
  <StrictMode>
    {isCognitoConfigured() ? (
      <AuthProvider {...cognitoOidcConfig}>
        <RouterProvider router={router} />
      </AuthProvider>
    ) : (
      <RouterProvider router={router} />
    )}
  </StrictMode>
);
