import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Row, Col, Card, Table, Badge,
  Button, Form, Spinner, Modal, Alert
} from 'react-bootstrap';
import api from '../../services/api';
import '../../css/admin/user-management.css';

const RolesLevels = ({ user }) => {
  const [roles, setRoles] = useState([]);
  const [accessLevels, setAccessLevels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showLevelModal, setShowLevelModal] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [editingLevel, setEditingLevel] = useState(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('roles');

  const [roleFormData, setRoleFormData] = useState({
    name: '',
    display_name: '',
    description: '',
    permissions: []
  });

  const [levelFormData, setLevelFormData] = useState({
    level: '',
    name: '',
    description: '',
    can_upload: false,
    can_approve: false,
    can_manage_users: false,
    can_access_analytics: false,
    can_access_settings: false
  });

  // Default access levels structure
  const defaultAccessLevels = [
    { level: 1, name: 'Viewer', description: 'Can view documents only', can_upload: false, can_approve: false, can_manage_users: false, can_access_analytics: false, can_access_settings: false },
    { level: 2, name: 'Contributor', description: 'Can view and upload documents', can_upload: true, can_approve: false, can_manage_users: false, can_access_analytics: false, can_access_settings: false },
    { level: 3, name: 'Department Head', description: 'Can manage users and approve documents', can_upload: true, can_approve: true, can_manage_users: true, can_access_analytics: false, can_access_settings: false },
    { level: 4, name: 'Administrator', description: 'Full system access', can_upload: true, can_approve: true, can_manage_users: true, can_access_analytics: true, can_access_settings: true }
  ];

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [rolesRes, levelsRes] = await Promise.all([
        api.get('/roles').catch(() => ({ data: [] })),
        api.get('/access-levels').catch(() => ({ data: defaultAccessLevels }))
      ]);
      setRoles(rolesRes.data.data || rolesRes.data || []);
      setAccessLevels(levelsRes.data.data || levelsRes.data || defaultAccessLevels);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setAccessLevels(defaultAccessLevels);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenRoleModal = (role = null) => {
    if (role) {
      setEditingRole(role);
      setRoleFormData({
        name: role.name,
        display_name: role.display_name || '',
        description: role.description || '',
        permissions: role.permissions || []
      });
    } else {
      setEditingRole(null);
      setRoleFormData({
        name: '',
        display_name: '',
        description: '',
        permissions: []
      });
    }
    setShowRoleModal(true);
  };

  const handleOpenLevelModal = (level = null) => {
    if (level) {
      setEditingLevel(level);
      setLevelFormData({
        level: level.level,
        name: level.name,
        description: level.description || '',
        can_upload: level.can_upload || false,
        can_approve: level.can_approve || false,
        can_manage_users: level.can_manage_users || false,
        can_access_analytics: level.can_access_analytics || false,
        can_access_settings: level.can_access_settings || false
      });
    } else {
      setEditingLevel(null);
      setLevelFormData({
        level: '',
        name: '',
        description: '',
        can_upload: false,
        can_approve: false,
        can_manage_users: false,
        can_access_analytics: false,
        can_access_settings: false
      });
    }
    setShowLevelModal(true);
  };

  const handleSaveRole = async () => {
    try {
      setSaving(true);
      if (editingRole) {
        await api.put(`/roles/${editingRole.id}`, roleFormData);
      } else {
        await api.post('/roles', roleFormData);
      }
      setShowRoleModal(false);
      fetchData();
    } catch (err) {
      console.error('Failed to save role:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveLevel = async () => {
    try {
      setSaving(true);
      if (editingLevel) {
        await api.put(`/access-levels/${editingLevel.level}`, levelFormData);
      } else {
        await api.post('/access-levels', levelFormData);
      }
      setShowLevelModal(false);
      fetchData();
    } catch (err) {
      console.error('Failed to save access level:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRole = async (role) => {
    if (!window.confirm(`Are you sure you want to delete the "${role.display_name || role.name}" role?`)) return;
    try {
      await api.delete(`/roles/${role.id}`);
      fetchData();
    } catch (err) {
      console.error('Failed to delete role:', err);
    }
  };

  return (
    <Container fluid className="admin-dashboard-container">
      {/* Header */}
      <Row className="page-header mb-4">
        <Col>
          <h2 className="dashboard-title">Roles & Access Levels</h2>
          <p className="dashboard-subtitle">Manage user roles and access permissions</p>
        </Col>
      </Row>

      {/* Tabs */}
      <Card className="custom-card-recent mb-4">
        <Card.Body className="p-0">
          <div className="d-flex border-bottom">
            <Button
              variant="link"
              className={`px-4 py-3 text-decoration-none rounded-0 ${activeTab === 'roles' ? 'border-bottom border-primary border-2 text-primary' : 'text-muted'}`}
              onClick={() => setActiveTab('roles')}
            >
              <i className="bi bi-person-badge me-2"></i>
              Roles
            </Button>
            <Button
              variant="link"
              className={`px-4 py-3 text-decoration-none rounded-0 ${activeTab === 'levels' ? 'border-bottom border-primary border-2 text-primary' : 'text-muted'}`}
              onClick={() => setActiveTab('levels')}
            >
              <i className="bi bi-layers me-2"></i>
              Access Levels
            </Button>
          </div>
        </Card.Body>
      </Card>

      {/* Roles Tab */}
      {activeTab === 'roles' && (
        <Card className="custom-card-recent">
          <Card.Header className="custom-card-header-recent d-flex justify-content-between align-items-center">
            <h5 className="mb-0">
              <i className="bi bi-person-badge me-2"></i>
              User Roles
            </h5>
            <Button variant="primary" size="sm" onClick={() => handleOpenRoleModal()}>
              <i className="bi bi-plus-lg me-2"></i>
              Add Role
            </Button>
          </Card.Header>
          <Card.Body className="p-0">
            <div className="table-responsive position-relative">
              {loading && (
                <div className="table-loading-overlay d-flex justify-content-center align-items-center">
                  <Spinner animation="border" variant="primary" />
                </div>
              )}

              <Table className="dashboard-table mb-0">
                <thead>
                  <tr>
                    <th>Role Name</th>
                    <th>Display Name</th>
                    <th>Description</th>
                    <th>Users</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {roles.length > 0 ? (
                    roles.map((role) => (
                      <tr key={role.id}>
                        <td><code>{role.name}</code></td>
                        <td><strong>{role.display_name || role.name}</strong></td>
                        <td className="text-truncate" style={{ maxWidth: '250px' }}>
                          {role.description || '-'}
                        </td>
                        <td>
                          <Badge bg="secondary" className="badge-sm">
                            {role.users_count || 0} users
                          </Badge>
                        </td>
                        <td>
                          <Button
                            size="sm"
                            variant="outline-primary"
                            className="me-2"
                            onClick={() => handleOpenRoleModal(role)}
                          >
                            <i className="bi bi-pencil"></i>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline-danger"
                            onClick={() => handleDeleteRole(role)}
                            disabled={role.name === 'admin' || role.name === 'user'}
                          >
                            <i className="bi bi-trash"></i>
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="text-center py-5 text-muted">
                        <i className="bi bi-person-badge fs-1 mb-3"></i>
                        <br />
                        No roles configured
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </div>
          </Card.Body>
        </Card>
      )}

      {/* Access Levels Tab */}
      {activeTab === 'levels' && (
        <Card className="custom-card-recent">
          <Card.Header className="custom-card-header-recent">
            <h5 className="mb-0">
              <i className="bi bi-layers me-2"></i>
              Access Levels
            </h5>
          </Card.Header>
          <Card.Body className="p-0">
            <Alert variant="info" className="m-3">
              <i className="bi bi-info-circle me-2"></i>
              Access levels determine what features users can access. Higher levels include all permissions from lower levels.
            </Alert>
            
            <div className="table-responsive">
              <Table className="dashboard-table mb-0">
                <thead>
                  <tr>
                    <th>Level</th>
                    <th>Name</th>
                    <th>Description</th>
                    <th>Upload</th>
                    <th>Approve</th>
                    <th>Manage Users</th>
                    <th>Analytics</th>
                    <th>Settings</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {accessLevels.map((level) => (
                    <tr key={level.level}>
                      <td>
                        <Badge bg="primary" className="badge-sm">
                          Level {level.level}
                        </Badge>
                      </td>
                      <td><strong>{level.name}</strong></td>
                      <td className="text-truncate" style={{ maxWidth: '200px' }}>
                        {level.description || '-'}
                      </td>
                      <td>
                        <i className={`bi ${level.can_upload ? 'bi-check-circle-fill text-success' : 'bi-x-circle text-muted'}`}></i>
                      </td>
                      <td>
                        <i className={`bi ${level.can_approve ? 'bi-check-circle-fill text-success' : 'bi-x-circle text-muted'}`}></i>
                      </td>
                      <td>
                        <i className={`bi ${level.can_manage_users ? 'bi-check-circle-fill text-success' : 'bi-x-circle text-muted'}`}></i>
                      </td>
                      <td>
                        <i className={`bi ${level.can_access_analytics ? 'bi-check-circle-fill text-success' : 'bi-x-circle text-muted'}`}></i>
                      </td>
                      <td>
                        <i className={`bi ${level.can_access_settings ? 'bi-check-circle-fill text-success' : 'bi-x-circle text-muted'}`}></i>
                      </td>
                      <td>
                        <Button
                          size="sm"
                          variant="outline-primary"
                          onClick={() => handleOpenLevelModal(level)}
                        >
                          <i className="bi bi-pencil"></i>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </Card.Body>
        </Card>
      )}

      {/* Role Modal */}
      <Modal show={showRoleModal} onHide={() => setShowRoleModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>{editingRole ? 'Edit Role' : 'Add Role'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Role Name (slug) *</Form.Label>
              <Form.Control
                type="text"
                value={roleFormData.name}
                onChange={(e) => setRoleFormData({ ...roleFormData, name: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                placeholder="e.g., department_head"
                disabled={editingRole}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Display Name *</Form.Label>
              <Form.Control
                type="text"
                value={roleFormData.display_name}
                onChange={(e) => setRoleFormData({ ...roleFormData, display_name: e.target.value })}
                placeholder="e.g., Department Head"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={roleFormData.description}
                onChange={(e) => setRoleFormData({ ...roleFormData, description: e.target.value })}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRoleModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleSaveRole} disabled={saving || !roleFormData.name}>
            {saving ? <Spinner size="sm" className="me-2" /> : <i className="bi bi-check-lg me-2"></i>}
            {editingRole ? 'Update' : 'Create'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Access Level Modal */}
      <Modal show={showLevelModal} onHide={() => setShowLevelModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Edit Access Level</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Level</Form.Label>
              <Form.Control type="text" value={`Level ${levelFormData.level}`} disabled />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Name *</Form.Label>
              <Form.Control
                type="text"
                value={levelFormData.name}
                onChange={(e) => setLevelFormData({ ...levelFormData, name: e.target.value })}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={levelFormData.description}
                onChange={(e) => setLevelFormData({ ...levelFormData, description: e.target.value })}
              />
            </Form.Group>
            <h6 className="mb-3">Permissions</h6>
            <Form.Check
              type="switch"
              label="Can Upload Documents"
              checked={levelFormData.can_upload}
              onChange={(e) => setLevelFormData({ ...levelFormData, can_upload: e.target.checked })}
              className="mb-2"
            />
            <Form.Check
              type="switch"
              label="Can Approve Documents"
              checked={levelFormData.can_approve}
              onChange={(e) => setLevelFormData({ ...levelFormData, can_approve: e.target.checked })}
              className="mb-2"
            />
            <Form.Check
              type="switch"
              label="Can Manage Users"
              checked={levelFormData.can_manage_users}
              onChange={(e) => setLevelFormData({ ...levelFormData, can_manage_users: e.target.checked })}
              className="mb-2"
            />
            <Form.Check
              type="switch"
              label="Can Access Analytics"
              checked={levelFormData.can_access_analytics}
              onChange={(e) => setLevelFormData({ ...levelFormData, can_access_analytics: e.target.checked })}
              className="mb-2"
            />
            <Form.Check
              type="switch"
              label="Can Access Settings"
              checked={levelFormData.can_access_settings}
              onChange={(e) => setLevelFormData({ ...levelFormData, can_access_settings: e.target.checked })}
            />
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowLevelModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleSaveLevel} disabled={saving}>
            {saving ? <Spinner size="sm" className="me-2" /> : <i className="bi bi-check-lg me-2"></i>}
            Update
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default RolesLevels;
