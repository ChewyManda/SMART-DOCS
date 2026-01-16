import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Row, Col, Alert, InputGroup, Spinner } from 'react-bootstrap';
import api from '../../services/api';

/* ============================================================
   Custom Dropdown
=============================================================== */
const CUSelect = ({ label, value, options, onChange }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="cu-select-wrapper">
      <label className="cu-label">{label}</label>
      <div
        className={`cu-select-trigger ${open ? 'open' : ''}`}
        onClick={() => setOpen(o => !o)}
      >
        <span>{options.find(o => o.value === value)?.label || 'Select'}</span>
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

/* ============================================================
   Modal Component
=============================================================== */
const EditUserModal = ({ show, onHide, onSuccess, userId, userData }) => {
  const [form, setForm] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    phone_number: '',
    position_id: '',
    email: '',
    user_id: '',
    role: 'user',
    access_level: '1',
    is_active: true,
    department_id: '',
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);
  const [loadingData, setLoadingData] = useState(false);

  const update = (k, v) => setForm({ ...form, [k]: v });

  // Fetch departments and positions when modal opens
  useEffect(() => {
    if (show) {
      fetchDepartmentsAndPositions();
    }
  }, [show]);

  const fetchDepartmentsAndPositions = async () => {
    try {
      setLoadingData(true);
      const [deptRes, posRes] = await Promise.all([
        api.get('/departments', { params: { is_active: true } }), // Only fetch active departments
        api.get('/positions')
      ]);
      setDepartments(deptRes.data.data || []);
      setPositions(posRes.data.data || []);
    } catch (err) {
      console.error('Failed to fetch departments/positions:', err);
    } finally {
      setLoadingData(false);
    }
  };

  // Load user data when modal opens
  useEffect(() => {
    if (show && userId) {
      if (userData) {
        // Use provided user data
        setForm({
          first_name: userData.info?.first_name || '',
          middle_name: userData.info?.middle_name || '',
          last_name: userData.info?.last_name || '',
          phone_number: userData.info?.phone_number || '',
          position_id: userData.info?.position_id?.toString() || '',
          email: userData.email || '',
          user_id: userData.user_id || '',
          role: userData.role || 'user',
          access_level: userData.access_level?.toString() || '1',
          is_active: userData.is_active !== undefined ? userData.is_active : true,
          department_id: userData.info?.department_id?.toString() || '',
        });
        setError(null);
      } else {
        // Fetch user data if not provided
        fetchUserData();
      }
    } else if (!show) {
      // Reset form when modal closes
      setForm({
        first_name: '',
        middle_name: '',
        last_name: '',
        phone_number: '',
        position_id: '',
        email: '',
        user_id: '',
        role: 'user',
        access_level: '1',
        is_active: true,
        department_id: '',
      });
      setError(null);
    }
  }, [show, userId, userData]);

  const fetchUserData = async () => {
    try {
      setFetching(true);
      setError(null);
      // Fetch all users and find the one we need
      const response = await api.get('/user/users', { params: { page: 1, per_page: 1000 } });
      const users = response.data.data || [];
      const user = users.find(u => u.id === userId);
      
      if (user) {
        setForm({
          first_name: user.info?.first_name || '',
          middle_name: user.info?.middle_name || '',
          last_name: user.info?.last_name || '',
          phone_number: user.info?.phone_number || '',
          position_id: user.info?.position_id?.toString() || '',
          email: user.email || '',
          user_id: user.user_id || '',
          role: user.role || 'user',
          access_level: user.access_level?.toString() || '1',
          is_active: user.is_active !== undefined ? user.is_active : true,
          department_id: user.info?.department_id?.toString() || '',
        });
      } else {
        setError('User not found');
      }
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to fetch user data');
    } finally {
      setFetching(false);
    }
  };

  // Custom validation functions
  const validateEmail = (email) => {
    const pattern = /^[\w.-]+@(gmail\.com|yahoo\.com|outlook\.com|[\w\-]+\.edu\.ph)$/i;
    return pattern.test(email);
  };

  const validatePhone = (phone) => {
    const pattern = /^[+0-9]*$/;
    return pattern.test(phone);
  };

  const validateForm = () => {
    return (
      form.first_name &&
      form.last_name &&
      form.email &&
      validateEmail(form.email) &&
      (!form.phone_number || validatePhone(form.phone_number)) &&
      form.department_id &&
      form.position_id
    );
  };

  const submit = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const updateData = {
        first_name: form.first_name,
        middle_name: form.middle_name || null,
        last_name: form.last_name,
        phone_number: form.phone_number || null,
        position_id: form.position_id || null,
        email: form.email,
        user_id: form.user_id || null,
        role: form.role,
        access_level: parseInt(form.access_level),
        is_active: form.is_active,
        department_id: form.department_id || null,
      };

      await api.put(`/user/users/${userId}`, updateData);
      onSuccess();
      onHide();
    } catch (e) {
      setError(e.response?.data?.message || e.response?.data?.error || 'Failed to update user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} backdrop="static" size="lg" centered dialogClassName="edit-user-modal">
      <Modal.Header closeButton>
        <Modal.Title>Edit User</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {fetching ? (
          <div className="text-center py-4">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-2 text-muted">Loading user data...</p>
          </div>
        ) : (
          <>
            {error && <Alert variant="danger" dismissible onClose={() => setError(null)}>{error}</Alert>}

            <h6 className="mb-3">Personal Information</h6>
            <Row className="g-3 mb-4">
              <Col md={6}>
                <Form.Label>First Name *</Form.Label>
                <Form.Control
                  value={form.first_name}
                  onChange={e => update('first_name', e.target.value)}
                />
              </Col>
              <Col md={6}>
                <Form.Label>Middle Name</Form.Label>
                <Form.Control
                  value={form.middle_name}
                  onChange={e => update('middle_name', e.target.value)}
                />
              </Col>
              <Col md={6}>
                <Form.Label>Last Name *</Form.Label>
                <Form.Control
                  value={form.last_name}
                  onChange={e => update('last_name', e.target.value)}
                />
              </Col>
              <Col md={6}>
                <Form.Label>Phone Number</Form.Label>
                <Form.Control
                  value={form.phone_number}
                  onChange={e => update('phone_number', e.target.value.replace(/[^0-9+]/g, ''))}
                  placeholder="Only + and numbers allowed"
                  isInvalid={form.phone_number && !validatePhone(form.phone_number)}
                />
                <Form.Control.Feedback type="invalid">
                  Only + and numbers are allowed
                </Form.Control.Feedback>
              </Col>
            </Row>

            <h6 className="mb-3">Account Information</h6>
            <Row className="g-3 mb-4">
              <Col md={6}>
                <Form.Label>Email Address *</Form.Label>
                <Form.Control
                  type="email"
                  value={form.email}
                  onChange={e => update('email', e.target.value)}
                  placeholder="example@gmail.com"
                  isInvalid={form.email && !validateEmail(form.email)}
                />
                <Form.Control.Feedback type="invalid">
                  Only @gmail.com, @yahoo.com, @outlook.com, or @*.edu.ph addresses are allowed
                </Form.Control.Feedback>
              </Col>
              <Col md={6}>
                <Form.Label>User ID</Form.Label>
                <Form.Control
                  value={form.user_id}
                  onChange={e => update('user_id', e.target.value)}
                />
              </Col>

              <Col md={6}>
                <CUSelect
                  label="Role"
                  value={form.role}
                  onChange={v => update('role', v)}
                  options={[
                    { value: 'user', label: 'User' },
                    { value: 'staff', label: 'Staff' },
                    { value: 'admin', label: 'Admin' }
                  ]}
                />
              </Col>

              <Col md={6}>
                <CUSelect
                  label="User Level"
                  value={form.access_level}
                  onChange={v => update('access_level', v)}
                  options={[
                    { value: '1', label: 'Level 1 - Basic User (View Only)' },
                    { value: '2', label: 'Level 2 - Contributor (+ Upload)' },
                    { value: '3', label: 'Level 3 - Manager (+ Users)' },
                    { value: '4', label: 'Level 4 - Super Admin (Full Access)' }
                  ]}
                />
              </Col>

              <Col md={6}>
                <CUSelect
                  label="Status"
                  value={form.is_active ? 'active' : 'inactive'}
                  onChange={v => update('is_active', v === 'active')}
                  options={[
                    { value: 'active', label: 'Active' },
                    { value: 'inactive', label: 'Inactive' }
                  ]}
                />
              </Col>
            </Row>

            <h6 className="mb-3">Department Assignment</h6>
            {loadingData ? (
              <div className="text-center py-3">
                <Spinner animation="border" size="sm" className="text-primary" />
                <p className="mt-2 text-muted">Loading departments and positions...</p>
              </div>
            ) : (
              <Row className="g-3">
                <Col md={6}>
                  <CUSelect
                    label="Department *"
                    value={form.department_id}
                    onChange={v => update('department_id', v)}
                    options={[
                      { value: '', label: 'Select Department' },
                      ...departments.map(dept => ({
                        value: dept.id.toString(),
                        label: dept.name
                      }))
                    ]}
                  />
                </Col>
                <Col md={6}>
                  <CUSelect
                    label="Position *"
                    value={form.position_id}
                    onChange={v => update('position_id', v)}
                    options={[
                      { value: '', label: 'Select Position' },
                      ...positions.map(pos => ({
                        value: pos.id.toString(),
                        label: pos.name
                      }))
                    ]}
                  />
                </Col>
              </Row>
            )}
          </>
        )}
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onHide} disabled={loading || fetching}>
          Cancel
        </Button>
        <Button
          onClick={submit}
          disabled={loading || fetching || !validateForm()}
          className="user-create-btn"
        >
          {loading ? 'Updating...' : 'Update User'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default EditUserModal;
