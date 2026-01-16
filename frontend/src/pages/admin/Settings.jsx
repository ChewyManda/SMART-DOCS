import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import '../../css/admin/analytics.css';

const Settings = ({ user }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'general';
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Settings state
  const [settings, setSettings] = useState({
    // General
    system_name: 'SMART-DOCS',
    organization_name: '',
    default_language: 'en',
    timezone: 'UTC',
    // Notifications
    email_notifications: true,
    push_notifications: true,
    document_alerts: true,
    reminder_alerts: true,
    // Security
    session_timeout: 60,
    max_login_attempts: 5,
    two_factor_required: false,
    password_complexity: true,
    // Document Rules
    max_file_size: 25,
    allowed_file_types: 'pdf,doc,docx,xls,xlsx,png,jpg',
    require_classification: true,
    require_recipients: true,
    // Retention Policy
    document_retention: 365,
    auto_archive: true,
    archive_after_days: 90,
    delete_archived_after: 730,
    retain_audit_logs: 1825,
  });

  // Fetch settings on mount
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await api.get('/settings');
      if (response.data.success) {
        setSettings(prev => ({
          ...prev,
          ...response.data.data
        }));
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      setErrorMessage('Failed to load settings. Using defaults.');
      setShowError(true);
      setTimeout(() => setShowError(false), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSwitchChange = (key) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await api.put('/settings', settings);
      if (response.data.success) {
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
        // Update settings with response data
        if (response.data.data) {
          setSettings(prev => ({
            ...prev,
            ...response.data.data
          }));
        }
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      setErrorMessage(error.response?.data?.message || 'Failed to save settings. Please try again.');
      setShowError(true);
      setTimeout(() => setShowError(false), 5000);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Are you sure you want to reset all settings to their default values?')) {
      return;
    }

    try {
      setResetting(true);
      const response = await api.post('/settings/reset');
      if (response.data.success) {
        setSettings(prev => ({
          ...prev,
          ...response.data.data
        }));
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      }
    } catch (error) {
      console.error('Failed to reset settings:', error);
      setErrorMessage(error.response?.data?.message || 'Failed to reset settings. Please try again.');
      setShowError(true);
      setTimeout(() => setShowError(false), 5000);
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return (
      <Container fluid className="admin-dashboard-container">
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
          <Spinner animation="border" variant="primary" />
          <span className="ms-3">Loading settings...</span>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid className="admin-dashboard-container">
      <Row className="page-header mb-4">
        <Col>
          <h2 className="dashboard-title">System Settings</h2>
          <p className="dashboard-subtitle">Configure system-wide settings and preferences</p>
        </Col>
      </Row>

      {showSuccess && (
        <Alert variant="success" dismissible onClose={() => setShowSuccess(false)} className="settings-alert">
          <i className="bi bi-check-circle me-2"></i>
          Settings saved successfully!
        </Alert>
      )}

      {showError && (
        <Alert variant="danger" dismissible onClose={() => setShowError(false)} className="settings-alert">
          <i className="bi bi-exclamation-triangle me-2"></i>
          {errorMessage}
        </Alert>
      )}

      {/* General Settings Tab */}
      {activeTab === 'general' && (
        <Card className="custom-card-recent" style={{ height: 'auto' }}>
          <Card.Header className="custom-card-header-recent">
            <h5>
              <i className="bi bi-sliders me-2"></i>
              General Settings
            </h5>
          </Card.Header>
          <Card.Body className="p-4">
            <Form>
              <Row className="g-3">
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>System Name</Form.Label>
                    <Form.Control
                      type="text"
                      value={settings.system_name}
                      onChange={(e) => handleInputChange('system_name', e.target.value)}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Organization Name</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="Enter organization name"
                      value={settings.organization_name}
                      onChange={(e) => handleInputChange('organization_name', e.target.value)}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Default Language</Form.Label>
                    <Form.Select
                      value={settings.default_language}
                      onChange={(e) => handleInputChange('default_language', e.target.value)}
                    >
                      <option value="en">English</option>
                      <option value="es">Spanish</option>
                      <option value="fr">French</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Timezone</Form.Label>
                    <Form.Select
                      value={settings.timezone}
                      onChange={(e) => handleInputChange('timezone', e.target.value)}
                    >
                      <option value="UTC">UTC</option>
                      <option value="EST">Eastern Time</option>
                      <option value="PST">Pacific Time</option>
                      <option value="GMT">GMT</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>
            </Form>
          </Card.Body>
        </Card>
      )}

      {/* Notifications Settings Tab */}
      {activeTab === 'notifications' && (
        <Card className="custom-card-recent" style={{ height: 'auto' }}>
          <Card.Header className="custom-card-header-recent">
            <h5>
              <i className="bi bi-bell me-2"></i>
              Notification Settings
            </h5>
          </Card.Header>
          <Card.Body className="p-4">
            <Form>
              <Form.Check
                type="switch"
                id="email-notifications"
                label="Enable email notifications"
                checked={settings.email_notifications}
                onChange={() => handleSwitchChange('email_notifications')}
                className="mb-3 settings-switch"
              />
              <Form.Check
                type="switch"
                id="push-notifications"
                label="Enable push notifications"
                checked={settings.push_notifications}
                onChange={() => handleSwitchChange('push_notifications')}
                className="mb-3 settings-switch"
              />
              <Form.Check
                type="switch"
                id="document-alerts"
                label="Document approval alerts"
                checked={settings.document_alerts}
                onChange={() => handleSwitchChange('document_alerts')}
                className="mb-3 settings-switch"
              />
              <Form.Check
                type="switch"
                id="reminder-alerts"
                label="Pending document reminders"
                checked={settings.reminder_alerts}
                onChange={() => handleSwitchChange('reminder_alerts')}
                className="mb-3 settings-switch"
              />
            </Form>
          </Card.Body>
        </Card>
      )}

      {/* Security Settings Tab */}
      {activeTab === 'security' && (
        <Card className="custom-card-recent" style={{ height: 'auto' }}>
          <Card.Header className="custom-card-header-recent">
            <h5>
              <i className="bi bi-shield-lock me-2"></i>
              Security Settings
            </h5>
          </Card.Header>
          <Card.Body className="p-4">
            <Form>
              <Row className="g-3">
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Session Timeout (minutes)</Form.Label>
                    <Form.Control
                      type="number"
                      value={settings.session_timeout}
                      onChange={(e) => handleInputChange('session_timeout', parseInt(e.target.value) || 0)}
                      min="1"
                      max="1440"
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Max Login Attempts</Form.Label>
                    <Form.Control
                      type="number"
                      value={settings.max_login_attempts}
                      onChange={(e) => handleInputChange('max_login_attempts', parseInt(e.target.value) || 0)}
                      min="1"
                      max="10"
                    />
                  </Form.Group>
                </Col>
                <Col md={12}>
                  <Form.Check
                    type="switch"
                    id="two-factor"
                    label="Require two-factor authentication for all users"
                    checked={settings.two_factor_required}
                    onChange={() => handleSwitchChange('two_factor_required')}
                    className="mb-3 settings-switch"
                  />
                  <Form.Check
                    type="switch"
                    id="password-complexity"
                    label="Enforce strong password requirements"
                    checked={settings.password_complexity}
                    onChange={() => handleSwitchChange('password_complexity')}
                    className="mb-3 settings-switch"
                  />
                </Col>
              </Row>
            </Form>
          </Card.Body>
        </Card>
      )}

      {/* Document Rules Tab */}
      {activeTab === 'document-rules' && (
        <Card className="custom-card-recent" style={{ height: 'auto' }}>
          <Card.Header className="custom-card-header-recent">
            <h5>
              <i className="bi bi-file-earmark-ruled me-2"></i>
              Document Rules
            </h5>
          </Card.Header>
          <Card.Body className="p-4">
            <Form>
              <Row className="g-3">
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Max File Size (MB)</Form.Label>
                    <Form.Control
                      type="number"
                      value={settings.max_file_size}
                      onChange={(e) => handleInputChange('max_file_size', parseInt(e.target.value) || 0)}
                      min="1"
                      max="100"
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Allowed File Types</Form.Label>
                    <Form.Control
                      type="text"
                      value={settings.allowed_file_types}
                      onChange={(e) => handleInputChange('allowed_file_types', e.target.value)}
                      placeholder="pdf,doc,docx,xls,xlsx,png,jpg"
                    />
                    <Form.Text className="text-muted">
                      Comma-separated list of file extensions
                    </Form.Text>
                  </Form.Group>
                </Col>
                <Col md={12}>
                  <Form.Check
                    type="switch"
                    id="require-classification"
                    label="Require document classification on upload"
                    checked={settings.require_classification}
                    onChange={() => handleSwitchChange('require_classification')}
                    className="mb-3 settings-switch"
                  />
                  <Form.Check
                    type="switch"
                    id="require-recipients"
                    label="Require at least one recipient on upload"
                    checked={settings.require_recipients}
                    onChange={() => handleSwitchChange('require_recipients')}
                    className="mb-3 settings-switch"
                  />
                </Col>
              </Row>
            </Form>
          </Card.Body>
        </Card>
      )}

      {/* Retention Policy Tab */}
      {activeTab === 'retention' && (
        <Card className="custom-card-recent" style={{ height: 'auto' }}>
          <Card.Header className="custom-card-header-recent">
            <h5>
              <i className="bi bi-archive me-2"></i>
              Retention Policy
            </h5>
          </Card.Header>
          <Card.Body className="p-4">
            <Form>
              <Row className="g-3">
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Document Retention Period (days)</Form.Label>
                    <Form.Control
                      type="number"
                      value={settings.document_retention}
                      onChange={(e) => handleInputChange('document_retention', parseInt(e.target.value) || 0)}
                      min="1"
                      max="3650"
                    />
                    <Form.Text className="text-muted">
                      How long to keep active documents before archiving
                    </Form.Text>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Auto-Archive After (days)</Form.Label>
                    <Form.Control
                      type="number"
                      value={settings.archive_after_days}
                      onChange={(e) => handleInputChange('archive_after_days', parseInt(e.target.value) || 0)}
                      min="1"
                      max="365"
                    />
                    <Form.Text className="text-muted">
                      Days after completion before auto-archiving
                    </Form.Text>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Delete Archived After (days)</Form.Label>
                    <Form.Control
                      type="number"
                      value={settings.delete_archived_after}
                      onChange={(e) => handleInputChange('delete_archived_after', parseInt(e.target.value) || 0)}
                      min="30"
                      max="3650"
                    />
                    <Form.Text className="text-muted">
                      Permanently delete archived documents after this period
                    </Form.Text>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Retain Audit Logs (days)</Form.Label>
                    <Form.Control
                      type="number"
                      value={settings.retain_audit_logs}
                      onChange={(e) => handleInputChange('retain_audit_logs', parseInt(e.target.value) || 0)}
                      min="365"
                      max="3650"
                    />
                    <Form.Text className="text-muted">
                      How long to keep audit trail logs
                    </Form.Text>
                  </Form.Group>
                </Col>
                <Col md={12}>
                  <Form.Check
                    type="switch"
                    id="auto-archive"
                    label="Enable automatic document archiving"
                    checked={settings.auto_archive}
                    onChange={() => handleSwitchChange('auto_archive')}
                    className="mt-3 settings-switch"
                  />
                </Col>
              </Row>
            </Form>
          </Card.Body>
        </Card>
      )}

      <div className="d-flex justify-content-end mt-4">
        <Button
          variant="outline-secondary"
          className="me-2"
          onClick={handleReset}
          disabled={saving || resetting}
        >
          {resetting ? (
            <>
              <Spinner animation="border" size="sm" className="me-2" />
              Resetting...
            </>
          ) : (
            <>
              <i className="bi bi-arrow-counterclockwise me-2"></i>
              Reset to Defaults
            </>
          )}
        </Button>
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={saving || resetting}
        >
          {saving ? (
            <>
              <Spinner animation="border" size="sm" className="me-2" />
              Saving...
            </>
          ) : (
            <>
              <i className="bi bi-check-lg me-2"></i>
              Save Settings
            </>
          )}
        </Button>
      </div>
    </Container>
  );
};

export default Settings;
