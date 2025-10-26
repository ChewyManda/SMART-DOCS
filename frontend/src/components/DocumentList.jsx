

import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Form, Pagination } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import api from '../services/api';

const DocumentList = ({ user }) => {
  const [documents, setDocuments] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async (page = 1) => {
    try {
      const response = await api.get(`/document?page=${page}`);
      setDocuments(response.data.data);
      setPagination({
        current_page: response.data.current_page,
        last_page: response.data.last_page,
        total: response.data.total,
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

    setLoading(true);
    try {
      const response = await api.get(`/document/search?query=${searchQuery}`);
      setDocuments(response.data.data);
      setPagination({
        current_page: response.data.current_page,
        last_page: response.data.last_page,
        total: response.data.total,
      });
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      processing: 'info',
      completed: 'success',
      failed: 'danger',
    };
    return <Badge bg={variants[status]}>{status.toUpperCase()}</Badge>};

  const filteredDocuments = documents.filter(doc => {
    if (filterStatus === 'all') return true;
    return doc.status === filterStatus;
  });

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
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 className="fw-bold">Documents</h2>
              <p className="text-muted">Browse and manage all documents</p>
            </div>
            {(user.role === 'admin' || user.role === 'staff') && (
              <Button
                as={Link}
                to="/upload"
                variant="primary"
                style={{
                  background: 'linear-gradient(45deg, #ff4400, #e0681e)',
                  border: 'none'
                }}
              >
                <i className="bi bi-plus-lg me-2"></i>
                Upload Document
              </Button>
            )}
          </div>
        </Col>
      </Row>

      {/* Search and Filter */}
      <Row className="mb-4">
        <Col>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <Form onSubmit={handleSearch}>
                <Row>
                  <Col md={8}>
                    <Form.Control
                      type="text"
                      placeholder="Search documents by title, ID, or content..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="rounded-3"
                    />
                  </Col>
                  <Col md={2}>
                    <Form.Select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="rounded-3"
                    >
                      <option value="all">All Status</option>
                      <option value="processing">Processing</option>
                      <option value="completed">Completed</option>
                      <option value="failed">Failed</option>
                    </Form.Select>
                  </Col>
                  <Col md={2}>
                    <Button type="submit" variant="primary" className="w-100 rounded-3">
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

      
      <Row>
        <Col>
          <Card className="border-0 shadow-sm">
            <Card.Body className="p-0">
              <Table hover responsive className="mb-0">
                <thead className="bg-light">
                  <tr>
                    <th>Document ID</th>
                    <th>Title</th>
                    <th>Uploaded By</th>
                    <th>Recipients</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDocuments.length > 0 ? (
                    filteredDocuments.map((doc) => (
                      <tr key={doc.id}>
                        <td><code>{doc.document_id}</code></td>
                        <td>
                          <strong>{doc.title}</strong>
                          {doc.pivot && !doc.pivot.is_viewed && (
                            <Badge bg="primary" className="ms-2">NEW</Badge>
                          )}
                        </td>
                        <td>{doc.uploader?.name || 'Unknown'}</td>
                        <td>
                          <Badge bg="secondary">
                            {doc.recipients?.length || 0} recipients
                          </Badge>
                        </td>
                        <td>{getStatusBadge(doc.status)}</td>
                        <td>{new Date(doc.created_at).toLocaleDateString()}</td>
                        <td>
                          <Button
                            as={Link}
                            to={`/document/${doc.id}`}
                            variant="outline-primary"
                            size="sm"
                          >
                            <i className="bi bi-eye me-1"></i>
                            View
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="text-center py-5">
                        <i className="bi bi-inbox fs-1 text-muted d-block mb-3"></i>
                        <p className="text-muted">
                          {searchQuery || filterStatus !== 'all'
                            ? 'No documents found matching your criteria'
                            : 'No documents available'}
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </Card.Body>

            {/* Pagination */}
            {pagination.last_page > 1 && (
              <Card.Footer className="bg-white border-0 py-3">
                <div className="d-flex justify-content-between align-items-center">
                  <div className="text-muted">
                    Showing page {pagination.current_page} of {pagination.last_page}
                  </div>
                  <Pagination className="mb-0">
                    <Pagination.First
                      onClick={() => fetchDocuments(1)}
                      disabled={pagination.current_page === 1}
                    />
                    <Pagination.Prev
                      onClick={() => fetchDocuments(pagination.current_page - 1)}
                      disabled={pagination.current_page === 1}
                    />
                    
                    {[...Array(pagination.last_page)].map((_, index) => {
                      const pageNum = index + 1;
                      if (
                        pageNum === 1 ||
                        pageNum === pagination.last_page ||
                        (pageNum >= pagination.current_page - 1 && pageNum <= pagination.current_page + 1)
                      ) {
                        return (
                          <Pagination.Item
                            key={pageNum}
                            active={pageNum === pagination.current_page}
                            onClick={() => fetchDocuments(pageNum)}
                          >
                            {pageNum}
                          </Pagination.Item>
                        );
                      } else if (
                        pageNum === pagination.current_page - 2 ||
                        pageNum === pagination.current_page + 2
                      ) {
                        return <Pagination.Ellipsis key={pageNum} disabled />;
                      }
                      return null;
                    })}

                    <Pagination.Next
                      onClick={() => fetchDocuments(pagination.current_page + 1)}
                      disabled={pagination.current_page === pagination.last_page}
                    />
                    <Pagination.Last
                      onClick={() => fetchDocuments(pagination.last_page)}
                      disabled={pagination.current_page === pagination.last_page}
                    />
                  </Pagination>
                </div>
              </Card.Footer>
            )}
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default DocumentList;