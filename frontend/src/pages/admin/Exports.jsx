import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Form, Spinner, Button, Alert } from 'react-bootstrap';
import api from '../../services/api';
import '../../css/admin/analytics.css';

const Exports = ({ user }) => {
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exports, setExports] = useState([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [filters, setFilters] = useState({
    export_type: 'documents',
    format: 'csv',
    date_from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    date_to: new Date().toISOString().split('T')[0],
    status: 'all',
    classification: 'all',
  });

  useEffect(() => {
    fetchExportHistory();
  }, []);

  const fetchExportHistory = async () => {
    try {
      setLoading(true);
      const response = await api.get('/exports/history');
      setExports(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch export history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const response = await api.post('/exports/generate', filters, {
        responseType: 'blob',
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const filename = `${filters.export_type}_export_${new Date().toISOString().split('T')[0]}.${filters.format}`;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      fetchExportHistory();
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExporting(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getStatusBadge = (status) => {
    const variants = {
      completed: 'success',
      processing: 'warning',
      failed: 'danger',
      pending: 'secondary',
    };
    return (
      <Badge bg={variants[status] || 'secondary'} className="badge-sm">
        {status?.charAt(0).toUpperCase() + status?.slice(1) || 'Unknown'}
      </Badge>
    );
  };

  const exportTypes = [
    { value: 'documents', label: 'Documents', icon: 'bi-file-earmark-text' },
    { value: 'users', label: 'Users', icon: 'bi-people' },
    { value: 'workflows', label: 'Workflows', icon: 'bi-diagram-3' },
    { value: 'analytics', label: 'Analytics Summary', icon: 'bi-graph-up' },
    { value: 'audit_logs', label: 'Audit Logs', icon: 'bi-clock-history' },
  ];

  return (
    <Container fluid className="admin-dashboard-container">
      <Row className="page-header mb-4">
        <Col>
          <h2 className="dashboard-title">Data Exports</h2>
          <p className="dashboard-subtitle">Export data for reporting and analysis</p>
        </Col>
      </Row>

      {showSuccess && (
        <Alert variant="success" dismissible onClose={() => setShowSuccess(false)}>
          <i className="bi bi-check-circle me-2"></i>
          Export generated successfully! Your download should start automatically.
        </Alert>
      )}

      {/* Export Configuration */}
      <Card className="custom-card-recent mb-4">
        <Card.Header className="custom-card-header-recent">
          <h5>
            <i className="bi bi-download me-2"></i>
            Generate Export
          </h5>
        </Card.Header>
        <Card.Body>
          <Row className="mb-4">
            <Col md={12}>
              <Form.Label className="fw-bold mb-3">Select Export Type</Form.Label>
              <div className="d-flex flex-wrap gap-2">
                {exportTypes.map((type) => (
                  <Button
                    key={type.value}
                    variant={filters.export_type === type.value ? 'primary' : 'outline-secondary'}
                    onClick={() => setFilters({ ...filters, export_type: type.value })}
                    className="d-flex align-items-center"
                  >
                    <i className={`bi ${type.icon} me-2`}></i>
                    {type.label}
                  </Button>
                ))}
              </div>
            </Col>
          </Row>

          <Row className="g-3">
            <Col md={3}>
              <Form.Group>
                <Form.Label>Format</Form.Label>
                <Form.Select
                  value={filters.format}
                  onChange={(e) => setFilters({ ...filters, format: e.target.value })}
                >
                  <option value="csv">CSV (.csv)</option>
                  <option value="xlsx">Excel (.xlsx)</option>
                  <option value="pdf">PDF (.pdf)</option>
                  <option value="json">JSON (.json)</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Date From</Form.Label>
                <Form.Control
                  type="date"
                  value={filters.date_from}
                  onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Date To</Form.Label>
                <Form.Control
                  type="date"
                  value={filters.date_to}
                  onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Status Filter</Form.Label>
                <Form.Select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>

          {filters.export_type === 'documents' && (
            <Row className="mt-3">
              <Col md={3}>
                <Form.Group>
                  <Form.Label>Classification</Form.Label>
                  <Form.Select
                    value={filters.classification}
                    onChange={(e) => setFilters({ ...filters, classification: e.target.value })}
                  >
                    <option value="all">All Classifications</option>
                    <option value="invoice">Invoice</option>
                    <option value="contract">Contract</option>
                    <option value="report">Report</option>
                    <option value="form">Form</option>
                    <option value="other">Other</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
          )}

          <Row className="mt-4">
            <Col>
              <Button
                variant="primary"
                size="lg"
                onClick={handleExport}
                disabled={exporting}
              >
                {exporting ? (
                  <>
                    <Spinner size="sm" className="me-2" />
                    Generating Export...
                  </>
                ) : (
                  <>
                    <i className="bi bi-download me-2"></i>
                    Generate & Download Export
                  </>
                )}
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Export History */}
      <Card className="custom-card-recent">
        <Card.Header className="custom-card-header-recent d-flex justify-content-between align-items-center">
          <h5 className="mb-0">
            <i className="bi bi-clock-history me-2"></i>
            Export History
          </h5>
          <Button variant="outline-secondary" size="sm" onClick={fetchExportHistory}>
            <i className="bi bi-arrow-repeat me-1"></i>
            Refresh
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
                  <th>Export Type</th>
                  <th>Format</th>
                  <th>Date Range</th>
                  <th>Status</th>
                  <th>File Size</th>
                  <th>Generated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {exports.length > 0 ? (
                  exports.map((exp) => (
                    <tr key={exp.id}>
                      <td>
                        <Badge bg="secondary" className="badge-sm">
                          {exp.export_type}
                        </Badge>
                      </td>
                      <td><code>.{exp.format}</code></td>
                      <td className="small">
                        {formatDate(exp.date_from)} - {formatDate(exp.date_to)}
                      </td>
                      <td>{getStatusBadge(exp.status)}</td>
                      <td>{formatFileSize(exp.file_size)}</td>
                      <td>{formatDate(exp.created_at)}</td>
                      <td>
                        {exp.status === 'completed' && exp.download_url && (
                          <Button
                            size="sm"
                            variant="outline-primary"
                            href={exp.download_url}
                            target="_blank"
                          >
                            <i className="bi bi-download me-1"></i>
                            Download
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="text-center py-5 text-muted">
                      <i className="bi bi-inbox fs-1 mb-3"></i>
                      <br />
                      No export history yet
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>

      {/* Quick Export Templates */}
      <Card className="custom-card-recent mt-4">
        <Card.Header className="custom-card-header-recent">
          <h5>
            <i className="bi bi-lightning me-2"></i>
            Quick Export Templates
          </h5>
        </Card.Header>
        <Card.Body>
          <Row>
            <Col md={4}>
              <Card className="border h-100">
                <Card.Body className="text-center">
                  <i className="bi bi-calendar-month text-primary fs-1 mb-3"></i>
                  <h6>Monthly Summary</h6>
                  <p className="text-muted small">All documents from the last 30 days</p>
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={() => {
                      setFilters({
                        ...filters,
                        export_type: 'documents',
                        date_from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                        date_to: new Date().toISOString().split('T')[0],
                      });
                    }}
                  >
                    Use Template
                  </Button>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4}>
              <Card className="border h-100">
                <Card.Body className="text-center">
                  <i className="bi bi-people text-success fs-1 mb-3"></i>
                  <h6>User Activity Report</h6>
                  <p className="text-muted small">User statistics and activity logs</p>
                  <Button
                    variant="outline-success"
                    size="sm"
                    onClick={() => setFilters({ ...filters, export_type: 'users' })}
                  >
                    Use Template
                  </Button>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4}>
              <Card className="border h-100">
                <Card.Body className="text-center">
                  <i className="bi bi-shield-check text-warning fs-1 mb-3"></i>
                  <h6>Audit Trail</h6>
                  <p className="text-muted small">Complete audit logs for compliance</p>
                  <Button
                    variant="outline-warning"
                    size="sm"
                    onClick={() => setFilters({ ...filters, export_type: 'audit_logs' })}
                  >
                    Use Template
                  </Button>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default Exports;
