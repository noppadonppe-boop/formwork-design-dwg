import { lazy, type ReactNode, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import { ProtectedRoute } from './auth/ProtectedRoute'
import type { Permission, UserRole } from './auth/roles'
import { AppShell } from './components/AppShell'
import { UpdateBanner } from './components/UpdateBanner'
import { ElementPage } from './pages/ElementPage'
import { LibraryPage } from './pages/LibraryPage'
import { LoginPage } from './pages/LoginPage'
import { PendingApprovalPage } from './pages/PendingApprovalPage'
import { ProjectEditPage } from './pages/ProjectEditPage'
import { ProjectPage } from './pages/ProjectPage'
import { ProjectsPage } from './pages/ProjectsPage'
import { RegisterPage } from './pages/RegisterPage'

const ReportPage = lazy(() => import('./pages/ReportPage').then((m) => ({ default: m.ReportPage })))
const ShopPage = lazy(() => import('./pages/ShopPage').then((m) => ({ default: m.ShopPage })))
const ImportPage = lazy(() => import('./pages/ImportPage').then((m) => ({ default: m.ImportPage })))
const BomPage = lazy(() => import('./pages/BomPage').then((m) => ({ default: m.BomPage })))
const ManualPage = lazy(() => import('./pages/ManualPage').then((m) => ({ default: m.ManualPage })))
const ReferencePage = lazy(() => import('./pages/ReferencePage').then((m) => ({ default: m.ReferencePage })))
const UserAdminPage = lazy(() => import('./pages/UserAdminPage').then((m) => ({ default: m.UserAdminPage })))

/** Approved users only; `perm` / `roles` narrow it further. Routes with :projectId also need the project assigned. */
function Protected({ children, bare, perm, roles }: { children: ReactNode; bare?: boolean; perm?: Permission; roles?: UserRole[] }) {
  return (
    <ProtectedRoute requirePermission={perm} requireRoles={roles}>
      {bare ? (
        <Suspense fallback={null}>{children}</Suspense>
      ) : (
        <AppShell>
          <Suspense fallback={null}>{children}</Suspense>
        </AppShell>
      )}
    </ProtectedRoute>
  )
}

export function App() {
  return (
    <AuthProvider>
      <UpdateBanner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/pending" element={<ProtectedRoute requireApproved={false}><PendingApprovalPage /></ProtectedRoute>} />
          <Route path="/" element={<Protected><ProjectsPage /></Protected>} />
          <Route path="/dashboard" element={<Navigate to="/" replace />} />
          <Route path="/admin" element={<Protected roles={['MasterAdmin']}><UserAdminPage /></Protected>} />
          <Route path="/manual" element={<Protected><ManualPage /></Protected>} />
          <Route path="/reference" element={<Protected><ReferencePage /></Protected>} />
          <Route path="/library" element={<Protected perm="library"><LibraryPage /></Protected>} />
          <Route path="/projects/new" element={<Protected perm="project.create"><ProjectEditPage /></Protected>} />
          <Route path="/projects/:projectId" element={<Protected><ProjectPage /></Protected>} />
          <Route path="/projects/:projectId/edit" element={<Protected perm="project.edit"><ProjectEditPage /></Protected>} />
          <Route path="/projects/:projectId/elements/:elementId" element={<Protected><ElementPage /></Protected>} />
          <Route path="/projects/:projectId/report" element={<Protected bare perm="report"><ReportPage /></Protected>} />
          <Route path="/projects/:projectId/elements/:elementId/report" element={<Protected bare perm="report"><ReportPage /></Protected>} />
          <Route path="/projects/:projectId/shop" element={<Protected bare perm="shop"><ShopPage /></Protected>} />
          <Route path="/projects/:projectId/elements/:elementId/shop" element={<Protected bare perm="shop"><ShopPage /></Protected>} />
          <Route path="/projects/:projectId/import" element={<Protected perm="import"><ImportPage /></Protected>} />
          <Route path="/projects/:projectId/bom" element={<Protected perm="bom"><BomPage /></Protected>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
