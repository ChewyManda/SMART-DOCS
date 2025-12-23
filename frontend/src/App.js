import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './App.css';
import LandingPage from './components/LandingPage';
import Login from './pages/accounts/Login';
import UserDashboard from './pages/user/UserDashboard';
import AdminDashboard from './pages/admin/AdminDashboard';
import DocumentList from './pages/documents/DocumentList';
import DocumentView from './pages/documents/DocumentView';
import UploadDocument from './pages/documents/UploadDocument';
import UserManagement from './pages/admin/UserManagement';
import Navbar from './components/system/Navbar';
import FileView from './pages/documents/FileView';
import api from './services/api';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
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
  };

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

  return (
    <Router>
      {user && <Navbar user={user} onLogout={handleLogout} />}
      <Routes>
        {/* Landing Page - shown when not logged in */}
        <Route
          path="/"
          element={!user ? <LandingPage /> : <Navigate to="/dashboard" />}
        />
        
        {/* Login Page */}
        <Route
          path="/login"
          element={!user ? <Login onLogin={handleLogin} /> : <Navigate to="/dashboard" />}
        />
        
        {/* Dashboard - shown after login */}
        <Route
          path="/dashboard"
          element={
            user ? (
              user.role === 'admin' || user.role === 'staff' ? (
                <AdminDashboard user={user} />
              ) : (
                <UserDashboard user={user} />
              )
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        
        <Route
          path="/document"
          element={user ? <DocumentList user={user} /> : <Navigate to="/login" />}
        />
        <Route
          path="/document/:id"
          element={user ? <DocumentView user={user} /> : <Navigate to="/login" />}
        />

        {/* FILE VIEWER – NEW ROUTE */}
        <Route
          path="/document/view/:id"
          element={user ? <FileView /> : <Navigate to="/login" />}
        />

        <Route
          path="/upload"
          element={
            user && (user.role === 'admin' || user.role === 'staff') ? (
              <UploadDocument user={user} />
            ) : (
              <Navigate to="/dashboard" />
            )
          }
        />
        <Route
          path="/users"
          element={
            user && (user.role === 'admin' || user.role === 'staff') ? (
              <UserManagement user={user} />
            ) : (
              <Navigate to="/dashboard" />
            )
          }
        />
      </Routes>
    </Router>
  );
}

export default App;