import React from 'react';
import { Routes as RouterRoutes, Route, Navigate } from 'react-router-dom';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from './components/ProtectedRoute';
// import { useAuth } from './contexts/AuthContext';

// Page imports
import Login from './pages/login';
import Register from './pages/register';
import AcceptInvitation from './pages/accept-invitation';
import PasswordReset from './pages/password-reset';
import ForgotPassword from './pages/forgot-password';
import ResetPassword from './pages/reset-password';
import KanbanBoard from './pages/kanban-board';
import CardDetails from './pages/card-details';
import TeamMembers from './pages/team-members';
import OrganizationSettings from './pages/organization-settings';

import OrganizationDashboard from './pages/organization-dashboard';
import UserProfileSettings from './pages/user-profile-settings';
import ProjectManagement from './pages/project-management';
import ProjectOverview from './pages/project-overview';
import DashboardRouter from './pages/dashboards/DashboardRouter';
import Analytics from './pages/analytics';
import Billing from './pages/billing';
import NotFound from './pages/NotFound';
import ApiTest from './components/debug/ApiTest';

const Routes = () => {
  return (
    <>
      <ScrollToTop />
      <RouterRoutes>
        {/* Default route redirects to login */}
        <Route path='/' element={<Navigate to='/login' replace />} />

        {/* Public routes */}
        <Route path='/login' element={<Login />} />
        <Route path='/register' element={<Register />} />
        <Route path='/accept-invitation' element={<AcceptInvitation />} />
        <Route path='/password-reset' element={<PasswordReset />} />
        <Route path='/forgot-password' element={<ForgotPassword />} />
        <Route path='/reset-password' element={<ResetPassword />} />
        <Route path='/api-test' element={<ApiTest />} />

        {/* Protected routes */}
        <Route
          path='/dashboard'
          element={
            <ProtectedRoute>
              <DashboardRouter />
            </ProtectedRoute>
          }
        />
        <Route
          path='/dashboard/owner'
          element={
            <ProtectedRoute>
              <DashboardRouter />
            </ProtectedRoute>
          }
        />
        <Route
          path='/dashboard/admin'
          element={
            <ProtectedRoute>
              <DashboardRouter />
            </ProtectedRoute>
          }
        />
        <Route
          path='/dashboard/member'
          element={
            <ProtectedRoute>
              <DashboardRouter />
            </ProtectedRoute>
          }
        />
        <Route
          path='/dashboard/viewer'
          element={
            <ProtectedRoute>
              <DashboardRouter />
            </ProtectedRoute>
          }
        />
        <Route
          path='/organization-dashboard'
          element={
            <ProtectedRoute>
              <OrganizationDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path='/role-based-dashboard'
          element={
            <ProtectedRoute>
              <DashboardRouter />
            </ProtectedRoute>
          }
        />
        <Route
          path='/kanban-board'
          element={
            <ProtectedRoute>
              <KanbanBoard />
            </ProtectedRoute>
          }
        />
        <Route
          path='/card-details'
          element={
            <ProtectedRoute>
              <CardDetails />
            </ProtectedRoute>
          }
        />
        <Route
          path='/team-members'
          element={
            <ProtectedRoute>
              <TeamMembers />
            </ProtectedRoute>
          }
        />
        <Route
          path='/organization-settings'
          element={
            <ProtectedRoute>
              <OrganizationSettings />
            </ProtectedRoute>
          }
        />

        <Route
          path='/user-profile-settings'
          element={
            <ProtectedRoute>
              <UserProfileSettings />
            </ProtectedRoute>
          }
        />
        <Route
          path='/project-management'
          element={
            <ProtectedRoute>
              <ProjectManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path='/project-overview'
          element={
            <ProtectedRoute>
              <ProjectOverview />
            </ProtectedRoute>
          }
        />
        <Route
          path='/project-overview/:projectId'
          element={
            <ProtectedRoute>
              <ProjectOverview />
            </ProtectedRoute>
          }
        />
        <Route
          path='/analytics'
          element={
            <ProtectedRoute>
              <Analytics />
            </ProtectedRoute>
          }
        />
        <Route
          path='/billing'
          element={
            <ProtectedRoute>
              <Billing />
            </ProtectedRoute>
          }
        />

        {/* 404 route */}
        <Route path='*' element={<NotFound />} />
      </RouterRoutes>
    </>
  );
};

export default Routes;
