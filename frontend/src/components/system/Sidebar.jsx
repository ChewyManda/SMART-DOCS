import React, { useState, useEffect, useCallback } from 'react';
import { Nav, Badge } from 'react-bootstrap';
import { Link, useLocation } from 'react-router-dom';
import api from '../../services/api';
import '../../css/system/sidebar.css';

const Sidebar = ({ user, onLogout, onToggle }) => {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [badges, setBadges] = useState({
    pendingDocuments: 0,
    pendingApproval: 0,
    sentBack: 0,
    approvalQueue: 0,
  });
  const [expandedMenus, setExpandedMenus] = useState({});

  // ======================================================
  // ACCESS LEVEL MATRIX
  // Level 1: Dashboard, Documents (All, Pending, Sent Back, Archived)
  // Level 2: Dashboard, Documents, Upload
  // Level 3: Dashboard, Documents, Upload, Management (Users, Departments, Roles)
  // Level 4: Dashboard, Documents, Upload, Management, Workflow, Analytics, Settings
  // ======================================================
  const accessLevel = user?.access_level || 1;
  const canUpload = accessLevel >= 2;
  const canManageUsers = accessLevel >= 3;
  const canAccessWorkflow = accessLevel >= 3;
  const canAccessAnalytics = accessLevel >= 4;
  const canAccessSettings = accessLevel >= 4;

  const fetchBadgeCounts = useCallback(async () => {
    try {
      const response = await api.get('/admin/dashboard-stats');
      setBadges({
        pendingDocuments: response.data.pending_documents || 0,
        pendingApproval: response.data.pending_approval || 0,
        sentBack: response.data.sent_back || 0,
        approvalQueue: response.data.approval_queue || 0,
      });
    } catch (error) {
      console.error('Failed to fetch badge counts:', error);
    }
  }, []);

  useEffect(() => {
    fetchBadgeCounts();
    const interval = setInterval(fetchBadgeCounts, 30000);
    return () => clearInterval(interval);
  }, [fetchBadgeCounts]);

  // Auto-expand menus based on current URL
  useEffect(() => {
    const path = location.pathname;
    if (path.startsWith('/documents') || path === '/upload') {
      setExpandedMenus(prev => ({ ...prev, documents: true }));
    }
    if (path.startsWith('/workflow')) {
      setExpandedMenus(prev => ({ ...prev, workflow: true }));
    }
    if (path.startsWith('/management') || path === '/users') {
      setExpandedMenus(prev => ({ ...prev, management: true }));
    }
    if (path.startsWith('/analytics') || path === '/reports') {
      setExpandedMenus(prev => ({ ...prev, analytics: true }));
    }
    if (path.startsWith('/settings')) {
      setExpandedMenus(prev => ({ ...prev, settings: true }));
    }
  }, [location.pathname]);

  const handleToggle = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    if (onToggle) {
      onToggle(newState);
    }
  };

  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  const isMenuActive = (menuPaths) =>
    menuPaths.some(path => location.pathname === path || location.pathname.startsWith(path + "/"));

  const toggleMenu = (menuKey) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menuKey]: !prev[menuKey]
    }));
  };

  return (
    <>
      <aside className={`admin-sidebar ${isCollapsed ? 'collapsed' : ''}`}>
        {/* Brand/Logo Section */}
        <div className="sidebar-brand">
          <Link to="/dashboard" className="brand-wrapper">
            <img src="/logo-SMD.png" alt="SMART-DOCS Logo" className="brand-logo" />
            {!isCollapsed && (
              <span className="brand-text">
                <span className="smart">SMART</span>
                <span className="docs">DOCS</span>
              </span>
            )}
          </Link>
          <button 
            className="sidebar-toggle"
            onClick={handleToggle}
            aria-label="Toggle sidebar"
          >
            <i className={`bi bi-chevron-${isCollapsed ? 'right' : 'left'}`}></i>
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="sidebar-nav">
          <Nav className="flex-column">
            {/* Dashboard - All levels */}
            <Nav.Link 
              as={Link} 
              to="/dashboard" 
              className={`sidebar-link ${isActive('/dashboard') ? 'active' : ''}`}
            >
              <i className="bi bi-house-door"></i>
              {!isCollapsed && <span>Dashboard</span>}
            </Nav.Link>

            {/* Documents Menu Group - All levels */}
            <div className="sidebar-menu-group">
              <div
                className={`sidebar-link sidebar-menu-toggle ${isMenuActive(['/documents', '/upload']) ? 'active' : ''}`}
                onClick={() => {
                  if (isCollapsed) {
                    window.location.href = '/documents';
                  } else {
                    toggleMenu('documents');
                  }
                }}
              >
                <i className="bi bi-file-earmark-text"></i>
                {!isCollapsed && (
                  <>
                    <span>Documents</span>
                    {badges.pendingDocuments > 0 && (
                      <Badge 
                        bg="danger" 
                        pill 
                        className="sidebar-badge-inline"
                      >
                        {badges.pendingDocuments > 99 ? '99+' : badges.pendingDocuments}
                      </Badge>
                    )}
                    <i className={`bi bi-chevron-${expandedMenus.documents ? 'down' : 'right'} menu-chevron`}></i>
                  </>
                )}
              </div>
              {!isCollapsed && expandedMenus.documents && (
                <div className="sidebar-submenu">
                  <Nav.Link
                    as={Link}
                    to="/documents"
                    className={`sidebar-submenu-link ${location.pathname === '/documents' ? 'active' : ''}`}
                  >
                    <span>All Documents</span>
                  </Nav.Link>
                  {canUpload && (
                    <Nav.Link
                      as={Link}
                      to="/upload"
                      className={`sidebar-submenu-link ${location.pathname === '/upload' ? 'active' : ''}`}
                    >
                      <span>Upload</span>
                    </Nav.Link>
                  )}
                  <Nav.Link
                    as={Link}
                    to="/documents/pending"
                    className={`sidebar-submenu-link ${location.pathname === '/documents/pending' ? 'active' : ''}`}
                  >
                    <span>Pending Approval</span>
                    {badges.pendingApproval > 0 && (
                      <Badge bg="warning" text="dark" pill className="ms-auto badge-sm">
                        {badges.pendingApproval}
                      </Badge>
                    )}
                  </Nav.Link>
                  <Nav.Link
                    as={Link}
                    to="/documents/sent-back"
                    className={`sidebar-submenu-link ${location.pathname === '/documents/sent-back' ? 'active' : ''}`}
                  >
                    <span>Sent Back</span>
                    {badges.sentBack > 0 && (
                      <Badge bg="danger" pill className="ms-auto badge-sm">
                        {badges.sentBack}
                      </Badge>
                    )}
                  </Nav.Link>
                  <Nav.Link
                    as={Link}
                    to="/documents/archived"
                    className={`sidebar-submenu-link ${location.pathname === '/documents/archived' ? 'active' : ''}`}
                  >
                    <span>Archived</span>
                  </Nav.Link>
                </div>
              )}
            </div>

            {/* WORKFLOW SECTION - Level 3+ */}
            {canAccessWorkflow && (
              <div className="sidebar-menu-group">
                <div
                  className={`sidebar-link sidebar-menu-toggle ${isMenuActive(['/workflow']) ? 'active' : ''}`}
                  onClick={() => {
                    if (isCollapsed) {
                      window.location.href = '/workflow/approval-queue';
                    } else {
                      toggleMenu('workflow');
                    }
                  }}
                >
                  <i className="bi bi-diagram-3"></i>
                  {!isCollapsed && (
                    <>
                      <span>Workflow</span>
                      {badges.approvalQueue > 0 && (
                        <Badge 
                          bg="primary" 
                          pill 
                          className="sidebar-badge-inline"
                        >
                          {badges.approvalQueue}
                        </Badge>
                      )}
                      <i className={`bi bi-chevron-${expandedMenus.workflow ? 'down' : 'right'} menu-chevron`}></i>
                    </>
                  )}
                </div>
                {!isCollapsed && expandedMenus.workflow && (
                  <div className="sidebar-submenu">
                    <Nav.Link
                      as={Link}
                      to="/workflow/approval-queue"
                      className={`sidebar-submenu-link ${location.pathname === '/workflow/approval-queue' ? 'active' : ''}`}
                    >
                      <span>Approval Queue</span>
                      {badges.approvalQueue > 0 && (
                        <Badge bg="primary" pill className="ms-auto badge-sm">
                          {badges.approvalQueue}
                        </Badge>
                      )}
                    </Nav.Link>
                    <Nav.Link
                      as={Link}
                      to="/workflow/bottlenecks"
                      className={`sidebar-submenu-link ${location.pathname === '/workflow/bottlenecks' ? 'active' : ''}`}
                    >
                      <span>Bottlenecks</span>
                    </Nav.Link>
                    <Nav.Link
                      as={Link}
                      to="/workflow/turnaround"
                      className={`sidebar-submenu-link ${location.pathname === '/workflow/turnaround' ? 'active' : ''}`}
                    >
                      <span>Turnaround Time</span>
                    </Nav.Link>
                    <Nav.Link
                      as={Link}
                      to="/workflow/status"
                      className={`sidebar-submenu-link ${location.pathname === '/workflow/status' ? 'active' : ''}`}
                    >
                      <span>Document Status</span>
                    </Nav.Link>
                  </div>
                )}
              </div>
            )}

            {/* MANAGEMENT SECTION - Level 3+ */}
            {canManageUsers && (
              <div className="sidebar-menu-group">
                <div
                  className={`sidebar-link sidebar-menu-toggle ${isMenuActive(['/management', '/users']) ? 'active' : ''}`}
                  onClick={() => {
                    if (isCollapsed) {
                      window.location.href = '/users';
                    } else {
                      toggleMenu('management');
                    }
                  }}
                >
                  <i className="bi bi-people"></i>
                  {!isCollapsed && (
                    <>
                      <span>Management</span>
                      <i className={`bi bi-chevron-${expandedMenus.management ? 'down' : 'right'} menu-chevron`}></i>
                    </>
                  )}
                </div>
                {!isCollapsed && expandedMenus.management && (
                  <div className="sidebar-submenu">
                    <Nav.Link
                      as={Link}
                      to="/users"
                      className={`sidebar-submenu-link ${location.pathname === '/users' ? 'active' : ''}`}
                    >
                      <span>Users</span>
                    </Nav.Link>
                    <Nav.Link
                      as={Link}
                      to="/management/departments"
                      className={`sidebar-submenu-link ${location.pathname === '/management/departments' ? 'active' : ''}`}
                    >
                      <span>Departments</span>
                    </Nav.Link>
                    <Nav.Link
                      as={Link}
                      to="/management/positions"
                      className={`sidebar-submenu-link ${location.pathname === '/management/positions' ? 'active' : ''}`}
                    >
                      <span>Positions</span>
                    </Nav.Link>
                    <Nav.Link
                      as={Link}
                      to="/management/roles"
                      className={`sidebar-submenu-link ${location.pathname === '/management/roles' ? 'active' : ''}`}
                    >
                      <span>Roles & Levels</span>
                    </Nav.Link>
                  </div>
                )}
              </div>
            )}

            {/* ANALYTICS SECTION - Level 4 only */}
            {canAccessAnalytics && (
              <div className="sidebar-menu-group">
                <div
                  className={`sidebar-link sidebar-menu-toggle ${isMenuActive(['/analytics', '/reports']) ? 'active' : ''}`}
                  onClick={() => {
                    if (isCollapsed) {
                      window.location.href = '/reports';
                    } else {
                      toggleMenu('analytics');
                    }
                  }}
                >
                  <i className="bi bi-graph-up"></i>
                  {!isCollapsed && (
                    <>
                      <span>Analytics</span>
                      <i className={`bi bi-chevron-${expandedMenus.analytics ? 'down' : 'right'} menu-chevron`}></i>
                    </>
                  )}
                </div>
                {!isCollapsed && expandedMenus.analytics && (
                  <div className="sidebar-submenu">
                    <Nav.Link
                      as={Link}
                      to="/reports"
                      className={`sidebar-submenu-link ${location.pathname === '/reports' ? 'active' : ''}`}
                    >
                      <span>Reports</span>
                    </Nav.Link>
                    <Nav.Link
                      as={Link}
                      to="/analytics/trends"
                      className={`sidebar-submenu-link ${location.pathname === '/analytics/trends' ? 'active' : ''}`}
                    >
                      <span>Trends</span>
                    </Nav.Link>
                    <Nav.Link
                      as={Link}
                      to="/analytics/exports"
                      className={`sidebar-submenu-link ${location.pathname === '/analytics/exports' ? 'active' : ''}`}
                    >
                      <span>Exports</span>
                    </Nav.Link>
                  </div>
                )}
              </div>
            )}

            {/* SETTINGS SECTION - Level 4 only */}
            {canAccessSettings && (
              <div className="sidebar-menu-group">
                <div
                  className={`sidebar-link sidebar-menu-toggle ${isMenuActive(['/settings']) ? 'active' : ''}`}
                  onClick={() => {
                    if (isCollapsed) {
                      window.location.href = '/settings';
                    } else {
                      toggleMenu('settings');
                    }
                  }}
                >
                  <i className="bi bi-gear"></i>
                  {!isCollapsed && (
                    <>
                      <span>Settings</span>
                      <i className={`bi bi-chevron-${expandedMenus.settings ? 'down' : 'right'} menu-chevron`}></i>
                    </>
                  )}
                </div>
                {!isCollapsed && expandedMenus.settings && (
                  <div className="sidebar-submenu">
                    <Nav.Link
                      as={Link}
                      to="/settings?tab=general"
                      className={`sidebar-submenu-link ${location.pathname === '/settings' && (!location.search || location.search.includes('tab=general')) ? 'active' : ''}`}
                    >
                      <span>General</span>
                    </Nav.Link>
                    <Nav.Link
                      as={Link}
                      to="/settings?tab=notifications"
                      className={`sidebar-submenu-link ${location.search.includes('tab=notifications') ? 'active' : ''}`}
                    >
                      <span>Notifications</span>
                    </Nav.Link>
                    <Nav.Link
                      as={Link}
                      to="/settings?tab=security"
                      className={`sidebar-submenu-link ${location.search.includes('tab=security') ? 'active' : ''}`}
                    >
                      <span>Security</span>
                    </Nav.Link>
                    <Nav.Link
                      as={Link}
                      to="/settings?tab=document-rules"
                      className={`sidebar-submenu-link ${location.search.includes('tab=document-rules') ? 'active' : ''}`}
                    >
                      <span>Document Rules</span>
                    </Nav.Link>
                    <Nav.Link
                      as={Link}
                      to="/settings?tab=retention"
                      className={`sidebar-submenu-link ${location.search.includes('tab=retention') ? 'active' : ''}`}
                    >
                      <span>Retention Policy</span>
                    </Nav.Link>
                  </div>
                )}
              </div>
            )}
          </Nav>
        </nav>

      </aside>
    </>
  );
};

export default Sidebar;
