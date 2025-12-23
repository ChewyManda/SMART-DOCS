import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Pagination } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import '../../css/admin/admin-dashboard.css';

const AdminDashboard = ({ user }) => {
  const [stats, setStats] = useState({
    total_documents: 0,
    processed_documents: 0,
    total_users: 0,
    active_users: 0,
    documents_today: 0,
  });

  const [recentDocuments, setRecentDocuments] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  const [docPage, setDocPage] = useState(1);
  const [docTotalPages, setDocTotalPages] = useState(1);
  const [docPerPage] = useState(10);

  const [actPage, setActPage] = useState(1);
  const [actTotalPages, setActTotalPages] = useState(1);
  const [actPerPage] = useState(10);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  useEffect(() => {
    fetchDocuments(docPage);
  }, [docPage]);

  useEffect(() => {
    fetchActivities(actPage);
  }, [actPage]);

  const fetchDashboardStats = async () => {
    try {
      const statsRes = await api.get('/admin/dashboard/stats');
      setStats(statsRes.data);
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async (page) => {
    try {
      const res = await api.get('/document', {
        params: { page, per_page: docPerPage },
      });
      setRecentDocuments(res.data.data.reverse());
      setDocTotalPages(res.data.last_page);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    }
  };

  const fetchActivities = async (page) => {
    try {
      const res = await api.get('/admin/activity-logs', {
        params: { page, per_page: actPerPage },
      });
      setRecentActivities(res.data.data.reverse());
      setActTotalPages(res.data.last_page);
    } catch (error) {
      console.error('Failed to fetch activities:', error);
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // ===================================
  // ✅ FIXED: USE DATABASE STATUS HERE
  // ===================================
  const getDocumentStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <Badge bg="secondary" className="badge-sm">Pending</Badge>;
      case 'processing':
        return <Badge bg="warning" className="badge-sm">Processing</Badge>;
      case 'completed':
        return <Badge bg="success" className="badge-sm">Completed</Badge>;
      case 'failed':
        return <Badge bg="danger" className="badge-sm">Failed</Badge>;
      default:
        return <Badge bg="dark" className="badge-sm">Unknown</Badge>;
    }
  };

  const renderPagination = (currentPage, totalPages, setPage) => {
    if (totalPages <= 1) return null;

    const maxButtons = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
    let endPage = startPage + maxButtons - 1;

    if (endPage > totalPages) {
      endPage = totalPages;
      startPage = Math.max(1, endPage - maxButtons + 1);
    }

    const pages = [];
    if (startPage > 1) pages.push(<Pagination.Ellipsis key="start" disabled />);
    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <Pagination.Item key={i} active={i === currentPage} onClick={() => setPage(i)}>
          {i}
        </Pagination.Item>
      );
    }
    if (endPage < totalPages) pages.push(<Pagination.Ellipsis key="end" disabled />);

    return (
      <Pagination className="justify-content-center mt-2 mb-2">
        <Pagination.First disabled={currentPage === 1} onClick={() => setPage(1)} />
        <Pagination.Prev disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} />
        {pages}
        <Pagination.Next disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)} />
        <Pagination.Last disabled={currentPage === totalPages} onClick={() => setPage(totalPages)} />
      </Pagination>
    );
  };

  if (loading) {
    return (
      <Container className="dashboard-loading text-center my-5">
        <div className="spinner-border text-primary"></div>
      </Container>
    );
  }

  return (
    <Container fluid className="admin-dashboard-container">
      <Row className="page-header mb-4">
        <Col>
          <h2 className="dashboard-title">Admin Dashboard</h2>
          <p className="dashboard-subtitle">Welcome back, {user.name}</p>
        </Col>
      </Row>

      {/* Stats */}
      <Row className="stats-row mb-4">
        <Col md={3}>
          <Card className="stats-card">
            <div className="stats-icon bg-green"><i className="bi bi-file-earmark-text"></i></div>
            <h3>{stats.total_documents}</h3>
            <p>Total Documents</p>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="stats-card">
            <div className="stats-icon bg-green"><i className="bi bi-check-circle"></i></div>
            <h3>{stats.processed_documents}</h3>
            <p>Processed</p>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="stats-card">
            <div className="stats-icon bg-orange"><i className="bi bi-people"></i></div>
            <h3>{stats.total_users}</h3>
            <p>Total Users</p>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="stats-card">
            <div className="stats-icon bg-orange"><i className="bi bi-person-check"></i></div>
            <h3>{stats.active_users}</h3>
            <p>Active Users</p>
          </Card>
        </Col>
      </Row>

      <Row>
        {/* Recent documents */}
        <Col lg={7} className="mb-4">
          <Card className="custom-card-recent dashboard-card-height">
            <Card.Header className="custom-card-header-recent d-flex justify-content-between">
              <h5>Recent Documents</h5>
              <Button as={Link} to="/document" size="sm" variant="outline-primary">View All</Button>
            </Card.Header>

            <Card.Body className="p-0 d-flex flex-column">
              <div className="table-wrapper overflow-auto">
                <Table responsive className="dashboard-table mb-0">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Title</th>
                      <th>Uploader</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th></th>
                    </tr>
                  </thead>

                  <tbody>
                    {recentDocuments.map(doc => (
                      <tr key={doc.id}>
                        <td><code className="id-big">{doc.document_id}</code></td>
                        <td>{doc.title}</td>
                        <td>{doc.uploader?.name}</td>
                        <td>{getDocumentStatusBadge(doc.status)}</td>
                        <td>{formatDate(doc.created_at)}</td>
                        <td>
                          <Button as={Link} to={`/document/${doc.id}`} size="sm" className="btn-eye-orange">
                            <i className="bi bi-eye"></i>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>

              {renderPagination(docPage, docTotalPages, setDocPage)}
            </Card.Body>
          </Card>
        </Col>

        {/* Recent activities */}
        <Col lg={5} className="mb-4">
          <Card className="custom-card-activities dashboard-card-height">
            <Card.Header className="custom-card-header-activities">
              <h5>Recent Activities</h5>
            </Card.Header>

            <Card.Body className="p-0 d-flex flex-column">
              <div className="activity-body flex-fill">
                {recentActivities.map(act => (
                  <div key={act.id} className="activity-item">
                    <div className="activity-icon">
                      <i className={`bi bi-${
                        act.activity_type === 'uploaded' ? 'cloud-upload' :
                        act.activity_type === 'viewed' ? 'eye' :
                        act.activity_type === 'downloaded' ? 'download' :
                        act.activity_type === 'acknowledged' ? 'check-circle' :
                        'file-earmark'
                      }`} />
                    </div>

                    <div className="activity-text">
                      <p><strong>{act.user?.name}</strong> {act.activity_type} <strong>{act.document?.title}</strong></p>
                      <small className="text-muted">{formatDate(act.created_at)}</small>
                    </div>
                  </div>
                ))}
              </div>

              {renderPagination(actPage, actTotalPages, setActPage)}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default AdminDashboard;
