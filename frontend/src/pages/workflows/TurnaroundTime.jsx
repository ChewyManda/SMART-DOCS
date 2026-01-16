import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Form, Spinner } from 'react-bootstrap';
import api from '../../services/api';
import '../../css/admin/analytics.css';

const TurnaroundTime = ({ user }) => {
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
      const res = await api.get('/analytics/precalling-time', { params });
      setData(res.data.data);
    } catch (error) {
      console.error('Failed to fetch turnaround time data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatMinutes = (minutes) => {
    if (!minutes) return 'N/A';
    if (minutes < 60) return `${Math.round(minutes)} min`;
    return `${(minutes / 60).toFixed(1)} hrs`;
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
          <h2 className="dashboard-title">Turnaround Time</h2>
          <p className="dashboard-subtitle">Track document processing and response times</p>
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
            <Col md={3}>
              <Card className="stats-card">
                <div className="stats-icon bg-blue">
                  <i className="bi bi-clock"></i>
                </div>
                <h3>{formatMinutes(data.summary?.overall_avg_precalling_minutes)}</h3>
                <p>Avg Turnaround Time</p>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="stats-card">
                <div className="stats-icon bg-orange">
                  <i className="bi bi-hourglass-top"></i>
                </div>
                <h3>{formatMinutes(data.summary?.overall_max_precalling_minutes)}</h3>
                <p>Max Turnaround Time</p>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="stats-card">
                <div className="stats-icon bg-teal">
                  <i className="bi bi-pause-circle"></i>
                </div>
                <h3>{data.summary?.total_waiting || 0}</h3>
                <p>Waiting Instances</p>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="stats-card">
                <div className="stats-icon bg-green">
                  <i className="bi bi-stopwatch"></i>
                </div>
                <h3>{formatMinutes(data.summary?.avg_waiting_minutes)}</h3>
                <p>Avg Waiting Time</p>
              </Card>
            </Col>
          </Row>

          {/* Turnaround Time by Step */}
          <Card className="custom-card-recent mb-4" style={{ height: 'auto' }}>
            <Card.Header className="custom-card-header-recent">
              <h5>
                <i className="bi bi-clock-history me-2"></i>
                Turnaround Time by Step
              </h5>
            </Card.Header>
            <Card.Body>
              <Table responsive className="dashboard-table">
                <thead>
                  <tr>
                    <th>Step Name</th>
                    <th>Order</th>
                    <th>Total Instances</th>
                    <th>Avg Turnaround</th>
                    <th>Max Turnaround</th>
                  </tr>
                </thead>
                <tbody>
                  {data.by_step?.map((step) => (
                    <tr key={step.step_id}>
                      <td><strong>{step.step_name}</strong></td>
                      <td>{step.step_order}</td>
                      <td>{step.total_instances}</td>
                      <td>{formatMinutes(step.avg_precalling_minutes)}</td>
                      <td>{formatMinutes(step.max_precalling_minutes)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>

          {/* Daily Metrics */}
          <Card className="custom-card-recent" style={{ height: 'auto' }}>
            <Card.Header className="custom-card-header-recent">
              <h5>
                <i className="bi bi-graph-up me-2"></i>
                Daily Turnaround Time Trends
              </h5>
            </Card.Header>
            <Card.Body>
              <Table responsive className="dashboard-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Total Instances</th>
                    <th>Avg Turnaround</th>
                    <th>Max Turnaround</th>
                    <th>Min Turnaround</th>
                  </tr>
                </thead>
                <tbody>
                  {data.daily_metrics?.map((metric, idx) => (
                    <tr key={idx}>
                      <td>{new Date(metric.date).toLocaleDateString()}</td>
                      <td>{metric.total_instances}</td>
                      <td>{formatMinutes(metric.avg_precalling_minutes)}</td>
                      <td>{formatMinutes(metric.max_precalling_minutes)}</td>
                      <td>{formatMinutes(metric.min_precalling_minutes)}</td>
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

export default TurnaroundTime;
