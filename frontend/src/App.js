import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './App.css';

// Account Pages
import Login from './pages/accounts/Login';
import ForgotPassword from './pages/accounts/ForgotPassword';
import ResetPassword from './pages/accounts/ResetPassword';

// Dashboard Pages
import UserDashboard from './pages/user/UserDashboard';
import AdminDashboard from './pages/admin/AdminDashboard';

// Document Pages
import DocumentList from './pages/documents/DocumentList';
import DocumentView from './pages/documents/DocumentView';
import UploadDocument from './pages/documents/UploadDocument';
import FileView from './pages/documents/FileView';
import PendingApproval from './pages/documents/PendingApproval';
import SentBack from './pages/documents/SentBack';
import ArchivedDocuments from './pages/documents/ArchivedDocuments';

// Workflow Pages
import ApprovalQueue from './pages/workflows/ApprovalQueue';
import Bottlenecks from './pages/workflows/Bottlenecks';
import TurnaroundTime from './pages/workflows/TurnaroundTime';
import DocumentStatus from './pages/workflows/DocumentStatus';

// Admin/Management Pages
import UserManagement from './pages/admin/UserManagement';
import Departments from './pages/admin/Departments';
import Positions from './pages/admin/Positions';
import RolesLevels from './pages/admin/RolesLevels';

// Analytics Pages
import Analytics from './pages/admin/Analytics';
import Reports from './pages/admin/Reports';
import Trends from './pages/admin/Trends';
import Exports from './pages/admin/Exports';

// Settings
import Settings from './pages/admin/Settings';

// Profile
import Profile from "./pages/profile/UserProfile";

// System Components
import Navbar from './components/system/Navbar';
import Sidebar from './components/system/Sidebar';

