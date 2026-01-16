import React, { useState, useEffect, useCallback, memo, useRef } from 'react';
import {
  Container, Row, Col, Card, Table, Badge,
  Button, Form, Pagination, Spinner, Dropdown, InputGroup, Modal
} from 'react-bootstrap';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { BsQrCodeScan } from 'react-icons/bs';
import api from '../../services/api';
import '../../css/documents/documentlist.css';
import '../../css/admin/admin-dashboard.css';
import '../../css/components/create-user-modal.css';

/* ============================================================
   Custom Dropdown Component (like Create User Modal)
=============================================================== */
const FilterSelect = ({ label, value, options, onChange, placeholder = "Select" }) => {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  return (
    <div className="cu-select-wrapper" ref={wrapperRef}>
      {label && <label className="cu-label">{label}</label>}
      <div
        className={`cu-select-trigger ${open ? 'open' : ''}`}
        onClick={() => setOpen(o => !o)}
        style={{ height: '40px', fontSize: '0.95rem' }}
      >
        <span>{options.find(o => o.value === value)?.label || placeholder}</span>
        <span className="cu-select-arrow">▾</span>
      </div>
      {open && (
        <div className="cu-select-options">
          {options.map(opt => (
            <div
              key={opt.value}
              className={`cu-select-option ${opt.value === value ? 'active' : ''}`}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ============================================================
   DOCUMENT TABLE (ALL 7 COLUMNS FIXED)
=============================================================== */
const DocumentTable = memo(({ documents, pagination, loading, fetchDocuments, onDeleteClick, user }) => {
  const navigate = useNavigate();

  const handleRowClick = (docId) => {
    navigate(`/document/${docId}`);
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Check if document should be highlighted (user is recipient and not acknowledged)
  const shouldHighlight = (doc) => {
    if (!user || !doc.recipients || doc.recipients.length === 0) {
      return false;
    }
    
    // Find if current user is a recipient
    const userRecipient = doc.recipients.find(r => r.id === user.id);
    
    // Highlight if user is recipient AND not acknowledged
    // If pivot doesn't exist or is_acknowledged is false/null, highlight it
    if (!userRecipient || !userRecipient.pivot) {
      return false;
    }
    
    return !userRecipient.pivot.is_acknowledged;
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <Badge className="badge-sm badge-pending">Pending</Badge>;
      case 'processing':
        return <Badge className="badge-sm badge-on-review">Processing</Badge>;
      case 'completed':
        return <Badge className="badge-sm badge-completed">Completed</Badge>;
      case 'failed':
        return <Badge className="badge-sm badge-failed">Failed</Badge>;
      case 'on_hold':
        return <Badge className="badge-sm badge-on-hold">On Hold</Badge>;
      case 'on_review':
        return <Badge className="badge-sm badge-on-review">On Review</Badge>;
      default:
        return <Badge className="badge-sm badge-on-hold">Unknown</Badge>;
    }
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
    const label = labels[type] || 'Unclassified';
    const variant = variants[type] || 'secondary';
    
    return (
      <Badge bg={variant} className="badge-sm">
        {label}
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
            <thead>
              <tr>
                <th style={{ width: '180px' }}>ID</th>
                <th style={{ width: '200px' }}>Title</th>
                <th style={{ width: '140px' }}>Classification</th>
                <th style={{ width: '180px' }}>Uploader</th>
                <th style={{ width: '140px' }}>Recipients</th>
                <th style={{ width: '140px' }}>Status</th>
                <th style={{ width: '150px' }}>Date</th>
                <th style={{ width: '200px' }}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {documents.length > 0 ? (
                documents.map((doc) => {
                  const isUnacknowledged = shouldHighlight(doc);
                  return (
                    <tr 
                      key={doc.id}
                      className={`clickable-row ${isUnacknowledged ? 'unacknowledged-document' : ''}`}
                      onClick={() => handleRowClick(doc.id)}
                    >

                    <td style={{ width: '180px' }}>
                      <code className="id-big">{doc.document_id}</code>
                    </td>

                    <td style={{ width: '200px' }} className="text-truncate">
                      {doc.title}
                    </td>

                    <td style={{ width: '140px' }}>
                      {getClassificationBadge(doc.classification)}
                    </td>

                    <td style={{ width: '180px' }}>
                      {doc.uploader?.name || 'Unknown'}
                    </td>

                    <td style={{ width: '140px' }}>
                      <Badge bg="secondary" className="badge-sm">
                        {doc.recipients?.length || 0} recipients
                      </Badge>
                    </td>

                    <td style={{ width: '140px' }}>
                      {getStatusBadge(doc.status)}
                    </td>

                    <td style={{ width: '150px' }}>
                      {formatDate(doc.created_at)}
                    </td>

                    <td style={{ width: '200px' }}>
                      <Button
                        size="sm"
                        variant="danger"
                        className="fw-semibold"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteClick(doc);
                        }}
                      >
                        <i className="bi bi-trash me-1"></i> Delete
                      </Button>
                    </td>

                  </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="8" className="text-center py-5 text-muted">
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
  const navigate = useNavigate();

  const [documents, setDocuments] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(false);

  const [manualSearch, setManualSearch] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);

  const [filterStatus, setFilterStatus] = useState('all');
  const [filterFileType, setFilterFileType] = useState('all');
  const [filterClassification, setFilterClassification] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);

  /* ====================== QR SCANNER LOGIC ====================== */
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [qrScanning, setQrScanning] = useState(false);
  const qrCodeReaderRef = useRef(null);

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
          classification: filterClassification !== 'all' ? filterClassification : undefined,
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
    [filterStatus, filterFileType, filterClassification, sortBy, fromDate, toDate]
  );

  useEffect(() => {
    fetchDocuments(1);
  }, [filterStatus, filterFileType, filterClassification, sortBy, fromDate, toDate, location.pathname]);

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
    setFilterClassification('all');
    setSortBy('newest');
    setFromDate('');
    setToDate('');
    setManualSearch('');
    fetchDocuments(1);
  };

  /* ====================== QR SCANNER ====================== */
  const startQRScanner = async () => {
    try {
      setShowQRScanner(true);
      
      // Wait for modal to render
      setTimeout(async () => {
        try {
          setQrScanning(true);
          const qrCodeReader = new Html5Qrcode("qr-scanner");
          qrCodeReaderRef.current = qrCodeReader;

          await qrCodeReader.start(
            { facingMode: 'environment' },
            {
              fps: 10,
              qrbox: { width: 250, height: 250 }
            },
            (decodedText) => {
              // QR code scanned successfully
              handleQRScanSuccess(decodedText);
            },
            (errorMessage) => {
              // Ignore scanning errors (they're frequent during scanning)
            }
          );
        } catch (err) {
          console.error('QR Scanner error:', err);
          setQrScanning(false);
          alert('Unable to start QR scanner. Please ensure camera permissions are granted.');
        }
      }, 100);
    } catch (err) {
      console.error('QR Scanner setup error:', err);
      setQrScanning(false);
      setShowQRScanner(false);
    }
  };

  const stopQRScanner = () => {
    if (qrCodeReaderRef.current) {
      qrCodeReaderRef.current.stop().then(() => {
        qrCodeReaderRef.current.clear();
        qrCodeReaderRef.current = null;
      }).catch((err) => {
        console.error('Error stopping QR scanner:', err);
      });
    }
    setQrScanning(false);
    setShowQRScanner(false);
  };

  const handleQRScanSuccess = (decodedText) => {
    // Stop scanner
    stopQRScanner();
    
    // Check if it's an internal route (starts with /)
    if (decodedText.startsWith('/')) {
      // Internal route - navigate within the app
      navigate(decodedText);
      return;
    }
    
    // Check if the scanned text is a URL (http:// or https://)
    const isUrl = /^https?:\/\//i.test(decodedText);
    
    if (isUrl) {
      // Check if it's an internal route (contains /document/)
      if (decodedText.includes('/document/')) {
        // Extract the document ID from the URL
        const match = decodedText.match(/\/document\/(\d+)/);
        if (match && match[1]) {
          // Navigate to the document view
          navigate(`/document/${match[1]}`);
          return;
        }
      }
      
      // External URL - open in new tab
      window.open(decodedText, '_blank');
      return;
    }
    
    // If it's not a URL or route, treat it as a search term
    setManualSearch(decodedText);
    setSuggestions([]);
    setShowAutocomplete(false);
    
    // Trigger search
    fetchDocuments(1, decodedText);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (qrCodeReaderRef.current) {
        qrCodeReaderRef.current.stop().catch(() => {});
      }
    };
  }, []);

  return (
    <div className="user-dashboard-container">
    <Container>

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
                  <div style={{ position: 'relative' }}>
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
                      style={{ 
                        height: '40px', 
                        fontSize: '0.95rem', 
                        paddingRight: manualSearch ? '45px' : '50px' 
                      }}
                    />
                    {/* QR Scanner Button - Only show when search field is empty */}
                    {!manualSearch && (
                      <button
                        type="button"
                        className="qr-scanner-btn"
                        onClick={startQRScanner}
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
                        title="Scan QR Code"
                      >
                        <BsQrCodeScan />
                      </button>
                    )}
                    {manualSearch && (
                      <button
                        type="button"
                        className="search-clear-btn"
                        onClick={() => {
                          setManualSearch('');
                          setSuggestions([]);
                          setShowAutocomplete(false);
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
                  <FilterSelect
                    value={filterStatus}
                    onChange={(value) => setFilterStatus(value)}
                    options={[
                      { value: 'all', label: 'All Status' },
                      { value: 'pending', label: 'Pending' },
                      { value: 'processing', label: 'Processing' },
                      { value: 'completed', label: 'Completed' },
                      { value: 'failed', label: 'Failed' }
                    ]}
                    placeholder="All Status"
                  />
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
                        <FilterSelect
                          label="File Type"
                          value={filterFileType}
                          onChange={(value) => setFilterFileType(value)}
                          options={[
                            { value: 'all', label: 'All' },
                            { value: 'pdf', label: 'PDF' },
                            { value: 'docx', label: 'DOCX' },
                            { value: 'xlsx', label: 'XLSX' },
                            { value: 'image', label: 'Images' },
                            { value: 'zip', label: 'ZIP' }
                          ]}
                          placeholder="All"
                        />
                      </Form.Group>

                      <Form.Group className="mb-3">
                        <FilterSelect
                          label="Classification"
                          value={filterClassification}
                          onChange={(value) => setFilterClassification(value)}
                          options={[
                            { value: 'all', label: 'All Types' },
                            { value: 'invoice', label: 'Invoice' },
                            { value: 'contract', label: 'Contract' },
                            { value: 'report', label: 'Report' },
                            { value: 'form', label: 'Form' },
                            { value: 'other', label: 'Other' }
                          ]}
                          placeholder="All Types"
                        />
                      </Form.Group>

                      <Form.Group className="mb-3">
                        <FilterSelect
                          label="Sort"
                          value={sortBy}
                          onChange={(value) => setSortBy(value)}
                          options={[
                            { value: 'newest', label: 'Newest' },
                            { value: 'oldest', label: 'Oldest' },
                            { value: 'a-z', label: 'Title A–Z' },
                            { value: 'z-a', label: 'Title Z–A' }
                          ]}
                          placeholder="Newest"
                        />
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
            user={user}
          />
        </Col>
      </Row>

      {/* QR Scanner Modal */}
      <Modal 
        show={showQRScanner} 
        onHide={stopQRScanner} 
        centered 
        size="md"
        backdrop="static"
        keyboard={false}
      >
        <Modal.Header className="border-bottom">
          <h5 className="fw-bold mb-0">
            <BsQrCodeScan className="me-2" />
            Scan QR Code
          </h5>
        </Modal.Header>
        <Modal.Body className="d-flex flex-column align-items-center p-4">
          <div 
            id="qr-scanner"
            style={{
              width: '100%',
              maxWidth: '400px',
              minHeight: '300px',
              border: '2px solid #e2e8f0',
              borderRadius: '8px',
              overflow: 'hidden'
            }}
          />
          {qrScanning && (
            <p className="text-muted mt-3 mb-0 text-center">
              Position the QR code within the frame
            </p>
          )}
        </Modal.Body>
        <Modal.Footer className="border-top">
          <Button 
            variant="secondary" 
            onClick={stopQRScanner}
            className="fw-semibold"
          >
            Cancel
          </Button>
        </Modal.Footer>
      </Modal>

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
    </div>
  );
};

export default DocumentList;
