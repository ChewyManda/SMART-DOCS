import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import {
  Container, Row, Col, Card, Table, Badge,
  Button, Form, Spinner, Modal, Dropdown
} from 'react-bootstrap';
import api from '../../services/api';
import '../../css/admin/user-management.css';
import '../../css/admin/admin-dashboard.css';
import '../../css/components/create-user-modal.css';

/* ============================================================
   Custom Dropdown Component (like Create User Modal)
=============================================================== */
const FilterSelect = ({ label, value, options, onChange, placeholder = "Select" }) => {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  return (
    <div className="cu-select-wrapper" ref={wrapperRef}>
      {label && <label className="cu-label">{label}</label>}
      <div
        className={`cu-select-trigger ${open ? 'open' : ''}`}
        onClick={() => setOpen(o => !o)}
        style={{ height: '40px', fontSize: '0.95rem' }}
      >
        <span>{options.find(o => o.value === value)?.label || placeholder}</span>
        <span className="cu-select-arrow">▾</span>
      </div>
      {open && (
        <div className="cu-select-options">
          {options.map(opt => (
            <div
              key={opt.value}
              className={`cu-select-option ${opt.value === value ? 'active' : ''}`}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const Departments = ({ user }) => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'active', 'inactive'
  
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    head_user_id: '',
    is_active: true
  });

  const [users, setUsers] = useState([]);
  const searchTimeoutRef = useRef(null);

  const fetchDepartments = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        ...(searchTerm && searchTerm.trim() ? { search: searchTerm.trim() } : {}),
        ...(filterStatus !== 'all' ? { is_active: filterStatus === 'active' } : {})
      };
      const response = await api.get('/departments', { params });
      setDepartments(response.data.data || response.data || []);
    } catch (err) {
      console.error('Failed to fetch departments:', err);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, filterStatus]);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/user/users', { params: { per_page: 1000 } });
      // Filter to only active users and load their info relationships
      const allUsers = response.data.data || [];
      setUsers(allUsers.filter(u => u.is_active !== false));
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Initial fetch on mount
  useEffect(() => {
    fetchDepartments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced search effect for search term and filter changes
  useEffect(() => {
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout for debounced search
    searchTimeoutRef.current = setTimeout(() => {
      fetchDepartments();
    }, 300); // 300ms debounce

    // Cleanup timeout on unmount
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm, filterStatus, fetchDepartments]);

  const handleOpenModal = (dept = null) => {
    if (dept) {
      setEditingDept(dept);
      setFormData({
        name: dept.name,
        code: dept.code || '',
        description: dept.description || '',
        head_user_id: dept.head_user_id ? dept.head_user_id.toString() : '',
        is_active: dept.is_active !== false
      });
    } else {
      setEditingDept(null);
      setFormData({
        name: '',
        code: '',
        description: '',
        head_user_id: '',
        is_active: true
      });
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      // Convert empty string to null for head_user_id
      const dataToSave = {
        ...formData,
        head_user_id: formData.head_user_id || null,
        code: formData.code || null,
      };
      
      if (editingDept) {
        await api.put(`/departments/${editingDept.id}`, dataToSave);
      } else {
        await api.post('/departments', dataToSave);
      }
      setShowModal(false);
      fetchDepartments();
    } catch (err) {
      console.error('Failed to save department:', err);
      alert(err.response?.data?.message || 'Failed to save department');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (dept) => {
    if (!window.confirm(`Are you sure you want to delete "${dept.name}"?`)) return;
    try {
      await api.delete(`/departments/${dept.id}`);
      fetchDepartments();
    } catch (err) {
      console.error('Failed to delete department:', err);
    }
  };

  const resetFilters = () => {
    setSearchTerm('');
    setFilterStatus('all');
  };

  return (
    <div className="user-dashboard-container">
      <Container>
        {/* HEADER */}
        <Row className="page-header mb-4">
          <Col md={6}>
            <h2 className="dashboard-title fw-bold">Departments</h2>
            <p className="dashboard-subtitle text-secondary">Manage organizational departments</p>
          </Col>
          <Col md={6} className="text-md-end mt-3 mt-md-0">
            <Button
              variant="primary"
              onClick={() => handleOpenModal()}
              className="upload-btn-document-list shadow-sm fw-semibold"
            >
              <i className="bi bi-plus-lg me-2"></i> Add Department
            </Button>
          </Col>
        </Row>

        {/* SEARCH + FILTERS */}
        <Row className="mb-4">
          <Col>
            <Card className="custom-card-search">
              <Card.Body>
                <Row className="g-3 align-items-center">
                  {/* SEARCH */}
                  <Col lg={6} style={{ position: 'relative' }}>
                    <Form.Control
                      type="text"
                      placeholder="Search departments by name, code, or description..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && fetchDepartments()}
                      style={{ 
                        height: '40px', 
                        fontSize: '0.95rem',
                        paddingRight: searchTerm ? '45px' : '12px'
                      }}
                    />
                    {searchTerm && (
                      <button
                        type="button"
                        className="search-clear-btn"
                        onClick={() => {
                          setSearchTerm('');
                          fetchDepartments();
                        }}
                        style={{
                          position: 'absolute',
                          right: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          border: 'none',
                          background: 'transparent',
                          padding: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.2rem',
                          color: '#64748b',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          borderRadius: '6px',
                          width: '32px',
                          height: '32px',
                          zIndex: 10
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.color = '#FF6B00';
                          e.target.style.backgroundColor = 'rgba(255, 107, 0, 0.08)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.color = '#64748b';
                          e.target.style.backgroundColor = 'transparent';
                        }}
                      >
                        <i className="bi bi-x-lg"></i>
                      </button>
                    )}
                  </Col>

                  {/* STATUS FILTER */}
                  <Col lg={2}>
                    <FilterSelect
                      value={filterStatus}
                      onChange={(value) => setFilterStatus(value)}
                      options={[
                        { value: 'all', label: 'All Status' },
                        { value: 'active', label: 'Active Only' },
                        { value: 'inactive', label: 'Inactive Only' }
                      ]}
                      placeholder="All Status"
                    />
                  </Col>

                  {/* SEARCH BUTTON */}
                  <Col lg={2}>
                    <Button
                      className="w-100 custom-btn-search fw-semibold"
                      onClick={fetchDepartments}
                      style={{ height: '40px', fontSize: '0.95rem' }}
                    >
                      <i className="bi bi-search me-1"></i> Search
                    </Button>
                  </Col>

                  {/* RESET FILTERS */}
                  <Col lg={2} className="text-end">
                    <Button
                      variant="outline-secondary"
                      className="w-100 fw-semibold"
                      onClick={resetFilters}
                      style={{ height: '40px', fontSize: '0.95rem' }}
                    >
                      <i className="bi bi-arrow-counterclockwise me-1"></i> Reset
                    </Button>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* DEPARTMENTS TABLE */}
        <Row>
          <Col>
            <Card className="custom-card-list">
              <Card.Header className="custom-card-list-header d-flex justify-content-between align-items-center">
                <h5 className="mb-0 fw-bold">Department List</h5>
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
                        <th style={{ width: '200px' }}>Name</th>
                        <th style={{ width: '120px' }}>Code</th>
                        <th style={{ width: '250px' }}>Description</th>
                        <th style={{ width: '200px' }}>Department Head</th>
                        <th style={{ width: '120px' }}>Members</th>
                        <th style={{ width: '120px' }}>Status</th>
                        <th style={{ width: '150px' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {departments.length > 0 ? (
                        departments.map((dept) => (
                          <tr key={dept.id}>
                            <td style={{ width: '200px' }}><strong>{dept.name}</strong></td>
                            <td style={{ width: '120px' }}><code className="id-big">{dept.code || '-'}</code></td>
                            <td style={{ width: '250px' }} className="text-truncate">
                              {dept.description ? (
                                <span 
                                  className="text-truncate d-inline-block" 
                                  style={{ maxWidth: '240px' }}
                                  title={dept.description}
                                >
                                  {dept.description}
                                </span>
                              ) : (
                                <span className="text-muted">-</span>
                              )}
                            </td>
                            <td style={{ width: '200px' }}>
                              {dept.head ? (
                                <span>
                                  {dept.head.name || dept.head.info?.first_name + ' ' + dept.head.info?.last_name}
                                  {dept.head.email && <small className="text-muted d-block">{dept.head.email}</small>}
                                </span>
                              ) : (
                                <span className="text-muted">-</span>
                              )}
                            </td>
                            <td style={{ width: '120px' }}>
                              <Badge bg="secondary" className="badge-sm">
                                {dept.users_count || 0} members
                              </Badge>
                            </td>
                            <td style={{ width: '120px' }}>
                              <Badge bg={dept.is_active !== false ? 'success' : 'secondary'} className="badge-sm">
                                {dept.is_active !== false ? 'Active' : 'Inactive'}
                              </Badge>
                            </td>
                            <td style={{ width: '150px' }} className="d-flex gap-2">
                              <Button
                                size="sm"
                                variant="outline-primary"
                                className="fw-semibold"
                                onClick={() => handleOpenModal(dept)}
                              >
                                <i className="bi bi-pencil me-1"></i> Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="danger"
                                className="fw-semibold"
                                onClick={() => handleDelete(dept)}
                              >
                                <i className="bi bi-trash me-1"></i> Delete
                              </Button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="7" className="text-center py-5 text-muted">
                            <i className="bi bi-building fs-1 mb-3"></i>
                            <br />
                            No departments found
                          </td>
                        </tr>
                      )}
                      </tbody>
                  </Table>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

      {/* Add/Edit Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            {editingDept ? 'Edit Department' : 'Add Department'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Department Name *</Form.Label>
              <Form.Control
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Human Resources"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Department Code</Form.Label>
              <Form.Control
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="e.g., HR"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the department"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Department Head</Form.Label>
              <Form.Select
                value={formData.head_user_id || ''}
                onChange={(e) => setFormData({ ...formData, head_user_id: e.target.value || null })}
              >
                <option value="">Select a user...</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} {u.email ? `(${u.email})` : ''}
                  </option>
                ))}
              </Form.Select>
              <Form.Text className="text-muted">
                Select a user to assign as the department head
              </Form.Text>
            </Form.Group>
            <Form.Group>
              <Form.Check
                type="switch"
                label="Active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={saving || !formData.name}>
            {saving ? (
              <>
                <Spinner size="sm" className="me-2" />
                Saving...
              </>
            ) : (
              <>
                <i className="bi bi-check-lg me-2"></i>
                {editingDept ? 'Update' : 'Create'}
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
    </div>
  );
};

export default Departments;
