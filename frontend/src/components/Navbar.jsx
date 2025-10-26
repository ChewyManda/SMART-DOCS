

import React, { useState, useEffect } from 'react';
import { Navbar as BSNavbar, Nav, Container, Badge, Dropdown, NavDropdown } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';

const Navbar = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Poll every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/notifications');
      setNotifications(response.data.data.slice(0, 5));
      setUnreadCount(response.data.data.filter(n => !n.is_read).length);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  const markAsRead = async (id) => {
    try {
      await api.post(`/notifications/${id}/read`);
      fetchNotifications();
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.post('/notifications/read-all');
      fetchNotifications();
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  return (
    <BSNavbar 
      expand="lg" 
      className="shadow-sm"
      style={{
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)'
      }}
    >
     <Container>
        <BSNavbar.Brand
          as={Link}
          to="/"
          className="d-flex align-items-center"
        >
          {/* Logo Image */}
          <img
            src="/logo-SMD.png"
            alt="SMART-DOCS Logo"
            height="45"
            className="d-inline-block align-top me-2"
            style={{
              objectFit: 'contain',
              transition: 'transform 0.3s ease'
            }}
            onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
            onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
          />
          {/* Brand Text */}
          <span
            className="fw-bold d-none d-md-inline"
            style={{
              background: 'linear-gradient(45deg, #ff4400, #034b21)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              fontSize: '1.5rem'
            }}
          >
            SMART-DOCS
          </span>
        </BSNavbar.Brand>
        
        <BSNavbar.Toggle aria-controls="basic-navbar-nav" />
        
        <BSNavbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            <Nav.Link as={Link} to="/">
              <i className="bi bi-house-door me-2"></i>
              Dashboard
            </Nav.Link>
            
            <Nav.Link as={Link} to="/document">
              <i className="bi bi-file-earmark-text me-2"></i>
              Documents
            </Nav.Link>
            
            {(user.role === 'admin' || user.role === 'staff') && (
              <>
                <Nav.Link as={Link} to="/upload">
                  <i className="bi bi-cloud-upload me-2"></i>
                  Upload
                </Nav.Link>
                
                <Nav.Link as={Link} to="/users">
                  <i className="bi bi-people me-2"></i>
                  Users
                </Nav.Link>
              </>
            )}
          </Nav>
          
          <Nav>
            {/* Notifications Dropdown */}
            <NavDropdown
              title={
                <>
                  <i className="bi bi-bell fs-5"></i>
                  {unreadCount > 0 && (
                    <Badge 
                      bg="danger" 
                      pill 
                      className="position-absolute top-0 start-100 translate-middle"
                    >
                      {unreadCount}
                    </Badge>
                  )}
                </>
              }
              id="notifications-dropdown"
              align="end"
              className="position-relative"
            >
              <div className="px-3 py-2 border-bottom d-flex justify-content-between align-items-center">
                <strong>Notifications</strong>
                {unreadCount > 0 && (
                  <button 
                    className="btn btn-link btn-sm text-decoration-none p-0"
                    onClick={markAllAsRead}
                  >
                    Mark all as read
                  </button>
                )}
              </div>
              
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {notifications.length > 0 ? (
                  notifications.map((notif) => (
                    <Dropdown.Item
                      key={notif.id}
                      onClick={() => {
                        markAsRead(notif.id);
                        if (notif.data?.document_id) {
                          navigate(`/document/${notif.data.document_id}`);
                        }
                      }}
                      className={!notif.is_read ? 'bg-light' : ''}
                    >
                      <div className="d-flex">
                        <div className="flex-grow-1">
                          <strong className="d-block">{notif.title}</strong>
                          <small className="text-muted">{notif.message}</small>
                          <br />
                          <small className="text-muted">
                            {new Date(notif.created_at).toLocaleString()}
                          </small>
                        </div>
                        {!notif.is_read && (
                          <Badge bg="primary" className="ms-2">New</Badge>
                        )}
                      </div>
                    </Dropdown.Item>
                  ))
                ) : (
                  <div className="px-3 py-4 text-center text-muted">
                    <i className="bi bi-inbox fs-1 d-block mb-2"></i>
                    No notifications
                  </div>
                )}
              </div>
            </NavDropdown>
            
            {/* User Dropdown */}
            <NavDropdown
              title={
                <span>
                  <i className="bi bi-person-circle me-2"></i>
                  {user.name}
                </span>
              }
              id="user-dropdown"
              align="end"
            >
              <Dropdown.ItemText>
                <div>
                  <strong>{user.name}</strong>
                  <br />
                  <small className="text-muted">{user.email}</small>
                  <br />
                <Badge 
  bg={user.role === 'admin' ? 'danger' : user.role === 'staff' ? 'warning' : 'info'}
  className="mt-1"
>
  {user.role ? user.role.toUpperCase() : 'USER'} - Level {user.access_level || '1'}
</Badge>
                </div>
              </Dropdown.ItemText>
              <Dropdown.Divider />
              <Dropdown.Item onClick={onLogout}>
                <i className="bi bi-box-arrow-right me-2"></i>
                Logout
              </Dropdown.Item>
            </NavDropdown>
          </Nav>
        </BSNavbar.Collapse>
      </Container>
    </BSNavbar>
  );
};

export default Navbar;