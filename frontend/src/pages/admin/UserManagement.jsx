// ====================================
// USER MANAGEMENT COMPONENT
// File: smartdoc-frontend/src/components/UserManagement.js
// ====================================

import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Modal, Form, Badge, Alert } from 'react-bootstrap';
import api from '../../services/api';

const UserManagement = ({ user }) => {
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    user_id: '',
    password: '',
    access_level: '1',
    role: 'user',
    department: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/admin/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const handleShowModal = (userToEdit = null) => {
    if (userToEdit) {
      setEditingUser(userToEdit);
      setFormData({
        name: userToEdit.name,
        email: userToEdit.email,
        user_id: userToEdit.user_id,
        password: '',
        access_level: userToEdit.access_level,
        role: userToEdit.role,
        department: userToEdit.department || '',
      });
    } else {
      setEditingUser(null);
      setFormData({
        name: '',
        email: '',
        user_id: '',
        password: '',
        access_level: '1',
        role: 'user',
        department: '',
      });
    }
    setError('');
    setSuccess('');
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingUser(null);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (editingUser) {
        await api.put(`/admin/users/${editingUser.id}`, formData);
        setSuccess('User updated successfully!');
      } else {
        await api.post('/admin/users', formData);
        setSuccess('User created successfully!');
      }
      
      fetchUsers();
      setTimeout(() => {
        handleCloseModal();
        setSuccess('');
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save user');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (userId, currentStatus) => {
    try {
      await api.put(`/admin/users/${userId}`, {
        is_active: !currentStatus,
      });
      fetchUsers();
    } catch (error) {
      console.error('Failed to toggle user status:', error);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      await api.delete(`/admin/users/${userId}`);
      fetchUsers();
    } catch (error) {
      console.error('Failed to delete user:', error);
      alert('Failed to delete user. Only admins can delete users.');
    }
  };

  const getRoleBadge = (role) => {
    const variants = {
      admin: 'danger',
      staff: 'warning',
      user: 'info',
    };
    return <Badge bg={variants[role]}>{role.toUpperCase()}</Badge>;
  };

  return (
    <Container className="mt-4 mb-5">
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 className="fw-bold">User Management</h2>
              <p className="text-muted">Manage system users and their access levels</p>
            </div>
            <Button
              variant="primary"
              onClick={() => handleShowModal()}
              style={{
                background: 'linear-gradient(45deg, #ff4400, #e0681e)',
                border: 'none'
              }}
            >
              <i className="bi bi-plus-lg me-2"></i>
              Create User
            </Button>
          </div>
        </Col>
      </Row>

      <Row>
        <Col>
          <Card className="border-0 shadow-sm">
            <Card.Body className="p-0">
              <Table hover responsive className="mb-0">
                <thead className="bg-light">
                  <tr>
                    <th>User ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Department</th>
                    <th>Role</th>
                    <th>Access Level</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td><code>{u.user_id}</code></td>
                      <td>{u.name}</td>
                      <td>{u.email}</td>
                      <td>{u.department || '-'}</td>
                      <td>{getRoleBadge(u.role)}</td>
                      <td>
                        <Badge bg="secondary">Level {u.access_level}</Badge>
                      </td>
                      <td>
                        <Badge bg={u.is_active ? 'success' : 'danger'}>
                          {u.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td>
                        <Button
                          variant="outline-primary"
                          size="sm"
                          className="me-2"
                          onClick={() => handleShowModal(u)}
                        >
                          <i className="bi bi-pencil"></i>
                        </Button>
                        <Button
                          variant={u.is_active ? 'outline-warning' : 'outline-success'}
                          size="sm"
                          className="me-2"
                          onClick={() => handleToggleStatus(u.id, u.is_active)}
                        >
                          <i className={`bi bi-${u.is_active ? 'pause' : 'play'}`}></i>
                        </Button>
                        {user.role === 'admin' && (
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => handleDeleteUser(u.id)}
                          >
                            <i className="bi bi-trash"></i>
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Create/Edit User Modal */}
      <Modal show={showModal} onHide={handleCloseModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {editingUser ? 'Edit User' : 'Create New User'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          {success && <Alert variant="success">{success}</Alert>}

          <Form onSubmit={handleSubmit}>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Full Name <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Email <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>User ID <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="text"
                    name="user_id"
                    value={formData.user_id}
                    onChange={handleChange}
                    required
                    disabled={editingUser}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>
                    Password {!editingUser && <span className="text-danger">*</span>}
                  </Form.Label>
                  <Form.Control
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required={!editingUser}
                    placeholder={editingUser ? 'Leave blank to keep current' : ''}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Role <span className="text-danger">*</span></Form.Label>
                  <Form.Select
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    required
                  >
                    <option value="user">User</option>
                    <option value="staff">Staff</option>
                    {user.role === 'admin' && <option value="admin">Admin</option>}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Access Level <span className="text-danger">*</span></Form.Label>
                  <Form.Select
                    name="access_level"
                    value={formData.access_level}
                    onChange={handleChange}
                    required
                  >
                    <option value="1">Level 1 - Basic Access</option>
                    <option value="2">Level 2 - Department Access</option>
                    <option value="3">Level 3 - Administrative Access</option>
                    <option value="4">Level 4 - Full System Access</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Department</Form.Label>
              <Form.Control
                type="text"
                name="department"
                value={formData.department}
                onChange={handleChange}
                placeholder="e.g., Registrar Office, IT Department"
              />
            </Form.Group>

            <div className="d-grid gap-2 d-md-flex justify-content-md-end">
              <Button variant="outline-secondary" onClick={handleCloseModal}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={loading}
                style={{
                  background: 'linear-gradient(45deg, #ff4400, #e0681e)',
                  border: 'none'
                }}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <i className="bi bi-check-lg me-2"></i>
                    {editingUser ? 'Update User' : 'Create User'}
                  </>
                )}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </Container>
  );
};

export default UserManagement;