import api from './services/api';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
        const response = await api.get('/me');
        setUser(response.data);
        localStorage.setItem('user', JSON.stringify(response.data));
      } catch (error) {
        console.error('Auth check failed:', error);
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
        }
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const handleLogin = (userData, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = async () => {
    try {
      await api.post('/logout');
    } catch (error) {
      console.error('Logout error:', error);
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  // ======================================================
  // ACCESS LEVEL MATRIX
  // Level 1: Dashboard, Documents (All, Pending, Sent Back, Archived)
  // Level 2: Dashboard, Documents, Upload
  // Level 3: Dashboard, Documents, Upload, Management, Workflow
  // Level 4: Dashboard, Documents, Upload, Management, Workflow, Analytics, Settings
  // ======================================================
  
  // Helper functions to check access by level
  const canUpload = user && user.access_level >= 2;
  const canManageUsers = user && user.access_level >= 3;
  const canAccessWorkflow = user && user.access_level >= 3;
  const canAccessAnalytics = user && user.access_level >= 4;
  const canAccessSettings = user && user.access_level >= 4;
  
  // Sidebar navigation for level 3 and above (managers+), navbar navigation for level 1-2
  const showSidebar = user && user.access_level >= 3;

  return (
    <Router>
      {user && (
        showSidebar ? (
          <>
            <Sidebar user={user} onLogout={handleLogout} onToggle={setSidebarCollapsed} />
            <div className={sidebarCollapsed ? 'navbar-with-sidebar-collapsed' : 'navbar-with-sidebar'}>
              <Navbar user={user} onLogout={handleLogout} />
            </div>
          </>
        ) : (
          <Navbar user={user} onLogout={handleLogout} />
        )
      )}
      <div className={showSidebar ? `main-content-wrapper ${sidebarCollapsed ? 'sidebar-collapsed' : ''}` : ''}>
        <Routes>
          {/* ==================== AUTH ROUTES ==================== */}
          <Route
            path="/"
            element={!user ? <Navigate to="/login" /> : <Navigate to="/dashboard" />}
          />
          <Route
            path="/login"
            element={!user ? <Login onLogin={handleLogin} /> : <Navigate to="/dashboard" />}
          />
          <Route
            path="/forgot-password"
            element={!user ? <ForgotPassword /> : <Navigate to="/dashboard" />}
          />
          <Route
            path="/reset-password"
            element={!user ? <ResetPassword /> : <Navigate to="/dashboard" />}
          />
          <Route path="/profile" element={user ? <Profile /> : <Navigate to="/login" />} />

          {/* ==================== DASHBOARD ==================== */}
          <Route
            path="/dashboard"
            element={
              user ? (
                user.access_level >= 4 ? (
                  <AdminDashboard user={user} />
                ) : (
                  <UserDashboard user={user} />
                )
              ) : (
                <Navigate to="/login" />
              )
            }
          />

          {/* ==================== DOCUMENTS ==================== */}
          {/* All Documents - All levels */}
          <Route
            path="/documents"
            element={user ? <DocumentList user={user} /> : <Navigate to="/login" />}
          />
          {/* Legacy route redirect */}
          <Route
            path="/document"
            element={<Navigate to="/documents" replace />}
          />
          
          {/* Document View */}
          <Route
            path="/document/:id"
            element={user ? <DocumentView user={user} /> : <Navigate to="/login" />}
          />
          
          {/* File Viewer */}
          <Route
            path="/document/view/:id"
            element={user ? <FileView /> : <Navigate to="/login" />}
          />
          
          {/* Upload - Level 2+ */}
          <Route
            path="/upload"
            element={canUpload ? <UploadDocument user={user} /> : <Navigate to="/dashboard" />}
          />
          
          {/* Pending Approval - All levels */}
          <Route
            path="/documents/pending"
            element={user ? <PendingApproval user={user} /> : <Navigate to="/login" />}
          />
          
          {/* Sent Back - All levels */}
          <Route
            path="/documents/sent-back"
            element={user ? <SentBack user={user} /> : <Navigate to="/login" />}
          />
          
          {/* Archived - All levels */}
          <Route
            path="/documents/archived"
            element={user ? <ArchivedDocuments user={user} /> : <Navigate to="/login" />}
          />

          {/* ==================== WORKFLOW ==================== */}
          {/* Approval Queue - Level 3+ */}
          <Route
            path="/workflow/approval-queue"
            element={canAccessWorkflow ? <ApprovalQueue user={user} /> : <Navigate to="/dashboard" />}
          />
          
          {/* Bottlenecks - Level 3+ */}
          <Route
            path="/workflow/bottlenecks"
            element={canAccessWorkflow ? <Bottlenecks user={user} /> : <Navigate to="/dashboard" />}
          />
          
          {/* Turnaround Time - Level 3+ */}
          <Route
            path="/workflow/turnaround"
            element={canAccessWorkflow ? <TurnaroundTime user={user} /> : <Navigate to="/dashboard" />}
          />
          
          {/* Document Status - Level 3+ */}
          <Route
            path="/workflow/status"
            element={canAccessWorkflow ? <DocumentStatus user={user} /> : <Navigate to="/dashboard" />}
          />

          {/* ==================== MANAGEMENT ==================== */}
          {/* Users - Level 3+ */}
          <Route
            path="/users"
            element={canManageUsers ? <UserManagement user={user} /> : <Navigate to="/dashboard" />}
          />
          
          {/* Departments - Level 3+ */}
          <Route
            path="/management/departments"
            element={canManageUsers ? <Departments user={user} /> : <Navigate to="/dashboard" />}
          />
          
          {/* Positions - Level 3+ */}
          <Route
            path="/management/positions"
            element={canManageUsers ? <Positions user={user} /> : <Navigate to="/dashboard" />}
          />
          
          {/* Roles & Levels - Level 3+ */}
          <Route
            path="/management/roles"
            element={canManageUsers ? <RolesLevels user={user} /> : <Navigate to="/dashboard" />}
          />

          {/* ==================== ANALYTICS ==================== */}
          {/* Reports - Level 4 */}
          <Route
            path="/reports"
            element={canAccessAnalytics ? <Reports user={user} /> : <Navigate to="/dashboard" />}
          />
          
          {/* Trends - Level 4 */}
          <Route
            path="/analytics/trends"
            element={canAccessAnalytics ? <Trends user={user} /> : <Navigate to="/dashboard" />}
          />
          
          {/* Exports - Level 4 */}
          <Route
            path="/analytics/exports"
            element={canAccessAnalytics ? <Exports user={user} /> : <Navigate to="/dashboard" />}
          />
          
          {/* Legacy Analytics route */}
          <Route
            path="/analytics"
            element={canAccessAnalytics ? <Analytics user={user} /> : <Navigate to="/dashboard" />}
          />

          {/* ==================== SETTINGS ==================== */}
          <Route
            path="/settings"
            element={canAccessSettings ? <Settings user={user} /> : <Navigate to="/dashboard" />}
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
