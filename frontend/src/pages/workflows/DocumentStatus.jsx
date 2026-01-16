import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Form, Spinner } from 'react-bootstrap';
import api from '../../services/api';
import '../../css/admin/analytics.css';

const DocumentStatus = ({ user }) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [filters, setFilters] = useState({
    date_from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    date_to: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {
        date_from: filters.date_from,
        date_to: filters.date_to,
      };
      const res = await api.get('/analytics/document-status', { params });
      setData(res.data.data);
    } catch (error) {
      console.error('Failed to fetch document status data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatHours = (hours) => {
    if (!hours) return 'N/A';
    if (hours < 1) return `${Math.round(hours * 60)} min`;
    if (hours < 24) return `${hours.toFixed(1)} hrs`;
    return `${(hours / 24).toFixed(1)} days`;
  };

  if (loading) {
    return (
      <Container fluid className="admin-dashboard-container">
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
          <Spinner animation="border" variant="primary" />
        </div>
      </Container>
    );
  }

  return (
    <Container fluid className="admin-dashboard-container">
      <Row className="page-header mb-4">
        <Col>
          <h2 className="dashboard-title">Document Status</h2>
          <p className="dashboard-subtitle">Overview of document workflow status distribution</p>
        </Col>
      </Row>

      {/* Filters */}
      <Card className="custom-card-recent mb-4 filter-card">
        <Card.Body>
          <Row>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Date From</Form.Label>
                <Form.Control
                  type="date"
                  value={filters.date_from}
                  onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Date To</Form.Label>
                <Form.Control
                  type="date"
                  value={filters.date_to}
                  onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
                />
              </Form.Group>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {data && (
        <>
          {/* Summary Cards */}
          <Row className="mb-4">
            <Col md={4}>
              <Card className="stats-card">
                <div className="stats-icon bg-green">
                  <i className="bi bi-file-earmark-text"></i>
                </div>
                <h3>{data.summary?.total_documents || 0}</h3>
                <p>Total Documents</p>
              </Card>
            </Col>
            <Col md={4}>
              <Card className="stats-card">
                <div className="stats-icon bg-blue">
                  <i className="bi bi-diagram-3"></i>
                </div>
                <h3>{data.summary?.documents_with_workflow || 0}</h3>
                <p>With Workflow</p>
              </Card>
            </Col>
            <Col md={4}>
              <Card className="stats-card">
                <div className="stats-icon bg-teal">
                  <i className="bi bi-check-circle"></i>
                </div>
                <h3>{data.summary?.completed_workflows || 0}</h3>
                <p>Completed Workflows</p>
              </Card>
            </Col>
          </Row>

          {/* Status Distribution */}
          <Row className="mb-4">
            <Col md={6}>
              <Card className="custom-card-recent" style={{ height: 'auto' }}>
                <Card.Header className="custom-card-header-recent">
                  <h5>
                    <i className="bi bi-pie-chart me-2"></i>
                    Document Status Distribution
                  </h5>
                </Card.Header>
                <Card.Body>
                  <Table responsive className="dashboard-table">
                    <thead>
                      <tr>
                        <th>Status</th>
                        <th>Workflow Status</th>
                        <th>Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.status_distribution?.map((item, idx) => (
                        <tr key={idx}>
                          <td>
                            <Badge className={
                              item.status === 'completed' ? 'badge-sm badge-completed' :
                              item.status === 'failed' ? 'badge-sm badge-failed' :
                              item.status === 'on_hold' ? 'badge-sm badge-on-hold' : 'badge-sm badge-on-review'
                            }>
                              {item.status}
                            </Badge>
                          </td>
                          <td>
                            <Badge className="badge-sm badge-on-review">{item.workflow_status}</Badge>
                          </td>
                          <td><strong>{item.count}</strong></td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
            </Col>
            <Col md={6}>
              <Card className="custom-card-recent" style={{ height: 'auto' }}>
                <Card.Header className="custom-card-header-recent">
                  <h5>
                    <i className="bi bi-diagram-3 me-2"></i>
                    Workflow Status Distribution
                  </h5>
                </Card.Header>
                <Card.Body>
                  <Table responsive className="dashboard-table">
                    <thead>
                      <tr>
                        <th>Workflow Status</th>
                        <th>Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.workflow_status_distribution?.map((item, idx) => (
                        <tr key={idx}>
                          <td>
                            <Badge className={
                              item.workflow_status === 'completed' ? 'badge-sm badge-completed' :
                              item.workflow_status === 'failed' ? 'badge-sm badge-failed' :
                              item.workflow_status === 'in_progress' ? 'badge-sm badge-on-review' :
                              item.workflow_status === 'pending' ? 'badge-sm badge-pending' : 'badge-sm badge-on-hold'
                            }>
                              {item.workflow_status}
                            </Badge>
                          </td>
                          <td><strong>{item.count}</strong></td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Average Time in Status */}
          <Card className="custom-card-recent" style={{ height: 'auto' }}>
            <Card.Header className="custom-card-header-recent">
              <h5>
                <i className="bi bi-hourglass-split me-2"></i>
                Average Time in Workflow Status
              </h5>
            </Card.Header>
            <Card.Body>
              <Table responsive className="dashboard-table">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Count</th>
                    <th>Avg Hours in Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.avg_time_in_status?.map((item, idx) => (
                    <tr key={idx}>
                      <td>
                        <Badge className={
                          item.status === 'completed' ? 'badge-sm badge-completed' :
                          item.status === 'failed' ? 'badge-sm badge-failed' :
                          item.status === 'in_progress' ? 'badge-sm badge-on-review' : 'badge-sm badge-pending'
                        }>
                          {item.status}
                        </Badge>
                      </td>
                      <td>{item.count}</td>
                      <td><strong>{formatHours(item.avg_hours_in_status)}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </>
      )}
    </Container>
  );
};

export default DocumentStatus;
