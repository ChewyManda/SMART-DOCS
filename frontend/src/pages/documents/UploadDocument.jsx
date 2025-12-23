// UploadDocument.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  Container, Row, Col, Card, Form, Button, Alert, Badge, InputGroup, Spinner, Pagination
} from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import '../../css/documents/uploaddocument.css';

const ITEMS_PER_PAGE = 10;

const UploadDocument = ({ user }) => {
  const navigate = useNavigate();

  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');

  // Users
  const [users, setUsers] = useState([]);
  const [recipients, setRecipients] = useState([]);

  // Recipient UI state
  const [recSearch, setRecSearch] = useState('');
  const [recDeptFilter, setRecDeptFilter] = useState('all');
  const [recLevelFilter, setRecLevelFilter] = useState('all');
  const [recPage, setRecPage] = useState(1);

  // Status
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch users
  useEffect(() => {
    let mounted = true;
    const fetchUsers = async () => {
      setLoadingUsers(true);
      try {
        const res = await api.get('/admin/users');
        if (!mounted) return;
        setUsers(Array.isArray(res.data) ? res.data : res.data.data || []);
      } catch (err) {
        console.error('Failed to fetch users', err);
      } finally {
        if (mounted) setLoadingUsers(false);
      }
    };
    fetchUsers();
    return () => { mounted = false; };
  }, []);

  // Filtered users
  const filteredUsers = useMemo(() => {
    const q = recSearch.trim().toLowerCase();
    return users.filter(u => {
      if (recDeptFilter !== 'all' && (u.department || '').toLowerCase() !== recDeptFilter.toLowerCase()) return false;
      if (recLevelFilter !== 'all' && String(u.access_level) !== String(recLevelFilter)) return false;
      if (!q) return true;
      return (
        (u.name || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.department || '').toLowerCase().includes(q)
      );
    });
  }, [users, recSearch, recDeptFilter, recLevelFilter]);

  const totalRecPages = Math.max(1, Math.ceil(filteredUsers.length / ITEMS_PER_PAGE));
  const paginatedUsers = useMemo(() => {
    const start = (recPage - 1) * ITEMS_PER_PAGE;
    return filteredUsers.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredUsers, recPage]);

  // Recipient helpers
  const handleRecipientToggle = (userId) => {
    setRecipients(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
  };
  const selectAllFiltered = () => {
    const ids = filteredUsers.map(u => u.id);
    setRecipients(prev => Array.from(new Set([...prev, ...ids])));
  };
  const clearAllRecipients = () => setRecipients([]);

  // File handling
  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setFileName(f.name);
    setError('');
  };

  const clearFile = () => {
    setFile(null);
    setFileName('');
    document.getElementById('fileInput') && (document.getElementById('fileInput').value = '');
  };

  // Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!title.trim()) return setError('Document title is required.');
    if (!file) return setError('Please select a file to upload.');
    if (!recipients.length) return setError('Select at least one recipient.');

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('title', title);
      fd.append('description', description);
      fd.append('file', file);
      recipients.forEach(id => fd.append('recipients[]', id));

      // Upload file and let backend handle OCR
      await api.post('/document', fd, { headers: { 'Content-Type': 'multipart/form-data' } });

      setSuccess('Document uploaded successfully!');
      setTitle(''); setDescription(''); setFile(null); setFileName('');
      setRecipients([]);
      setRecSearch(''); setRecDeptFilter('all'); setRecLevelFilter('all'); setRecPage(1);

      setTimeout(() => navigate('/document'), 1400);
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.response?.data?.message || 'Failed to upload document.');
    } finally {
      setLoading(false);
    }
  };

  const deptOptions = useMemo(() => ['all', ...Array.from(new Set(users.map(u => u.department).filter(Boolean)))], [users]);
  const accessLevelOptions = useMemo(() => ['all', ...Array.from(new Set(users.map(u => u.access_level).filter(v => v !== undefined && v !== null))).sort((a,b)=>a-b)], [users]);
  const recipientLabel = (count) => `${count} ${count === 1 ? 'recipient' : 'recipients'}`;

  return (
    <Container fluid className="upload-document-container">
      <Row className="mb-4">
        <Col>
          <h2 className="dashboard-title">Upload Document</h2>
          <p className="dashboard-subtitle">Upload and distribute documents</p>
        </Col>
      </Row>

      <Form onSubmit={handleSubmit}>
        <Row className="g-4">

          {/* LEFT — Document Details */}
          <Col lg={8}>
            <Card className="custom-card-details shadow-sm border-0">
              <Card.Header className="custom-card-header">
                <h5 className="mb-0">Document Details</h5>
              </Card.Header>
              <Card.Body>
                {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
                {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

                <Form.Group className="mb-3">
                  <Form.Label className="fw-bold">Title <span className="text-danger">*</span></Form.Label>
                  <Form.Control type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Enter title" disabled={loading} />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label className="fw-bold">Description</Form.Label>
                  <Form.Control as="textarea" rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional description" disabled={loading} />
                </Form.Group>

                <Form.Group className="mb-4">
                  <Form.Label className="fw-bold">Select File <span className="text-danger">*</span></Form.Label>
                  <div className={`file-drop rounded-3 ${file ? 'has-file' : ''}`} onClick={() => document.getElementById('fileInput')?.click()}>
                    {!file ? (
                      <>
                        <i className="bi bi-cloud-upload-fill file-drop-icon" />
                        <div className="file-drop-text">
                          <strong>Drop files here or click to upload</strong>
                          <div className="text-muted small">PDF, JPG, PNG, DOC/DOCX — Max 10MB</div>
                        </div>
                      </>
                    ) : (
                      <div className="file-preview d-flex align-items-center justify-content-between">
                        <div>
                          <strong>{fileName}</strong>
                          <div className="text-muted small">{(file.size/1024/1024).toFixed(2)} MB</div>
                        </div>
                        <Button size="sm" variant="outline-secondary" onClick={e => { e.stopPropagation(); clearFile(); }}>Change</Button>
                      </div>
                    )}
                  </div>
                  <Form.Control id="fileInput" type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={handleFileChange} style={{ display: 'none' }} disabled={loading} />
                </Form.Group>

                <div className="d-flex justify-content-end gap-2">
                  <Button variant="outline-secondary" className="btn-orange" onClick={() => navigate('/document')} disabled={loading}>Cancel</Button>
                  <Button type="submit" variant="primary" className="upload-btn" disabled={loading}>
                    {loading ? <Spinner animation="border" size="sm" className="me-2" /> : <i className="bi bi-cloud-upload me-2" />}
                    {loading ? 'Uploading...' : 'Upload Document'}
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </Col>

          {/* RIGHT — Recipients */}
          <Col lg={4}>
            <Card className="custom-card-recipients shadow-sm border-0 mb-3">
              <Card.Header className="custom-card-header">
                <h5 className="mb-0">Recipients <Badge bg="secondary">{recipientLabel(recipients.length)}</Badge></h5>
              </Card.Header>
              <Card.Body>
                <InputGroup className="mb-2">
                  <Form.Control placeholder="Search recipients..." value={recSearch} onChange={e => { setRecSearch(e.target.value); setRecPage(1); }} disabled={loadingUsers} />
                  <Button variant="outline-secondary" className="btn-orange" onClick={() => { setRecSearch(''); setRecPage(1); }}>Clear</Button>
                </InputGroup>
                <Row className="g-2 mb-3">
                  <Col>
                    <Form.Select value={recDeptFilter} onChange={e => { setRecDeptFilter(e.target.value); setRecPage(1); }}>
                      {deptOptions.map((d,i) => <option key={i} value={d}>{d==='all'?'All departments':d}</option>)}
                    </Form.Select>
                  </Col>
                  <Col>
                    <Form.Select value={recLevelFilter} onChange={e => { setRecLevelFilter(e.target.value); setRecPage(1); }}>
                      {accessLevelOptions.map((l,i) => <option key={i} value={l}>{l==='all'?'All levels':`Level ${l}`}</option>)}
                    </Form.Select>
                  </Col>
                </Row>
                <div className="d-flex gap-2 mb-3">
                  <Button size="sm" variant="outline-success" onClick={selectAllFiltered}>Select all</Button>
                  <Button size="sm" className="btn-orange" variant="outline-secondary" onClick={clearAllRecipients}>Remove</Button>
                </div>
                <div className="recipients-list">
                  {loadingUsers ? (
                    <div className="py-4 text-center"><Spinner animation="border" /></div>
                  ) : paginatedUsers.length ? (
                    paginatedUsers.map(u => (
                      <div key={u.id} className="recipient-row d-flex justify-content-between align-items-center mb-2">
                        <div>
                          <div className="fw-bold">{u.name}</div>
                          <div className="small text-muted">{u.email} • {u.department || '—'}</div>
                        </div>
                        <Form.Check type="checkbox" checked={recipients.includes(u.id)} onChange={() => handleRecipientToggle(u.id)} />
                      </div>
                    ))
                  ) : (
                    <div className="py-4 text-center text-muted">
                      <i className="bi bi-people fs-3 mb-2" /><br/>
                      No recipients found
                    </div>
                  )}
                </div>
                {filteredUsers.length > ITEMS_PER_PAGE && (
                  <div className="mt-3 d-flex justify-content-center">
                    <Pagination size="sm" className="mb-0">
                      <Pagination.Prev onClick={() => setRecPage(p => Math.max(1, p-1))} disabled={recPage===1}/>
                      {[...Array(totalRecPages)].map((_,i)=>{
                        const p=i+1;
                        if(p===1||p===totalRecPages||(p>=recPage-1&&p<=recPage+1)){
                          return <Pagination.Item key={p} active={p===recPage} onClick={()=>setRecPage(p)}>{p}</Pagination.Item>
                        }
                        if(p===recPage-2||p===recPage+2) return <Pagination.Ellipsis key={`e-${p}`} disabled />;
                        return null;
                      })}
                      <Pagination.Next onClick={() => setRecPage(p => Math.min(totalRecPages, p+1))} disabled={recPage===totalRecPages}/>
                    </Pagination>
                  </div>
                )}
              </Card.Body>
            </Card>

            <Card className="custom-card-guidelines shadow-sm border-0 mt-3">
              <Card.Body>
                <h6 className="fw-bold mb-2"><i className="bi bi-info-circle me-2"></i>Upload Guidelines</h6>
                <ul className="small mb-2">
                  <li>Max file size: 10MB</li>
                  <li>Supported: PDF, JPG, PNG, DOC/DOCX</li>
                  <li>Title and at least one recipient required</li>
                </ul>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Form>
    </Container>
  );
};

export default UploadDocument;
