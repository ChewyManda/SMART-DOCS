import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import {
  Container, Row, Col, Card, Table, Badge,
  Button, Form, Spinner, Modal
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

const Positions = ({ user }) => {
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingPosition, setEditingPosition] = useState(null);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });
  const searchTimeoutRef = useRef(null);

  const fetchPositions = useCallback(async () => {
    try {
      setLoading(true);
      const params = searchTerm && searchTerm.trim() ? { search: searchTerm.trim() } : {};
      const response = await api.get('/positions', { params });
      setPositions(response.data.data || response.data || []);
    } catch (err) {
      console.error('Failed to fetch positions:', err);
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  // Initial fetch on mount
  useEffect(() => {
    fetchPositions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced search effect for search term changes
  useEffect(() => {
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout for debounced search
    searchTimeoutRef.current = setTimeout(() => {
      fetchPositions();
    }, 300); // 300ms debounce

    // Cleanup timeout on unmount
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm, fetchPositions]);

  const handleOpenModal = (position = null) => {
    if (position) {
      setEditingPosition(position);
      setFormData({
        name: position.name || '',
        description: position.description || '',
      });
    } else {
      setEditingPosition(null);
      setFormData({
        name: '',
        description: '',
      });
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const dataToSave = {
        ...formData,
        description: formData.description || null,
      };
      
      if (editingPosition) {
        await api.put(`/positions/${editingPosition.id}`, dataToSave);
      } else {
        await api.post('/positions', dataToSave);
      }
      setShowModal(false);
      fetchPositions();
    } catch (err) {
      console.error('Failed to save position:', err);
      alert(err.response?.data?.message || 'Failed to save position');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (position) => {
    if (!window.confirm(`Are you sure you want to delete "${position.name}"?`)) return;
    try {
      await api.delete(`/positions/${position.id}`);
      fetchPositions();
    } catch (err) {
      console.error('Failed to delete position:', err);
      alert(err.response?.data?.message || 'Failed to delete position');
    }
  };

  const resetFilters = () => {
    setSearchTerm('');
  };

  return (
    <div className="user-dashboard-container">
      <Container>
        {/* HEADER */}
        <Row className="page-header mb-4">
          <Col md={6}>
            <h2 className="dashboard-title fw-bold">Positions</h2>
            <p className="dashboard-subtitle text-secondary">Manage organizational positions</p>
          </Col>
          <Col md={6} className="text-md-end mt-3 mt-md-0">
            <Button
              variant="primary"
              onClick={() => handleOpenModal()}
              className="upload-btn-document-list shadow-sm fw-semibold"
            >
              <i className="bi bi-plus-lg me-2"></i> Add Position
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
                  <Col lg={8} style={{ position: 'relative' }}>
                    <Form.Control
                      type="text"
                      placeholder="Search positions by name or description..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && fetchPositions()}
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
                          fetchPositions();
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

                  {/* SEARCH BUTTON */}
                  <Col lg={2}>
                    <Button
                      className="w-100 custom-btn-search fw-semibold"
                      onClick={fetchPositions}
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

        {/* POSITIONS TABLE */}
        <Row>
          <Col>
            <Card className="custom-card-list">
              <Card.Header className="custom-card-list-header d-flex justify-content-between align-items-center">
                <h5 className="mb-0 fw-bold">Position List</h5>
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
                        <th style={{ width: '250px' }}>Name</th>
                        <th style={{ width: '400px' }}>Description</th>
                        <th style={{ width: '150px' }}>Users</th>
                        <th style={{ width: '150px' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {positions.length > 0 ? (
                        positions.map((position) => (
                          <tr key={position.id}>
                            <td style={{ width: '250px' }}><strong>{position.name}</strong></td>
                            <td style={{ width: '400px' }} className="text-truncate">
                              {position.description ? (
                                <span 
                                  className="text-truncate d-inline-block" 
                                  style={{ maxWidth: '390px' }}
                                  title={position.description}
                                >
                                  {position.description}
                                </span>
                              ) : (
                                <span className="text-muted">-</span>
                              )}
                            </td>
                            <td style={{ width: '150px' }}>
                              <Badge bg="info" className="badge-sm">
                                {position.users_count || 0} users
                              </Badge>
                            </td>
                            <td style={{ width: '150px' }} className="d-flex gap-2">
                              <Button
                                size="sm"
                                variant="outline-primary"
                                className="fw-semibold"
                                onClick={() => handleOpenModal(position)}
                              >
                                <i className="bi bi-pencil me-1"></i> Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="danger"
                                className="fw-semibold"
                                onClick={() => handleDelete(position)}
                              >
                                <i className="bi bi-trash me-1"></i> Delete
                              </Button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="4" className="text-center py-5 text-muted">
                            <i className="bi bi-briefcase fs-1 mb-3"></i>
                            <br />
                            No positions found
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
            {editingPosition ? 'Edit Position' : 'Add Position'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Position Name *</Form.Label>
              <Form.Control
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Software Engineer"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the position"
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
                {editingPosition ? 'Update' : 'Create'}
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
    </div>
  );
};

export default Positions;
