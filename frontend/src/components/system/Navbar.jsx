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

  const soundRef = useRef(null);
  const prevUnreadRef = useRef(null);
  const soundEnabledRef = useRef(false);

  useEffect(() => {
    // Unlock audio on first user interaction (required by browsers)
    const unlockSound = () => {
      if (soundRef.current) {
        soundRef.current.load();
        // Also try to play and immediately pause to fully unlock
        soundRef.current.play().then(() => {
          soundRef.current.pause();
          soundRef.current.currentTime = 0;
        }).catch(() => {});
      }
      window.removeEventListener('click', unlockSound);
      window.removeEventListener('touchstart', unlockSound);
    };
    window.addEventListener('click', unlockSound);
    window.addEventListener('touchstart', unlockSound);

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 8000);

    // Enable sound after 3 seconds to prevent playing on page reload
    const soundTimer = setTimeout(() => {
      soundEnabledRef.current = true;
    }, 3000);

    return () => {
      clearInterval(interval);
      clearTimeout(soundTimer);
      window.removeEventListener('click', unlockSound);
      window.removeEventListener('touchstart', unlockSound);
    };
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/notifications');
      const notifList = response.data.data || [];
      // Use the actual unread count from the API (not limited by pagination)
      const newUnreadCount = response.data.unread_count ?? notifList.filter(n => !n.is_read).length;

      // Play sound if count increased and sound is enabled
      if (soundEnabledRef.current && prevUnreadRef.current !== null && newUnreadCount > prevUnreadRef.current) {
        playSound();
      }

      // Update previous count (initialize on first fetch)
      prevUnreadRef.current = newUnreadCount;

      setNotifications(notifList.slice(0, 5));
      setUnreadCount(newUnreadCount);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  };

  const playSound = () => {
    if (!soundRef.current) return;
    soundRef.current.currentTime = 0;
    soundRef.current.play().catch((err) => {
      console.log("Sound play failed:", err);
    });
  };

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
          {/* Show logo for level 2 and below (level 3+ have logo in sidebar) */}
          {user.access_level <= 2 && (
            <BSNavbar.Brand as={Link} to="/dashboard" className="navbar-brand-logo">
              <img src="/logo-SMD.png" alt="SMART-DOCS Logo" className="brand-logo" />
              <span className="brand-text">
                <span className="smart">SMART</span>
                <span className="docs">DOCS</span>
              </span>
            </BSNavbar.Brand>
          )}
          <BSNavbar.Toggle aria-controls="basic-navbar-nav" />
          <BSNavbar.Collapse id="basic-navbar-nav">
            {/* Show navigation links for level 2 and below (level 3+ use sidebar) */}
            {user.access_level <= 2 && (
              <Nav className="me-auto nav-links">
                {/* Dashboard - All levels */}
                <Nav.Link as={Link} to="/dashboard" className={isActive('/dashboard') ? 'active-link' : ''}>
                  <i className="bi bi-house-door me-2"></i> Dashboard
                </Nav.Link>

                {/* Documents - All levels */}
                <Nav.Link as={Link} to="/document" className={isActive('/document') ? 'active-link' : ''}>
                  <i className="bi bi-file-earmark-text me-2"></i> Documents
                </Nav.Link>

                {/* Upload - Level 2+ */}
                {user.access_level >= 2 && (
                  <Nav.Link as={Link} to="/upload" className={isActive('/upload') ? 'active-link' : ''}>
                    <i className="bi bi-cloud-upload me-2"></i> Upload
                  </Nav.Link>
                )}
              </Nav>
            )}

            <Nav className="ms-auto align-items-center">
              {/* Notifications */}
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
                        <div className="text-start">
                          <strong className="d-block mb-1">{notif.title}</strong>
                          <small className="text-muted d-block mb-1">{notif.message}</small>
                          <small className="text-muted">
                            {new Date(notif.created_at).toLocaleString()}
                          </small>
                        </div>
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

              {/* User Dropdown */}
              <NavDropdown
                title={
                  <span className="user-section">
                    {user.profile_picture || user.avatar || user.info?.profile_picture ? (
                      <img 
                        src={user.profile_picture || user.avatar || user.info?.profile_picture} 
                        alt={user.name}
                        style={{ 
                          width: '32px', 
                          height: '32px', 
                          borderRadius: '50%', 
                          objectFit: 'cover',
                          marginRight: '8px'
                        }}
                      />
                    ) : (
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #f97316 0%, #fb923c 100%)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: '8px'
                      }}>
                        <i className="bi bi-person-fill" style={{ fontSize: '16px', color: '#ffffff' }}></i>
                      </div>
                    )}
                    {user.name}
                  </span>
                }
                align="end"
                id="user-dropdown"
              >
                <Dropdown.ItemText>
                  <div className="text-center">
                    {user.profile_picture || user.avatar || user.info?.profile_picture ? (
                      <img 
                        src={user.profile_picture || user.avatar || user.info?.profile_picture} 
                        alt={user.name}
                        style={{ 
                          width: '64px', 
                          height: '64px', 
                          borderRadius: '50%', 
                          objectFit: 'cover'
                        }}
                      />
                    ) : (
                      <div style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #f97316 0%, #fb923c 100%)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <i className="bi bi-person-fill" style={{ fontSize: '32px', color: '#ffffff' }}></i>
                      </div>
                    )}
                  </div>
                  <strong>{user.name}</strong>
                  <small className="text-muted">{user.email}</small>
                  <Badge
                    bg={
                      user.access_level >= 4
                        ? 'danger'
                        : user.access_level >= 3
                        ? 'warning'
                        : user.access_level >= 2
                        ? 'primary'
                        : 'info'
                    }
                  >
                    {user.access_level >= 4 
                      ? 'Super Admin' 
                      : user.access_level >= 3 
                      ? 'Department Head' 
                      : user.access_level >= 2 
                      ? 'Contributor' 
                      : 'Basic User'} • Level {user.access_level || '1'}
                  </Badge>
                </Dropdown.ItemText>

                <Dropdown.Divider />

                <Dropdown.Item onClick={() => navigate('/profile')}>
                  <i className="bi bi-person me-2"></i> My Profile
                </Dropdown.Item>

                <Dropdown.Divider />

                <Dropdown.Item onClick={onLogout} className="logout-btn">
                  <i className="bi bi-box-arrow-right me-2"></i> Logout
                </Dropdown.Item>
              </NavDropdown>
            </Nav>
          </BSNavbar.Collapse>
        </Container>
      </BSNavbar>

      <audio ref={soundRef} preload="auto">
        <source src="/sounds/notification.mp3" type="audio/mpeg" />
      </audio>
    </>
  );
};

export default Navbar;
