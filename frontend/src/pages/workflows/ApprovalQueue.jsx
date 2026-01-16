import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Row, Col, Card, Table, Badge,
  Button, Form, Pagination, Spinner, Modal
} from 'react-bootstrap';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import '../../css/admin/analytics.css';

const ApprovalQueue = ({ user }) => {
  const [queue, setQueue] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    total_pending: 0,
    urgent_count: 0,
    overdue_count: 0,
    avg_wait_time: 0
  });
  const [filterPriority, setFilterPriority] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchQueue = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const params = {
        page,
        priority: filterPriority !== 'all' ? filterPriority : undefined,
        query: searchTerm || undefined,
      };

      const response = await api.get('/workflow/approval-queue', { params });

      setQueue(response.data.data || []);
      setPagination({
        current_page: response.data.current_page || 1,
        last_page: response.data.last_page || 1,
        total: response.data.total || 0,
      });
      
      if (response.data.stats) {
        setStats(response.data.stats);
      }
    } catch (err) {
      console.error('Fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, [filterPriority, searchTerm]);

  useEffect(() => {
    fetchQueue(1);
  }, [filterPriority]);

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatWaitTime = (hours) => {
    if (!hours) return 'N/A';
    if (hours < 1) return `${Math.round(hours * 60)} min`;
    if (hours < 24) return `${hours.toFixed(1)} hrs`;
    return `${(hours / 24).toFixed(1)} days`;
  };

  const getPriorityBadge = (priority) => {
    const variants = {
      urgent: 'danger',
      high: 'warning',
      normal: 'primary',
      low: 'secondary'
    };
    return (
      <Badge bg={variants[priority] || 'secondary'} className="badge-sm">
        {priority?.charAt(0).toUpperCase() + priority?.slice(1) || 'Normal'}
      </Badge>
    );
  };

  const getStatusBadge = (status) => {
    const variants = {
      pending: 'warning',
      in_progress: 'info',
      awaiting_review: 'primary'
    };
    const labels = {
      pending: 'Pending',
      in_progress: 'In Progress',
      awaiting_review: 'Awaiting Review'
    };
    return (
      <Badge bg={variants[status] || 'secondary'} className="badge-sm">
        {labels[status] || status}
      </Badge>
    );
  };

  const renderPagination = () => {
    if (!pagination.last_page || pagination.last_page <= 1) return null;

    const pages = [];
    const currentPage = pagination.current_page;
    const totalPages = pagination.last_page;

    for (let i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i++) {
      pages.push(
        <Pagination.Item key={i} active={i === currentPage} onClick={() => fetchQueue(i)}>
          {i}
        </Pagination.Item>
      );
    }

    return (
      <Pagination className="justify-content-center mb-0">
        <Pagination.First disabled={currentPage === 1} onClick={() => fetchQueue(1)} />
        <Pagination.Prev disabled={currentPage === 1} onClick={() => fetchQueue(currentPage - 1)} />
        {pages}
        <Pagination.Next disabled={currentPage === totalPages} onClick={() => fetchQueue(currentPage + 1)} />
        <Pagination.Last disabled={currentPage === totalPages} onClick={() => fetchQueue(totalPages)} />
      </Pagination>
    );
  };

  return (
    <Container fluid className="admin-dashboard-container">
      {/* Header */}
      <Row className="page-header mb-4">
        <Col>
          <h2 className="dashboard-title">Approval Queue</h2>
          <p className="dashboard-subtitle">Documents waiting for your approval</p>
        </Col>
      </Row>

      {/* Stats Cards */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="stats-card">
            <div className="stats-icon bg-orange">
              <i className="bi bi-hourglass-split"></i>
            </div>
            <h3>{stats.total_pending}</h3>
            <p>Pending Approval</p>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="stats-card">
            <div className="stats-icon bg-danger">
              <i className="bi bi-exclamation-triangle"></i>
            </div>
            <h3>{stats.urgent_count}</h3>
            <p>Urgent Items</p>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="stats-card">
            <div className="stats-icon bg-warning">
              <i className="bi bi-clock-history"></i>
            </div>
            <h3>{stats.overdue_count}</h3>
            <p>Overdue</p>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="stats-card">
            <div className="stats-icon bg-blue">
              <i className="bi bi-stopwatch"></i>
            </div>
            <h3>{formatWaitTime(stats.avg_wait_time)}</h3>
            <p>Avg Wait Time</p>
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card className="custom-card-recent mb-4">
        <Card.Body>
          <Row className="g-3 align-items-center">
            <Col lg={6}>
              <div style={{ position: 'relative' }}>
                <Form.Control
                  type="text"
                  placeholder="Search by document title or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchQueue(1)}
                  style={{ paddingRight: searchTerm ? '45px' : '12px' }}
                />
                {searchTerm && (
                  <button
                    type="button"
                    className="search-clear-btn"
                    onClick={() => {
                      setSearchTerm('');
                      fetchQueue(1);
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
              </div>
            </Col>
            <Col lg={3}>
              <Form.Select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
              >
                <option value="all">All Priorities</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="normal">Normal</option>
                <option value="low">Low</option>
              </Form.Select>
            </Col>
            <Col lg={3}>
              <Button
                className="w-100"
                variant="primary"
                onClick={() => fetchQueue(1)}
              >
                <i className="bi bi-search me-2"></i>
                Search
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Queue Table */}
      <Card className="custom-card-recent">
        <Card.Header className="custom-card-header-recent">
          <h5>
            <i className="bi bi-list-check me-2"></i>
            Approval Queue
          </h5>
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
                  <th>Document</th>
                  <th>Submitted By</th>
                  <th>Step</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Wait Time</th>
                  <th>Submitted</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {queue.length > 0 ? (
                  queue.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div>
                          <strong>{item.document?.title || 'Untitled'}</strong>
                          <br />
                          <small className="text-muted">{item.document?.document_id}</small>
                        </div>
                      </td>
                      <td>{item.submitted_by?.name || 'Unknown'}</td>
                      <td>
                        <Badge bg="info" className="badge-sm">
                          Step {item.current_step || 1}
                        </Badge>
                      </td>
                      <td>{getPriorityBadge(item.priority)}</td>
                      <td>{getStatusBadge(item.status)}</td>
                      <td>{formatWaitTime(item.wait_hours)}</td>
                      <td>{formatDate(item.created_at)}</td>
                      <td>
                        <Button
                          as={Link}
                          to={`/document/${item.document_id}`}
                          size="sm"
                          variant="primary"
                          className="fw-semibold"
                        >
                          <i className="bi bi-check2-square me-1"></i>
                          Review
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="text-center py-5 text-muted">
                      <i className="bi bi-inbox fs-1 mb-3"></i>
                      <br />
                      No items in approval queue
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>

          {pagination.last_page > 1 && (
            <Card.Footer className="d-flex justify-content-center">
              {renderPagination()}
            </Card.Footer>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
};

export default ApprovalQueue;
