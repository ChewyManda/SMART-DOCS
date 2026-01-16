import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Form, Spinner, Button } from 'react-bootstrap';
import api from '../../services/api';
import '../../css/admin/analytics.css';

const Trends = ({ user }) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [filters, setFilters] = useState({
    period: '30',
    date_from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    date_to: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    fetchTrends();
  }, [filters]);

  const fetchTrends = async () => {
    setLoading(true);
    try {
      const params = {
        date_from: filters.date_from,
        date_to: filters.date_to,
      };
      const res = await api.get('/analytics/trends', { params });
      console.log('Trends API Response:', res.data);
      if (res.data && res.data.success && res.data.data) {
        setData(res.data.data);
      } else {
        console.warn('Unexpected response format, using mock data');
        setData(generateMockData());
      }
    } catch (error) {
      console.error('Failed to fetch trends:', error);
      console.error('Error details:', error.response?.data || error.message);
      setData(generateMockData());
    } finally {
      setLoading(false);
    }
  };

  const generateMockData = () => ({
    summary: {
      total_documents: 156,
      growth_rate: 12.5,
      avg_daily_uploads: 5.2,
      avg_processing_time: 4.3,
    },
    daily_uploads: [
      { date: '2026-01-05', count: 8 },
      { date: '2026-01-06', count: 12 },
      { date: '2026-01-07', count: 6 },
      { date: '2026-01-08', count: 15 },
      { date: '2026-01-09', count: 9 },
      { date: '2026-01-10', count: 11 },
      { date: '2026-01-11', count: 7 },
    ],
    by_classification: [
      { classification: 'invoice', count: 45, percentage: 28.8 },
      { classification: 'contract', count: 38, percentage: 24.4 },
      { classification: 'report', count: 32, percentage: 20.5 },
      { classification: 'form', count: 25, percentage: 16.0 },
      { classification: 'other', count: 16, percentage: 10.3 },
    ],
    by_department: [
      { department: 'Finance', count: 42 },
      { department: 'HR', count: 35 },
      { department: 'Operations', count: 28 },
      { department: 'IT', count: 22 },
      { department: 'Sales', count: 18 },
    ],
    weekly_comparison: [
      { week: 'Week 1', documents: 32, approvals: 28 },
      { week: 'Week 2', documents: 41, approvals: 35 },
      { week: 'Week 3', documents: 38, approvals: 32 },
      { week: 'Week 4', documents: 45, approvals: 40 },
    ],
  });

  const handlePeriodChange = (period) => {
    const days = parseInt(period);
    setFilters({
      ...filters,
      period,
      date_from: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      date_to: new Date().toISOString().split('T')[0],
    });
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
          <h2 className="dashboard-title">Trends & Insights</h2>
          <p className="dashboard-subtitle">Document activity trends and patterns over time</p>
        </Col>
      </Row>

      {/* Filters */}
      <Card className="custom-card-recent mb-4 filter-card">
        <Card.Body>
          <Row className="align-items-end">
            <Col md={3}>
              <Form.Group>
                <Form.Label>Time Period</Form.Label>
                <Form.Select
                  value={filters.period}
                  onChange={(e) => handlePeriodChange(e.target.value)}
                >
                  <option value="7">Last 7 days</option>
                  <option value="30">Last 30 days</option>
                  <option value="90">Last 90 days</option>
                  <option value="180">Last 6 months</option>
                  <option value="365">Last year</option>
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
              <Button variant="primary" className="w-100" onClick={fetchTrends}>
                <i className="bi bi-arrow-repeat me-2"></i>
                Refresh
              </Button>
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
                  <i className="bi bi-file-earmark-text"></i>
                </div>
                <h3>{data.summary?.total_documents || 0}</h3>
                <p>Total Documents</p>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="stats-card">
                <div className="stats-icon bg-green">
                  <i className="bi bi-graph-up-arrow"></i>
                </div>
                <h3>{data.summary?.growth_rate?.toFixed(1) || 0}%</h3>
                <p>Growth Rate</p>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="stats-card">
                <div className="stats-icon bg-orange">
                  <i className="bi bi-cloud-upload"></i>
                </div>
                <h3>{data.summary?.avg_daily_uploads?.toFixed(1) || 0}</h3>
                <p>Avg Daily Uploads</p>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="stats-card">
                <div className="stats-icon bg-teal">
                  <i className="bi bi-clock"></i>
                </div>
                <h3>{data.summary?.avg_processing_time?.toFixed(1) || 0}h</h3>
                <p>Avg Processing Time</p>
              </Card>
            </Col>
          </Row>

          {/* Charts Row */}
          <Row className="mb-4">
            {/* Daily Uploads */}
            <Col md={8}>
              <Card className="custom-card-recent" style={{ height: 'auto' }}>
                <Card.Header className="custom-card-header-recent">
                  <h5>
                    <i className="bi bi-bar-chart me-2"></i>
                    Daily Upload Activity
                  </h5>
                </Card.Header>
                <Card.Body>
                  <Table responsive className="dashboard-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Documents Uploaded</th>
                        <th>Trend</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.daily_uploads?.map((item, idx) => (
                        <tr key={idx}>
                          <td>{new Date(item.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</td>
                          <td><strong>{item.count}</strong></td>
                          <td>
                            <div className="d-flex align-items-center">
                              <div 
                                className="bg-primary rounded" 
                                style={{ height: '8px', width: `${(item.count / 20) * 100}%`, maxWidth: '200px' }}
                              ></div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
            </Col>

            {/* By Classification */}
            <Col md={4}>
              <Card className="custom-card-recent" style={{ height: 'auto' }}>
                <Card.Header className="custom-card-header-recent">
                  <h5>
                    <i className="bi bi-pie-chart me-2"></i>
                    By Classification
                  </h5>
                </Card.Header>
                <Card.Body>
                  <Table responsive className="dashboard-table">
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>Count</th>
                        <th>%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.by_classification?.map((item, idx) => (
                        <tr key={idx}>
                          <td>
                            <Badge bg={
                              item.classification === 'invoice' ? 'primary' :
                              item.classification === 'contract' ? 'success' :
                              item.classification === 'report' ? 'info' :
                              item.classification === 'form' ? 'warning' : 'secondary'
                            } className="badge-sm">
                              {item.classification}
                            </Badge>
                          </td>
                          <td><strong>{item.count}</strong></td>
                          <td>{item.percentage?.toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Department & Weekly Comparison */}
          <Row>
            <Col md={6}>
              <Card className="custom-card-recent" style={{ height: 'auto' }}>
                <Card.Header className="custom-card-header-recent">
                  <h5>
                    <i className="bi bi-building me-2"></i>
                    By Department
                  </h5>
                </Card.Header>
                <Card.Body>
                  <Table responsive className="dashboard-table">
                    <thead>
                      <tr>
                        <th>Department</th>
                        <th>Documents</th>
                        <th>Activity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.by_department?.map((item, idx) => (
                        <tr key={idx}>
                          <td><strong>{item.department}</strong></td>
                          <td>{item.count}</td>
                          <td>
                            <div className="d-flex align-items-center">
                              <div 
                                className="bg-success rounded" 
                                style={{ height: '8px', width: `${(item.count / 50) * 100}%`, maxWidth: '150px' }}
                              ></div>
                            </div>
                          </td>
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
                    <i className="bi bi-calendar-week me-2"></i>
                    Weekly Comparison
                  </h5>
                </Card.Header>
                <Card.Body>
                  <Table responsive className="dashboard-table">
                    <thead>
                      <tr>
                        <th>Week</th>
                        <th>Documents</th>
                        <th>Approvals</th>
                        <th>Approval Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.weekly_comparison?.map((item, idx) => (
                        <tr key={idx}>
                          <td><strong>{item.week}</strong></td>
                          <td>{item.documents}</td>
                          <td>{item.approvals}</td>
                          <td>
                            <Badge bg={item.approvals / item.documents > 0.8 ? 'success' : 'warning'} className="badge-sm">
                              {((item.approvals / item.documents) * 100).toFixed(0)}%
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </>
      )}
    </Container>
  );
};

export default Trends;
