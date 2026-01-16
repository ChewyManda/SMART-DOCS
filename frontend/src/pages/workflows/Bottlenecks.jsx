import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Form, Spinner } from 'react-bootstrap';
import api from '../../services/api';
import '../../css/admin/analytics.css';

const Bottlenecks = ({ user }) => {
  const [loading, setLoading] = useState(false);
  const [bottlenecks, setBottlenecks] = useState(null);
  const [filters, setFilters] = useState({
    date_from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    date_to: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    fetchBottlenecks();
  }, [filters]);

  const fetchBottlenecks = async () => {
    setLoading(true);
    try {
      const params = {
        date_from: filters.date_from,
        date_to: filters.date_to,
      };
      const res = await api.get('/analytics/bottlenecks', { params });
      setBottlenecks(res.data.data);
    } catch (error) {
      console.error('Failed to fetch bottlenecks:', error);
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
          <h2 className="dashboard-title">Workflow Bottlenecks</h2>
          <p className="dashboard-subtitle">Identify workflow steps causing delays</p>
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

      {bottlenecks && (
        <>
          {/* Summary Cards */}
          <Row className="mb-4">
            <Col md={3}>
              <Card className="stats-card">
                <div className="stats-icon bg-orange">
                  <i className="bi bi-hourglass-split"></i>
                </div>
                <h3>{bottlenecks.summary?.total_pending || 0}</h3>
                <p>Pending Steps</p>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="stats-card">
                <div className="stats-icon bg-blue">
                  <i className="bi bi-clock-history"></i>
                </div>
                <h3>{formatHours(bottlenecks.summary?.avg_processing_time_hours)}</h3>
                <p>Avg Processing Time</p>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="stats-card">
                <div className="stats-icon bg-teal">
                  <i className="bi bi-list-ol"></i>
                </div>
                <h3>{bottlenecks.summary?.total_steps_analyzed || 0}</h3>
                <p>Steps Analyzed</p>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="stats-card">
                <div className="stats-icon bg-danger">
                  <i className="bi bi-exclamation-triangle"></i>
                </div>
                <h3>{bottlenecks.stuck_steps?.length || 0}</h3>
                <p>Stuck Steps</p>
              </Card>
            </Col>
          </Row>

          {/* Step Metrics Table */}
          <Card className="custom-card-recent mb-4" style={{ height: 'auto' }}>
            <Card.Header className="custom-card-header-recent">
              <h5>
                <i className="bi bi-speedometer2 me-2"></i>
                Step Performance Metrics
              </h5>
            </Card.Header>
            <Card.Body>
              <Table responsive className="dashboard-table">
                <thead>
                  <tr>
                    <th>Step Name</th>
                    <th>Order</th>
                    <th>Total Instances</th>
                    <th>Pending</th>
                    <th>Avg Processing Time</th>
                    <th>Max Processing Time</th>
                  </tr>
                </thead>
                <tbody>
                  {bottlenecks.step_metrics?.map((step) => (
                    <tr key={step.step_id}>
                      <td><strong>{step.step_name}</strong></td>
                      <td>{step.step_order}</td>
                      <td>{step.total_instances}</td>
                      <td>
                        <Badge className={step.pending_count > 0 ? 'badge-sm badge-pending' : 'badge-sm badge-completed'}>
                          {step.pending_count}
                        </Badge>
                      </td>
                      <td>{formatHours(step.avg_processing_hours)}</td>
                      <td>{formatHours(step.max_processing_hours)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>

          {/* Stuck Steps */}
          {bottlenecks.stuck_steps && bottlenecks.stuck_steps.length > 0 && (
            <Card className="custom-card-recent" style={{ height: 'auto' }}>
              <Card.Header className="custom-card-header-recent">
                <h5>
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  Stuck Steps (Pending {'>'} 24 hours)
                </h5>
              </Card.Header>
              <Card.Body>
                <Table responsive className="dashboard-table">
                  <thead>
                    <tr>
                      <th>Step Name</th>
                      <th>Stuck Count</th>
                      <th>Avg Hours Stuck</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bottlenecks.stuck_steps.map((step) => (
                      <tr key={step.step_id}>
                        <td><strong>{step.step_name}</strong></td>
                        <td>
                          <Badge className="badge-sm badge-failed">{step.stuck_count}</Badge>
                        </td>
                        <td>{formatHours(step.avg_hours_stuck)}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          )}
        </>
      )}
    </Container>
  );
};

export default Bottlenecks;
