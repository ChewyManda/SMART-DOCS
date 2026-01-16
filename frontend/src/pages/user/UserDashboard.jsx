import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import '../../css/admin/admin-dashboard.css';

const UserDashboard = ({ user }) => {
  const [documents, setDocuments] = useState([]);
  const [recentDocuments, setRecentDocuments] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    unread: 0,
    acknowledged: 0,
    pending: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await api.get('/document');
      const docs = response.data.data;
      setDocuments(docs);
      
      // Get the latest 5 documents for the recent list
      const recent = [...docs].reverse().slice(0, 5);
      setRecentDocuments(recent);
      
      // Calculate stats
      const unread = docs.filter(d => !d.pivot?.is_viewed).length;
      const acknowledged = docs.filter(d => d.pivot?.is_acknowledged).length;
      const pending = docs.filter(d => d.status === 'pending' || d.status === 'processing').length;
      
      setStats({
        total: docs.length,
        unread,
        acknowledged,
        pending,
      });
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    } finally {
      setLoading(false);
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

  const getStatusBadge = (doc) => {
    if (!doc.pivot?.is_viewed) {
      return <Badge className="badge-sm badge-on-review">New</Badge>;
    }
    if (doc.pivot?.is_acknowledged) {
      return <Badge className="badge-sm badge-completed">Acknowledged</Badge>;
    }
    return <Badge className="badge-sm badge-on-hold">Viewed</Badge>;
  };

  if (loading) {
    return (
      <Container className="dashboard-loading text-center my-5">
        <div className="spinner-border text-primary"></div>
      </Container>
    );
  }

  return (
    <div className="user-dashboard-container">
    <Container>
      <Row className="page-header mb-4">
        <Col>
          <h2 className="dashboard-title">My Dashboard</h2>
          <p className="dashboard-subtitle">Welcome back, {user.name}</p>
        </Col>
      </Row>

      {/* Stats */}
      <Row className="stats-row mb-4">
        <Col md={3}>
          <Card className="stats-card">
            <div className="stats-icon bg-green"><i className="bi bi-file-earmark-text"></i></div>
            <h3>{stats.total}</h3>
            <p>Total Documents</p>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="stats-card">
            <div className="stats-icon bg-orange"><i className="bi bi-envelope"></i></div>
            <h3>{stats.unread}</h3>
            <p>Unread</p>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="stats-card">
            <div className="stats-icon bg-green"><i className="bi bi-check-circle"></i></div>
            <h3>{stats.acknowledged}</h3>
            <p>Acknowledged</p>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="stats-card">
            <div className="stats-icon bg-orange"><i className="bi bi-hourglass-split"></i></div>
            <h3>{stats.pending}</h3>
            <p>Pending Review</p>
          </Card>
        </Col>
      </Row>

      <Row>
        {/* Recent Documents */}
        <Col lg={12} className="mb-4">
          <Card className="custom-card-recent dashboard-card-height">
            <Card.Header className="custom-card-header-recent d-flex justify-content-between">
              <h5>
                <i className="bi bi-file-earmark-text me-2"></i>
                My Documents
              </h5>
              <Button as={Link} to="/documents" size="sm" variant="outline-primary" className="btn-view-all">View All</Button>
            </Card.Header>

            <Card.Body className="p-0 d-flex flex-column">
              <div className="table-wrapper overflow-auto">
                <Table responsive className="dashboard-table mb-0">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Title</th>
                      <th>Received From</th>
                      <th>Status</th>
                      <th>Date Received</th>
                      <th></th>
                    </tr>
                  </thead>

                  <tbody>
                    {recentDocuments.length > 0 ? (
                      recentDocuments.map(doc => (
                        <tr 
                          key={doc.id}
                          className={!doc.pivot?.is_viewed ? 'table-warning' : ''}
                        >
                          <td><code className="id-big">{doc.document_id}</code></td>
                          <td>
                            {doc.title}
                            {!doc.pivot?.is_viewed && (
                              <Badge className="badge-sm badge-on-review ms-2">NEW</Badge>
                            )}
                          </td>
                          <td>{doc.uploader?.name}</td>
                          <td>{getStatusBadge(doc)}</td>
                          <td>{formatDate(doc.created_at)}</td>
                          <td>
                            <Button as={Link} to={`/document/${doc.id}`} size="sm" className="btn-eye-orange">
                              <i className="bi bi-eye"></i>
                            </Button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="text-center py-5">
                          <i className="bi bi-inbox fs-1 text-muted d-block mb-3"></i>
                          <p className="text-muted mb-0">No documents received yet</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
    </div>
  );
};

export default UserDashboard;
