import React, { useState, useEffect, useRef } from 'react';
import { Navbar as BSNavbar, Nav, Container, Badge, Dropdown, NavDropdown } from 'react-bootstrap';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import api from '../../services/api';
import '../../css/system/navbar.css';

const Navbar = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // === SOUND SETUP ===
  const soundRef = useRef(null);
  const prevUnreadRef = useRef(null); // Start as null to ignore first fetch

  // === INITIAL SETUP ===
  useEffect(() => {
    const unlockSound = () => {
      if (soundRef.current) soundRef.current.load();
      window.removeEventListener('click', unlockSound);
    };
    window.addEventListener('click', unlockSound);

    fetchNotifications(); // Initial fetch
    const interval = setInterval(fetchNotifications, 8000); // Poll every 8 sec

    return () => {
      clearInterval(interval);
      window.removeEventListener('click', unlockSound);
    };
  }, []);

  // === FETCH NOTIFICATIONS ===
  const fetchNotifications = async () => {
    try {
      const response = await api.get('/notifications');
      const notifList = response.data.data || [];

      const unread = notifList.filter(n => !n.is_read).length;

      setNotifications(notifList.slice(0, 5));
      setUnreadCount(unread);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  };

  // === PLAY SOUND WHEN UNREAD COUNT INCREASES ===
  useEffect(() => {
    if (prevUnreadRef.current !== null && unreadCount > prevUnreadRef.current) {
      playSound();
    }
    prevUnreadRef.current = unreadCount; // Always update after check
  }, [unreadCount]);

  const playSound = () => {
    if (!soundRef.current) return;
    soundRef.current.currentTime = 0;
    soundRef.current.play().catch(err => {
      console.warn("Audio blocked until user interaction:", err);
    });
  };

  // === MARK NOTIFICATIONS AS READ ===
  const markAsRead = async (id) => {
    try {
      await api.post(`/notifications/${id}/read`);
      fetchNotifications();
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.post('/notifications/read-all');
      fetchNotifications();
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  return (
    <>
      <BSNavbar expand="lg" className="smart-navbar shadow-sm">
        <Container>
          <BSNavbar.Brand as={Link} to="/dashboard" className="brand-wrapper">
            <img
              src="/logo-SMD.png"
              alt="SMART-DOCS Logo"
              height="45"
              className="brand-logo"
            />
            <span className="brand-text">
              <span className="smart">SMART</span>
              <span className="docs">DOCS</span>
            </span>
          </BSNavbar.Brand>

          <BSNavbar.Toggle aria-controls="basic-navbar-nav" />
          <BSNavbar.Collapse id="basic-navbar-nav">
            <Nav className="me-auto nav-links">
              <Nav.Link
                as={Link}
                to="/dashboard"
                className={isActive('/dashboard') ? 'active-link' : ''}
              >
                <i className="bi bi-house-door me-2"></i> Dashboard
              </Nav.Link>

              <Nav.Link
                as={Link}
                to="/document"
                className={isActive('/document') ? 'active-link' : ''}
              >
                <i className="bi bi-file-earmark-text me-2"></i> Documents
              </Nav.Link>

              {(user.role === 'admin' || user.role === 'staff') && (
                <>
                  <Nav.Link
                    as={Link}
                    to="/upload"
                    className={isActive('/upload') ? 'active-link' : ''}
                  >
                    <i className="bi bi-cloud-upload me-2"></i> Upload
                  </Nav.Link>

                  <Nav.Link
                    as={Link}
                    to="/users"
                    className={isActive('/users') ? 'active-link' : ''}
                  >
                    <i className="bi bi-people me-2"></i> Users
                  </Nav.Link>
                </>
              )}
            </Nav>

            <Nav className="align-items-center">
              {/* NOTIFICATIONS */}
              <NavDropdown
                title={
                  <span className="notif-icon-wrapper">
                    <i className="bi bi-bell fs-5 notif-icon"></i>
                    {unreadCount > 0 && (
                      <Badge pill bg="danger" className="notif-badge">
                        {unreadCount}
                      </Badge>
                    )}
                  </span>
                }
                align="end"
                id="notifications-dropdown"
              >
                <div className="notif-header">
                  <strong>Notifications</strong>
                  {unreadCount > 0 && (
                    <button className="notif-readall" onClick={markAllAsRead}>
                      Mark all as read
                    </button>
                  )}
                </div>

                <div className="notif-body">
                  {notifications.length > 0 ? (
                    notifications.map((notif) => (
                      <Dropdown.Item
                        key={notif.id}
                        className={`notif-item ${!notif.is_read ? 'unread' : ''}`}
                        onClick={() => {
                          markAsRead(notif.id);
                          if (notif?.data?.document_id) {
                            navigate(`/document/${notif.data.document_id}`);
                          }
                        }}
                      >
                        <strong className="d-block">{notif.title}</strong>
                        <small className="text-muted">{notif.message}</small>
                        <br />
                        <small className="text-muted">
                          {new Date(notif.created_at).toLocaleString()}
                        </small>
                      </Dropdown.Item>
                    ))
                  ) : (
                    <div className="notif-empty">
                      <i className="bi bi-inbox fs-1 d-block mb-2"></i>
                      No notifications
                    </div>
                  )}
                </div>
              </NavDropdown>

              {/* USER DROPDOWN */}
              <NavDropdown
                title={
                  <span className="user-section">
                    <i className="bi bi-person-circle me-2"></i>
                    {user.name}
                  </span>
                }
                align="end"
                id="user-dropdown"
              >
                <Dropdown.ItemText>
                  <strong>{user.name}</strong>
                  <br />
                  <small className="text-muted">{user.email}</small>
                  <br />
                  <Badge
                    bg={
                      user.role === 'admin'
                        ? 'danger'
                        : user.role === 'staff'
                        ? 'warning'
                        : 'info'
                    }
                    className="mt-2"
                  >
                    {user.role.toUpperCase()} • Level {user.access_level || '1'}
                  </Badge>
                </Dropdown.ItemText>

                <Dropdown.Divider />

                <Dropdown.Item onClick={onLogout} className="logout-btn">
                  <i className="bi bi-box-arrow-right me-2"></i> Logout
                </Dropdown.Item>
              </NavDropdown>
            </Nav>
          </BSNavbar.Collapse>
        </Container>
      </BSNavbar>

      {/* HIDDEN AUDIO TAG */}
      <audio ref={soundRef} preload="auto">
        <source src="/sounds/notification.mp3" type="audio/mpeg" />
      </audio>
    </>
  );
};

export default Navbar;
