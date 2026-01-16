import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Form, Spinner } from 'react-bootstrap';
import { useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import '../../css/admin/analytics.css';

const Analytics = ({ user }) => {
  const [loading, setLoading] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'bottlenecks';
  
  // Filters
  const [filters, setFilters] = useState({
    date_from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    date_to: new Date().toISOString().split('T')[0],
    workflow_id: '',
    classification: '',
  });

  // Data states
  const [bottlenecks, setBottlenecks] = useState(null);
  const [precallingTime, setPrecallingTime] = useState(null);
  const [documentStatus, setDocumentStatus] = useState(null);

  useEffect(() => {
    fetchAnalytics();
  }, [activeTab, filters]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const params = {
        date_from: filters.date_from,
        date_to: filters.date_to,
        ...(filters.workflow_id && { workflow_id: filters.workflow_id }),
        ...(filters.classification && { classification: filters.classification }),
      };

      if (activeTab === 'bottlenecks') {
        const res = await api.get('/analytics/bottlenecks', { params });
        setBottlenecks(res.data.data);
      } else if (activeTab === 'precalling') {
        const res = await api.get('/analytics/precalling-time', { params });
        setPrecallingTime(res.data.data);
      } else if (activeTab === 'status') {
        const res = await api.get('/analytics/document-status', { params });
        setDocumentStatus(res.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
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

  const formatMinutes = (minutes) => {
    if (!minutes) return 'N/A';
    if (minutes < 60) return `${Math.round(minutes)} min`;
    return `${(minutes / 60).toFixed(1)} hrs`;
  };

  const renderBottlenecks = () => {
    if (!bottlenecks) return null;

    return (
      <div>
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
              <div className="stats-icon bg-green">
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
      </div>
    );
  };

  const renderPrecallingTime = () => {
    if (!precallingTime) return null;

    return (
      <div>
        {/* Summary Cards */}
        <Row className="mb-4">
          <Col md={3}>
            <Card className="stats-card">
              <div className="stats-icon bg-blue">
                <i className="bi bi-clock"></i>
              </div>
              <h3>{formatMinutes(precallingTime.summary?.overall_avg_precalling_minutes)}</h3>
              <p>Avg Precalling Time</p>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="stats-card">
              <div className="stats-icon bg-orange">
                <i className="bi bi-hourglass-top"></i>
              </div>
              <h3>{formatMinutes(precallingTime.summary?.overall_max_precalling_minutes)}</h3>
              <p>Max Precalling Time</p>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="stats-card">
              <div className="stats-icon bg-teal">
                <i className="bi bi-pause-circle"></i>
              </div>
              <h3>{precallingTime.summary?.total_waiting || 0}</h3>
              <p>Waiting Instances</p>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="stats-card">
              <div className="stats-icon bg-green">
                <i className="bi bi-stopwatch"></i>
              </div>
              <h3>{formatMinutes(precallingTime.summary?.avg_waiting_minutes)}</h3>
              <p>Avg Waiting Time</p>
            </Card>
          </Col>
        </Row>

        {/* Precalling Time by Step */}
        <Card className="custom-card-recent mb-4" style={{ height: 'auto' }}>
          <Card.Header className="custom-card-header-recent">
            <h5>
              <i className="bi bi-clock-history me-2"></i>
              Precalling Time by Step
            </h5>
          </Card.Header>
          <Card.Body>
            <Table responsive className="dashboard-table">
              <thead>
                <tr>
                  <th>Step Name</th>
                  <th>Order</th>
                  <th>Total Instances</th>
                  <th>Avg Precalling Time</th>
                  <th>Max Precalling Time</th>
                </tr>
              </thead>
              <tbody>
                {precallingTime.by_step?.map((step) => (
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
              Daily Precalling Time Trends
            </h5>
          </Card.Header>
          <Card.Body>
            <Table responsive className="dashboard-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Total Instances</th>
                  <th>Avg Precalling Time</th>
                  <th>Max Precalling Time</th>
                  <th>Min Precalling Time</th>
                </tr>
              </thead>
              <tbody>
                {precallingTime.daily_metrics?.map((metric, idx) => (
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
      </div>
    );
  };

  const renderDocumentStatus = () => {
    if (!documentStatus) return null;

    return (
      <div>
        {/* Summary Cards */}
        <Row className="mb-4">
          <Col md={3}>
            <Card className="stats-card">
              <div className="stats-icon bg-green">
                <i className="bi bi-file-earmark-text"></i>
              </div>
              <h3>{documentStatus.summary?.total_documents || 0}</h3>
              <p>Total Documents</p>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="stats-card">
              <div className="stats-icon bg-blue">
                <i className="bi bi-diagram-3"></i>
              </div>
              <h3>{documentStatus.summary?.documents_with_workflow || 0}</h3>
              <p>With Workflow</p>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="stats-card">
              <div className="stats-icon bg-teal">
                <i className="bi bi-check-circle"></i>
              </div>
              <h3>{documentStatus.summary?.completed_workflows || 0}</h3>
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
                    {documentStatus.status_distribution?.map((item, idx) => (
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
                    {documentStatus.workflow_status_distribution?.map((item, idx) => (
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
                {documentStatus.avg_time_in_status?.map((item, idx) => (
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
      </div>
    );
  };

  return (
    <Container fluid className="admin-dashboard-container">
      <Row className="page-header mb-4">
        <Col>
          <h2 className="dashboard-title">Analytics & Repository</h2>
          <p className="dashboard-subtitle">Workflow performance and document status analytics</p>
        </Col>
      </Row>

      {/* Filters */}
      <Card className="custom-card-recent mb-4 filter-card">
        <Card.Header className="custom-card-header-recent">
          <h5>
            <i className="bi bi-funnel me-2"></i>
            Filters
          </h5>
        </Card.Header>
        <Card.Body className="filter-card-body">
          <Row>
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
                <Form.Label>Workflow ID (Optional)</Form.Label>
                <Form.Control
                  type="number"
                  placeholder="Filter by workflow"
                  value={filters.workflow_id}
                  onChange={(e) => setFilters({ ...filters, workflow_id: e.target.value })}
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Classification (Optional)</Form.Label>
                <Form.Select
                  value={filters.classification}
                  onChange={(e) => setFilters({ ...filters, classification: e.target.value })}
                >
                  <option value="">All Classifications</option>
                  <option value="invoice">Invoice</option>
                  <option value="contract">Contract</option>
                  <option value="report">Report</option>
                  <option value="form">Form</option>
                  <option value="other">Other</option>
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Content */}
      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
        </div>
      ) : activeTab === 'bottlenecks' ? (
        renderBottlenecks()
      ) : activeTab === 'precalling' ? (
        renderPrecallingTime()
      ) : activeTab === 'status' ? (
        renderDocumentStatus()
      ) : (
        renderBottlenecks()
      )}
    </Container>
  );
};

export default Analytics;
