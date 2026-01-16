import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Row, Col, Card, Table, Badge,
  Button, Form, Pagination, Spinner
} from 'react-bootstrap';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import '../../css/documents/documentlist.css';

const PendingApproval = ({ user }) => {
  const [documents, setDocuments] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchDocuments = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const params = {
        page,
        status: 'pending',
        query: searchTerm || undefined,
      };

      const response = await api.get('/document', { params });

      setDocuments(response.data.data);
      setPagination({
        current_page: response.data.current_page,
        last_page: response.data.last_page,
        total: response.data.total,
      });
    } catch (err) {
      console.error('Fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  useEffect(() => {
    fetchDocuments(1);
  }, []);

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getClassificationBadge = (classification) => {
    const variants = {
      invoice: 'primary',
      contract: 'success',
      report: 'info',
      form: 'warning',
      other: 'secondary'
    };
    const labels = {
      invoice: 'Invoice',
      contract: 'Contract',
      report: 'Report',
      form: 'Form',
      other: 'Other'
    };
    const type = classification || 'other';
    return (
      <Badge bg={variants[type] || 'secondary'} className="badge-sm">
        {labels[type] || 'Unclassified'}
      </Badge>
    );
  };

  const renderPagination = () => {
    if (!pagination.last_page || pagination.last_page <= 1) return null;

    const maxButtons = 5;
    const currentPage = pagination.current_page;
    const totalPages = pagination.last_page;

    let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
    let endPage = startPage + maxButtons - 1;

    if (endPage > totalPages) {
      endPage = totalPages;
      startPage = Math.max(1, endPage - maxButtons + 1);
    }

    const pages = [];
    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <Pagination.Item key={i} active={i === currentPage} onClick={() => fetchDocuments(i)}>
          {i}
        </Pagination.Item>
      );
    }

    return (
      <Pagination className="justify-content-center mb-0">
        <Pagination.First disabled={currentPage === 1} onClick={() => fetchDocuments(1)} />
        <Pagination.Prev disabled={currentPage === 1} onClick={() => fetchDocuments(currentPage - 1)} />
        {pages}
        <Pagination.Next disabled={currentPage === totalPages} onClick={() => fetchDocuments(currentPage + 1)} />
        <Pagination.Last disabled={currentPage === totalPages} onClick={() => fetchDocuments(totalPages)} />
      </Pagination>
    );
  };

  return (
    <Container fluid className="document-list-container">
      {/* Header */}
      <Row className="page-header mb-4">
        <Col>
          <h2 className="dashboard-title fw-bold">Pending Approval</h2>
          <p className="dashboard-subtitle text-secondary">
            Documents awaiting your review and approval
          </p>
        </Col>
      </Row>

      {/* Search */}
      <Row className="mb-4">
        <Col>
          <Card className="custom-card-search">
            <Card.Body>
              <Row className="g-3 align-items-center">
                <Col lg={8}>
                  <div style={{ position: 'relative' }}>
                    <Form.Control
                      type="text"
                      placeholder="Search documents..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && fetchDocuments(1)}
                      style={{ height: '40px', paddingRight: searchTerm ? '45px' : '12px' }}
                    />
                    {searchTerm && (
                      <button
                        type="button"
                        className="search-clear-btn"
                        onClick={() => {
                          setSearchTerm('');
                          fetchDocuments(1);
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
                <Col lg={4}>
                  <Button
                    className="w-100 custom-btn-search fw-semibold"
                    onClick={() => fetchDocuments(1)}
                    style={{ height: '40px' }}
                  >
                    <i className="bi bi-search me-1"></i> Search
                  </Button>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Table */}
      <Row>
        <Col>
          <Card className="custom-card-list">
            <Card.Header className="custom-card-list-header d-flex justify-content-between align-items-center">
              <h5 className="mb-0 fw-bold">
                <i className="bi bi-hourglass-split me-2 text-warning"></i>
                Pending Documents
              </h5>
              <Badge bg="warning" text="dark" className="px-3 py-2">
                {pagination.total || 0} pending
              </Badge>
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
                      <th>Document ID</th>
                      <th>Title</th>
                      <th>Classification</th>
                      <th>Submitted By</th>
                      <th>Date Submitted</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documents.length > 0 ? (
                      documents.map((doc) => (
                        <tr key={doc.id}>
                          <td><code className="id-big">{doc.document_id}</code></td>
                          <td className="text-truncate" style={{ maxWidth: '200px' }}>{doc.title}</td>
                          <td>{getClassificationBadge(doc.classification)}</td>
                          <td>{doc.uploader?.name || 'Unknown'}</td>
                          <td>{formatDate(doc.created_at)}</td>
                          <td>
                            <Button
                              as={Link}
                              to={`/document/${doc.id}`}
                              size="sm"
                              className="custom-btn-view fw-semibold"
                            >
                              <i className="bi bi-eye me-1"></i> Review
                            </Button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="text-center py-5 text-muted">
                          <i className="bi bi-check-circle fs-1 mb-3 text-success"></i>
                          <br />
                          No documents pending approval
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>

              {pagination.last_page > 1 && (
                <Card.Footer className="custom-card-list-footer d-flex justify-content-center">
                  {renderPagination()}
                </Card.Footer>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default PendingApproval;
