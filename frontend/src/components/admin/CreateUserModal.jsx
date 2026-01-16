import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Row, Col, ProgressBar, Alert, InputGroup } from 'react-bootstrap';
import api from '../../services/api';

const steps = ['Personal Info', 'Account Info', 'Department', 'Password'];

const initialState = {
  first_name: '',
  middle_name: '',
  last_name: '',
  phone_number: '',
  position_id: '',
  email: '',
  user_id: '',
  role: 'user',
  access_level: '1',
  status: 'active',
  department_id: '',
  password: '',
  password_confirmation: '',
  send_email: true,
  require_password_change: true
};

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
const CreateUserModal = ({ show, onHide, onSuccess }) => {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(initialState);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
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

  // Custom validation functions
  const validateEmail = (email) => {
    const pattern = /^[\w.-]+@(gmail\.com|yahoo\.com|outlook\.com|[\w\-]+\.edu\.ph)$/i;
    return pattern.test(email);
  };

  const validatePhone = (phone) => {
    const pattern = /^[+0-9]*$/;
    return pattern.test(phone);
  };

  const validateStep = () => {
    if (step === 0) {
      return form.first_name && form.last_name && (!form.phone_number || validatePhone(form.phone_number));
    }
    if (step === 1) {
      return form.email && validateEmail(form.email);
    }
    if (step === 2) return form.department_id && form.position_id;
    if (step === 3) return form.password && form.password_confirmation && form.password === form.password_confirmation && form.password.length >= 8;
    return false;
  };

  const next = () => validateStep() && setStep(s => Math.min(s + 1, steps.length - 1));
  const prev = () => setStep(s => Math.max(s - 1, 0));

  const submit = async () => {
    try {
      setLoading(true);
      setError(null);
      // Convert status to is_active boolean
      const submitData = {
        ...form,
        is_active: form.status === 'active',
        department_id: form.department_id || null,
        position_id: form.position_id || null,
      };
      delete submitData.status;
      await api.post('/user/users', submitData);
      onSuccess();
      onHide();
      setForm(initialState);
      setStep(0);
      setShowPassword(false);
      setShowConfirm(false);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} backdrop="static" size="lg" centered dialogClassName="create-user-modal">
      <Modal.Header closeButton>
        <Modal.Title>Create New User</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <ProgressBar now={(step + 1) * 25} className="mb-3" />
        {error && <Alert variant="danger">{error}</Alert>}

        {/* STEP 1 */}
        {step === 0 && (
          <>
            <h6 className="mb-3">Personal Information</h6>
            <Row className="g-3">
              <Col md={6}>
                <Form.Label>First Name *</Form.Label>
                <Form.Control value={form.first_name} onChange={e => update('first_name', e.target.value)} />
              </Col>
              <Col md={6}>
                <Form.Label>Middle Name</Form.Label>
                <Form.Control value={form.middle_name} onChange={e => update('middle_name', e.target.value)} />
              </Col>
              <Col md={6}>
                <Form.Label>Last Name *</Form.Label>
                <Form.Control value={form.last_name} onChange={e => update('last_name', e.target.value)} />
              </Col>
              <Col md={6}>
                <Form.Label>Phone Number</Form.Label>
                <Form.Control
                  value={form.phone_number}
                  onChange={e => update('phone_number', e.target.value.replace(/[^0-9+]/g, ''))}
                  placeholder="Only + and numbers allowed"
                />
              </Col>
            </Row>
          </>
        )}

        {/* STEP 2 */}
        {step === 1 && (
          <>
            <h6 className="mb-3">Account Information</h6>
            <Row className="g-3">
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
                <Form.Control value={form.user_id} onChange={e => update('user_id', e.target.value)} />
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
                  value={form.status}
                  onChange={v => update('status', v)}
                  options={[
                    { value: 'active', label: 'Active' },
                    { value: 'inactive', label: 'Inactive' }
                  ]}
                />
              </Col>
            </Row>
          </>
        )}

        {/* STEP 3 */}
        {step === 2 && (
          <>
            <h6 className="mb-3">Department Assignment</h6>
            {loadingData ? (
              <div className="text-center py-3">
                <div className="spinner-border spinner-border-sm text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
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

        {/* STEP 4 */}
        {step === 3 && (
          <>
            <h6 className="mb-3">Password Setup</h6>
            <Row className="g-3">
              <Col md={6}>
                <Form.Label>Password * (min 8 characters)</Form.Label>
                <InputGroup>
                  <Form.Control
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => update('password', e.target.value)}
                    isInvalid={form.password && form.password.length < 8}
                  />
                  <Button
                    variant="outline-secondary"
                    onClick={() => setShowPassword(prev => !prev)}
                  >
                    <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                  </Button>
                  <Form.Control.Feedback type="invalid">
                    Password must be at least 8 characters
                  </Form.Control.Feedback>
                </InputGroup>
              </Col>
              <Col md={6}>
                <Form.Label>Confirm Password *</Form.Label>
                <InputGroup>
                  <Form.Control
                    type={showConfirm ? 'text' : 'password'}
                    value={form.password_confirmation}
                    onChange={e => update('password_confirmation', e.target.value)}
                    isInvalid={form.password_confirmation && form.password_confirmation !== form.password}
                  />
                  <Button
                    variant="outline-secondary"
                    onClick={() => setShowConfirm(prev => !prev)}
                  >
                    <i className={`bi ${showConfirm ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                  </Button>
                  <Form.Control.Feedback type="invalid">
                    Passwords must match
                  </Form.Control.Feedback>
                </InputGroup>
              </Col>
              <Col md={12}>
                <Form.Check label="Send credentials via email" checked={form.send_email} onChange={e => update('send_email', e.target.checked)} />
                <Form.Check label="Require password change on first login" checked={form.require_password_change} onChange={e => update('require_password_change', e.target.checked)} />
              </Col>
            </Row>
          </>
        )}
      </Modal.Body>

      <Modal.Footer>
        {step > 0 && <Button variant="secondary" onClick={prev}>Back</Button>}
        {step < 3 && <Button onClick={next} disabled={!validateStep()}>Next</Button>}
        {step === 3 && <Button onClick={submit} disabled={loading || !validateStep()}>{loading ? 'Creating...' : 'Create User'}</Button>}
      </Modal.Footer>
    </Modal>
  );
};

export default CreateUserModal;
