import React, { useState, useEffect, useCallback, memo, useRef } from 'react';
import {
  Container, Row, Col, Card, Table, Badge,
  Button, Form, Pagination, Spinner, Dropdown, InputGroup, Modal
} from 'react-bootstrap';
import { Link, useLocation } from 'react-router-dom';
import api from '../../services/api';
import '../../css/documents/documentlist.css';

/* ============================================================
   DOCUMENT TABLE (ALL 7 COLUMNS FIXED)
=============================================================== */
const DocumentTable = memo(({ documents, pagination, loading, fetchDocuments, onDeleteClick }) => {

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusBadge = (status) => {
    const variants = {
      pending: 'warning',
      processing: 'info',
      completed: 'success',
      failed: 'danger'
    };
    return <Badge bg={variants[status] || 'secondary'} className="fw-semibold">{status}</Badge>;
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
    if (startPage > 1)
      pages.push(<Pagination.Ellipsis key="start-ellipsis" disabled />);

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <Pagination.Item key={i} active={i === currentPage} onClick={() => fetchDocuments(i)}>
          {i}
        </Pagination.Item>
      );
    }

    if (endPage < totalPages)
      pages.push(<Pagination.Ellipsis key="end-ellipsis" disabled />);

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
    <Card className="custom-card-list">
      <Card.Header className="custom-card-list-header d-flex justify-content-between align-items-center">
        <h5 className="mb-0 fw-bold">Document List</h5>
      </Card.Header>

      <Card.Body className="p-0">
        <div className="table-responsive position-relative">

          {loading && (
            <div className="table-loading-overlay d-flex justify-content-center align-items-center">
              <Spinner animation="border" variant="primary" />
            </div>
          )}

          <Table className="dashboard-table mb-0">
            <thead className="table-light">
              <tr>
                <th className="fw-semibold" style={{ width: '180px' }}>ID</th>
                <th className="fw-semibold" style={{ width: '200px' }}>Title</th>
                <th className="fw-semibold" style={{ width: '180px' }}>Uploader</th>
                <th className="fw-semibold" style={{ width: '140px' }}>Recipients</th>
                <th className="fw-semibold" style={{ width: '140px' }}>Status</th>
                <th className="fw-semibold" style={{ width: '150px' }}>Date</th>
                <th className="fw-semibold" style={{ width: '200px' }}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {documents.length > 0 ? (
                documents.map((doc) => (
                  <tr key={doc.id}>

                    <td style={{ width: '180px' }}>
                      <code>{doc.document_id}</code>
                    </td>

                    <td style={{ width: '200px' }} className="text-truncate">
                      {doc.title}
                    </td>

                    <td style={{ width: '180px' }}>
                      {doc.uploader?.name || 'Unknown'}
                    </td>

                    <td style={{ width: '140px' }}>
                      <Badge bg="secondary" className="fw-semibold">
                        {doc.recipients?.length || 0} recipients
                      </Badge>
                    </td>

                    <td style={{ width: '140px' }}>
                      {getStatusBadge(doc.status)}
                    </td>

                    <td style={{ width: '150px' }}>
                      {formatDate(doc.created_at)}
                    </td>

                    <td style={{ width: '200px' }} className="d-flex gap-2">
                      <Button
                        as={Link}
                        to={`/document/${doc.id}`}
                        size="sm"
                        className="custom-btn-view fw-semibold"
                      >
                        <i className="bi bi-eye me-1"></i> View
                      </Button>

                      <Button
                        size="sm"
                        variant="danger"
                        className="fw-semibold"
                        onClick={() => onDeleteClick(doc)}
                      >
                        <i className="bi bi-trash me-1"></i> Delete
                      </Button>
                    </td>

                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="text-center py-5 text-muted">
                    <i className="bi bi-inbox fs-1 mb-3"></i>
                    <br />
                    No documents found
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </div>

        {pagination.last_page > 1 && (
          <Card.Footer className="custom-card-list-footer d-flex justify-content-center align-items-center">
            {renderPagination()}
          </Card.Footer>
        )}
      </Card.Body>
    </Card>
  );
});

/* ============================================================
   MAIN DOCUMENT LIST PAGE
=============================================================== */
const DocumentList = ({ user }) => {
  const location = useLocation();

  const [documents, setDocuments] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(false);

  const [manualSearch, setManualSearch] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);

  const [filterStatus, setFilterStatus] = useState('all');
  const [filterFileType, setFilterFileType] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);

  /* ====================== DELETE MODAL LOGIC ====================== */
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [docToDelete, setDocToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const onDeleteClick = (doc) => {
    setDocToDelete(doc);
    setShowDeleteModal(true);
  };

  const deleteDocument = async () => {
    if (!docToDelete) return;

    try {
      setDeleting(true);
      await api.delete(`/document/${docToDelete.id}`);
      setShowDeleteModal(false);
      setDocToDelete(null);
      fetchDocuments(1);
    } catch (err) {
      console.error("Delete failed:", err);
    } finally {
      setDeleting(false);
    }
  };

  /* ====================== FETCH DOCUMENTS ====================== */
  const fetchDocuments = useCallback(
    async (page = 1, searchValue = null) => {
      try {
        setLoading(true);

        const endpoint = searchValue ? '/document/search' : '/document';

        const params = {
          page,
          status: filterStatus !== 'all' ? filterStatus : undefined,
          file_type: filterFileType !== 'all' ? filterFileType : undefined,
          sort: sortBy !== 'newest' ? sortBy : undefined,
          from_date: fromDate || undefined,
          to_date: toDate || undefined,
        };

        if (searchValue) params.query = searchValue;

        const response = await api.get(endpoint, { params });

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
    },
    [filterStatus, filterFileType, sortBy, fromDate, toDate]
  );

  useEffect(() => {
    fetchDocuments(1);
  }, [filterStatus, filterFileType, sortBy, fromDate, toDate, location.pathname]);

  /* ====================== AUTOCOMPLETE ====================== */
  const fetchSuggestions = async (value) => {
    if (!value || value.length < 2) {
      setSuggestions([]);
      return;
    }
    try {
      const response = await api.get('/document/autocomplete', { params: { query: value } });
      setSuggestions(response.data.slice(0, 10));
    } catch (err) {
      console.error('Autocomplete error:', err);
    }
  };

  const handleKeyDown = (e) => {
    if (!showAutocomplete || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((prev) => (prev + 1) % suggestions.length);
    }
    else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((prev) => (prev <= 0 ? suggestions.length - 1 : prev - 1));
    }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightIndex >= 0) {
        const selected = suggestions[highlightIndex];
        setManualSearch(selected.title);
        fetchDocuments(1, selected.title);
        setSuggestions([]);
        setShowAutocomplete(false);
      }
    }
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        autocompleteRef.current &&
        !autocompleteRef.current.contains(e.target) &&
        !inputRef.current.contains(e.target)
      ) {
        setShowAutocomplete(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /* ====================== RESET FILTERS ====================== */
  const resetFilters = () => {
    setFilterStatus('all');
    setFilterFileType('all');
    setSortBy('newest');
    setFromDate('');
    setToDate('');
    setManualSearch('');
    fetchDocuments(1);
  };

  return (
    <Container fluid className="document-list-container">

      {/* HEADER */}
      <Row className="page-header mb-4">
        <Col md={6}>
          <h2 className="dashboard-title fw-bold">Documents</h2>
          <p className="dashboard-subtitle text-secondary">Browse and manage all documents</p>
        </Col>

        {(user.role === 'admin' || user.role === 'staff') && (
          <Col md={6} className="text-md-end mt-3 mt-md-0">
            <Button
              as={Link}
              to="/upload"
              className="upload-btn-document-list shadow-sm fw-semibold"
            >
              <i className="bi bi-plus-lg me-2"></i> Upload Document
            </Button>
          </Col>
        )}
      </Row>

      {/* SEARCH + FILTERS */}
      <Row className="mb-4">
        <Col>
          <Card className="custom-card-search">
            <Card.Body>
              <Row className="g-3 align-items-center">

                {/* SEARCH */}
                <Col lg={6} style={{ position: 'relative' }}>
                  <Form.Control
                    ref={inputRef}
                    type="text"
                    placeholder="Search title, ID, or keywords..."
                    value={manualSearch}
                    onChange={(e) => {
                      setManualSearch(e.target.value);
                      fetchSuggestions(e.target.value);
                      setShowAutocomplete(true);
                      setHighlightIndex(-1);
                    }}
                    onKeyDown={handleKeyDown}
                    onFocus={() => { if (suggestions.length > 0) setShowAutocomplete(true); }}
                    style={{ height: '40px', fontSize: '0.95rem' }}
                  />

                  {showAutocomplete && suggestions.length > 0 && (
                    <ul ref={autocompleteRef} className="autocomplete-suggestions list-unstyled shadow-sm">
                      {suggestions.map((s, index) => (
                        <li
                          key={s.id}
                          className={highlightIndex === index ? 'active' : ''}
                          onMouseEnter={() => setHighlightIndex(index)}
                          onClick={() => {
                            setManualSearch(s.title);
                            fetchDocuments(1, s.title);
                            setSuggestions([]);
                            setShowAutocomplete(false);
                          }}
                          style={{ fontSize: '0.9rem' }}
                        >
                          {s.title} ({s.document_id})
                        </li>
                      ))}
                    </ul>
                  )}
                </Col>

                {/* STATUS FILTER */}
                <Col lg={2}>
                  <Form.Select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    style={{ height: '40px', fontSize: '0.95rem' }}
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="completed">Completed</option>
                    <option value="failed">Failed</option>
                  </Form.Select>
                </Col>

                {/* SEARCH BUTTON */}
                <Col lg={2}>
                  <Button
                    className="w-100 custom-btn-search fw-semibold"
                    onClick={() => { fetchDocuments(1, manualSearch); setSuggestions([]); }}
                    style={{ height: '40px', fontSize: '0.95rem' }}
                  >
                    <i className="bi bi-search me-1"></i> Search
                  </Button>
                </Col>

                {/* MORE FILTERS */}
                <Col lg={2} className="text-end">
                  <Dropdown>
                    <Dropdown.Toggle
                      variant="outline-secondary"
                      className="w-100 fw-semibold dropdown-toggle-filter"
                      style={{ height: '40px', fontSize: '0.95rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      More Filters
                    </Dropdown.Toggle>

                    <Dropdown.Menu className="p-3" style={{ width: 300 }}>

                      <Form.Group className="mb-3">
                        <Form.Label>File Type</Form.Label>
                        <Form.Select
                          value={filterFileType}
                          onChange={(e) => setFilterFileType(e.target.value)}
                        >
                          <option value="all">All</option>
                          <option value="pdf">PDF</option>
                          <option value="docx">DOCX</option>
                          <option value="xlsx">XLSX</option>
                          <option value="image">Images</option>
                          <option value="zip">ZIP</option>
                        </Form.Select>
                      </Form.Group>

                      <Form.Group className="mb-3">
                        <Form.Label>Sort</Form.Label>
                        <Form.Select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value)}
                        >
                          <option value="newest">Newest</option>
                          <option value="oldest">Oldest</option>
                          <option value="a-z">Title A–Z</option>
                        </Form.Select>
                      </Form.Group>

                      <Form.Group className="mb-3">
                        <Form.Label>Date Range</Form.Label>
                        <InputGroup>
                          <Form.Control type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                          <Form.Control type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
                        </InputGroup>
                      </Form.Group>

                      <Button variant="outline-danger" className="w-100 fw-semibold" onClick={resetFilters}>
                        Reset Filters
                      </Button>

                    </Dropdown.Menu>
                  </Dropdown>
                </Col>

              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* DOCUMENT TABLE */}
      <Row>
        <Col>
          <DocumentTable
            documents={documents}
            pagination={pagination}
            loading={loading}
            fetchDocuments={fetchDocuments}
            onDeleteClick={onDeleteClick}
          />
        </Col>
      </Row>

      <Modal 
        show={showDeleteModal} 
        onHide={() => setShowDeleteModal(false)} 
        centered 
        size="sm"
        backdrop="static"
        keyboard={false}
        className="custom-delete-modal"
      >
        <Modal.Header className="border-bottom justify-content-center">
          <div className="text-center">
            <i className="bi bi-exclamation-triangle-fill text-warning fs-2 mb-2"></i>
            <h5 className="fw-bold mb-0">Confirm Deletion</h5>
          </div>
        </Modal.Header>

        <Modal.Body className="text-center">
          <p className="mb-3">
            Are you sure you want to permanently delete
            <br />
            <strong>{docToDelete?.title}</strong>?
          </p>
          <p className="text-muted small mb-0">This action cannot be undone.</p>
        </Modal.Body>

        <Modal.Footer className="justify-content-center border-top gap-3">
          <Button 
            variant="secondary" 
            onClick={() => setShowDeleteModal(false)}
            className="btn-cancel fw-semibold"
          >
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={deleteDocument} 
            disabled={deleting}
            className="btn-delete fw-semibold"
          >
            {deleting ? (
              <>
                <Spinner 
                  as="span" 
                  animation="border" 
                  size="sm" 
                  role="status" 
                  aria-hidden="true" 
                  className="me-2"
                />
                Deleting...
              </>
            ) : 'Delete'}
          </Button>
        </Modal.Footer>
      </Modal>


    </Container>
  );
};

export default DocumentList;
