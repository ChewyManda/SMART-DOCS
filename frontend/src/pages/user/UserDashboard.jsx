

import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Form } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import api from '../../services/api';

const UserDashboard = ({ user }) => {
  const [documents, setDocuments] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    unread: 0,
    acknowledged: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await api.get('/document');
      const docs = response.data.data;
      setDocuments(docs);
      
      // Calculate stats
      const unread = docs.filter(d => !d.pivot?.is_viewed).length;
      const acknowledged = docs.filter(d => d.pivot?.is_acknowledged).length;
      
      setStats({
        total: docs.length,
        unread,
        acknowledged,
      });
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      fetchDocuments();
      return;
    }

    try {
      const response = await api.get(`/document/search?query=${searchQuery}`);
      setDocuments(response.data.data);
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  const getStatusBadge = (doc) => {
    if (!doc.pivot?.is_viewed) {
      return <Badge bg="primary">New</Badge>;
    }
    if (doc.pivot?.is_acknowledged) {
      return <Badge bg="success">Acknowledged</Badge>;
    }
    return <Badge bg="secondary">Viewed</Badge>;
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
          <h2 className="fw-bold">My Documents</h2>
          <p className="text-muted">Welcome back, {user.name}!</p>
        </Col>
      </Row>

      {/* Statistics Cards */}
      <Row className="mb-4">
        <Col md={4} className="mb-3">
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="text-center">
              <i className="bi bi-file-earmark-text text-primary fs-1 mb-3 d-block"></i>
              <h3 className="fw-bold text-primary">{stats.total}</h3>
              <p className="text-muted mb-0">Total Documents</p>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={4} className="mb-3">
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="text-center">
              <i className="bi bi-envelope text-warning fs-1 mb-3 d-block"></i>
              <h3 className="fw-bold text-warning">{stats.unread}</h3>
              <p className="text-muted mb-0">Unread Documents</p>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={4} className="mb-3">
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="text-center">
              <i className="bi bi-check-circle text-success fs-1 mb-3 d-block"></i>
              <h3 className="fw-bold text-success">{stats.acknowledged}</h3>
              <p className="text-muted mb-0">Acknowledged</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Search Bar */}
      <Row className="mb-4">
        <Col>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <Form onSubmit={handleSearch}>
                <Row>
                  <Col md={10}>
                    <Form.Control
                      type="text"
                      placeholder="Search documents by title, ID, or content..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="rounded-3"
                    />
                  </Col>
                  <Col md={2}>
                    <Button 
                      type="submit" 
                      variant="primary" 
                      className="w-100 rounded-3"
                    >
                      <i className="bi bi-search me-2"></i>
                      Search
                    </Button>
                  </Col>
                </Row>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Documents List */}
      <Row>
        <Col>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white border-0 py-3">
              <h5 className="mb-0 fw-bold">My Documents</h5>
            </Card.Header>
            <Card.Body className="p-0">
              <Table hover responsive className="mb-0">
                <thead className="bg-light">
                  <tr>
                    <th>Document ID</th>
                    <th>Title</th>
                    <th>Received From</th>
                    <th>Date Received</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.length > 0 ? (
                    documents.map((doc) => (
                      <tr 
                        key={doc.id}
                        className={!doc.pivot?.is_viewed ? 'table-primary' : ''}
                      >
                        <td><code>{doc.document_id}</code></td>
                        <td>
                          <strong>{doc.title}</strong>
                          {!doc.pivot?.is_viewed && (
                            <Badge bg="primary" className="ms-2">NEW</Badge>
                          )}
                        </td>
                        <td>{doc.uploader?.name}</td>
                        <td>{new Date(doc.created_at).toLocaleDateString()}</td>
                        <td>{getStatusBadge(doc)}</td>
                        <td>
                          <Button
                            as={Link}
                            to={`/document/${doc.id}`}
                            variant="outline-primary"
                            size="sm"
                            className="me-2"
                          >
                            <i className="bi bi-eye me-1"></i>
                            View
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="text-center py-5">
                        <i className="bi bi-inbox fs-1 text-muted d-block mb-3"></i>
                        <p className="text-muted">
                          {searchQuery ? 'No documents found matching your search' : 'No documents received yet'}
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default UserDashboard;