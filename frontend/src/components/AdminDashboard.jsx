

import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import api from '../services/api';

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

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, docsRes, activitiesRes] = await Promise.all([
        api.get('/admin/dashboard/stats'),
        api.get('/document?per_page=5'),
        api.get('/admin/activity-logs?per_page=10'),
      ]);

      setStats(statsRes.data);
      setRecentDocuments(docsRes.data.data);
      setRecentActivities(activitiesRes.data.data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Updated function to match User Dashboard logic
  const getDocumentStatusBadge = (doc) => {
    console.log('Document:', doc.document_id, 'Recipients:', doc.recipients); // Debug
    
    // Check if document has recipients with pivot data
    if (!doc.recipients || doc.recipients.length === 0) {
      return <span className="text-muted">-</span>;
    }

    // Check acknowledgment status across all recipients
    const allAcknowledged = doc.recipients.every(r => r.pivot?.is_acknowledged === true);
    const someAcknowledged = doc.recipients.some(r => r.pivot?.is_acknowledged === true);
    const allViewed = doc.recipients.every(r => r.pivot?.is_viewed === true);
    const someViewed = doc.recipients.some(r => r.pivot?.is_viewed === true);

    // If all recipients acknowledged
    if (allAcknowledged) {
      return <Badge bg="success">Acknowledged</Badge>;
    } 
    // If some (but not all) acknowledged
    else if (someAcknowledged) {
      return <Badge bg="info">Partially Acknowledged</Badge>;
    } 
    // If at least one person viewed
    else if (someViewed) {
      return <Badge bg="secondary">Viewed</Badge>;
    }

    // No one has viewed or acknowledged yet
    return <span className="text-muted">-</span>;
  };

  if (loading) {
    return (
      <Container className="mt-5 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </Container>
    );
  }

  return (
    <Container className="mt-4 mb-5">
      <Row className="mb-4">
        <Col>
          <h2 className="fw-bold">Admin Dashboard</h2>
          <p className="text-muted">Welcome back, {user.name}!</p>
        </Col>
      </Row>

      {/* Statistics Cards */}
      <Row className="mb-4">
        <Col md={4} className="mb-3">
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="text-center">
              <i className="bi bi-file-earmark-text text-primary fs-1 mb-3 d-block"></i>
              <h3 className="fw-bold text-primary">{stats.total_documents}</h3>
              <p className="text-muted mb-0">Total Documents</p>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={4} className="mb-3">
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="text-center">
              <i className="bi bi-check-circle text-success fs-1 mb-3 d-block"></i>
              <h3 className="fw-bold text-success">{stats.processed_documents}</h3>
              <p className="text-muted mb-0">Processed</p>
            </Card.Body>
          </Card>
        </Col>

        <Col md={4} className="mb-3">
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="text-center">
              <i className="bi bi-people text-info fs-1 mb-3 d-block"></i>
              <h3 className="fw-bold text-info">{stats.total_users}</h3>
              <p className="text-muted mb-0">Total Users</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="mb-4">
        <Col md={4} className="mb-3">
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="text-center">
              <i className="bi bi-person-check text-success fs-1 mb-3 d-block"></i>
              <h3 className="fw-bold text-success">{stats.active_users}</h3>
              <p className="text-muted mb-0">Active Users</p>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={4} className="mb-3">
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="text-center">
              <i className="bi bi-calendar-check text-primary fs-1 mb-3 d-block"></i>
              <h3 className="fw-bold text-primary">{stats.documents_today}</h3>
              <p className="text-muted mb-0">Documents Today</p>
            </Card.Body>
          </Card>
        </Col>

        <Col md={4} className="mb-3">
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="text-center">
              <i className="bi bi-clock-history text-warning fs-1 mb-3 d-block"></i>
              <h3 className="fw-bold text-warning">{stats.pending_documents || 0}</h3>
              <p className="text-muted mb-0">Pending Review</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Recent Documents */}
      <Row className="mb-4">
        <Col>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white border-0 py-3">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0 fw-bold">Recent Documents</h5>
                <Button 
                  as={Link} 
                  to="/document" 
                  variant="outline-primary" 
                  size="sm"
                >
                  View All
                </Button>
              </div>
            </Card.Header>
            <Card.Body className="p-0">
              <Table hover responsive className="mb-0">
                <thead className="bg-light">
                  <tr>
                    <th>Document ID</th>
                    <th>Title</th>
                    <th>Uploaded By</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {recentDocuments.length > 0 ? (
                    recentDocuments.map((doc) => (
                      <tr key={doc.id}>
                        <td><code>{doc.document_id}</code></td>
                        <td>{doc.title}</td>
                        <td>{doc.uploader?.name}</td>
                        <td>{getDocumentStatusBadge(doc)}</td>
                        <td>{new Date(doc.created_at).toLocaleDateString()}</td>
                        <td>
                          <Button
                            as={Link}
                            to={`/document/${doc.id}`}
                            variant="outline-primary"
                            size="sm"
                          >
                            <i className="bi bi-eye"></i>
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="text-center py-4 text-muted">
                        No documents found
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Recent Activities */}
      <Row>
        <Col>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white border-0 py-3">
              <h5 className="mb-0 fw-bold">Recent Activities</h5>
            </Card.Header>
            <Card.Body>
              {recentActivities.length > 0 ? (
                <div className="activity-timeline">
                  {recentActivities.map((activity, index) => (
                    <div key={activity.id} className="d-flex mb-3">
                      <div className="me-3">
                        <div 
                          className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center"
                          style={{ width: '40px', height: '40px' }}
                        >
                          <i className={`bi bi-${
                            activity.activity_type === 'uploaded' ? 'cloud-upload' :
                            activity.activity_type === 'viewed' ? 'eye' :
                            activity.activity_type === 'downloaded' ? 'download' :
                            activity.activity_type === 'acknowledged' ? 'check-circle' :
                            'file-earmark'
                          }`}></i>
                        </div>
                      </div>
                      <div className="flex-grow-1">
                        <p className="mb-1">
                          <strong>{activity.user?.name}</strong> {activity.activity_type} 
                          <strong> {activity.document?.title}</strong>
                        </p>
                        <small className="text-muted">
                          {new Date(activity.created_at).toLocaleString()}
                        </small>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted py-4">No recent activities</p>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default AdminDashboard;