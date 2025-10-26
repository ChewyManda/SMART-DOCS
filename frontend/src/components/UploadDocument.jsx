import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Badge } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const UploadDocument = ({ user }) => {
  const navigate = useNavigate();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [recipients, setRecipients] = useState([]);
  
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [fileName, setFileName] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/admin/users');
      setUsers(response.data.filter(u => u.role === 'user'));
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'title') setTitle(value);
    if (name === 'description') setDescription(value);
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setFileName(selectedFile.name);
    }
  };

  const handleRecipientChange = (userId) => {
    if (recipients.includes(userId)) {
      setRecipients(recipients.filter(id => id !== userId));
    } else {
      setRecipients([...recipients, userId]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const formDataToSend = new FormData();
    formDataToSend.append('title', title);
    formDataToSend.append('description', description);
    formDataToSend.append('file', file);
    
    recipients.forEach((recipientId) => {
      formDataToSend.append('recipients[]', recipientId);
    });

    try {
      const response = await api.post('/document', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      setSuccess('Document uploaded successfully!');
      console.log(response.data);
      
      setTitle('');
      setDescription('');
      setFile(null);
      setRecipients([]);
      setFileName('');
      
      setTimeout(() => navigate('/document'), 2000);
      
    } catch (err) {
      setError('Failed to upload document.');
      console.error('Error details:', err.response?.data);
    } finally {
      setLoading(false);
    }
  };

  const selectAllRecipients = () => {
    setRecipients(users.map(u => u.id));
  };

  const clearAllRecipients = () => {
    setRecipients([]);
  };

  return (
    <Container className="mt-4 mb-5">
      <Row className="mb-4">
        <Col>
          <h2 className="fw-bold">Upload Document</h2>
          <p className="text-muted">Upload and distribute documents to recipients</p>
        </Col>
      </Row>

      <Row>
        <Col lg={8}>
          <Card className="border-0 shadow-sm">
            <Card.Body className="p-4">
              {error && <Alert variant="danger">{error}</Alert>}
              {success && <Alert variant="success">{success}</Alert>}

              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label>Document Title <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="text"
                    name="title"
                    value={title}
                    onChange={handleChange}
                    placeholder="Enter document title"
                    required
                    className="rounded-3"
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Description</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    name="description"
                    value={description}
                    onChange={handleChange}
                    placeholder="Enter document description (optional)"
                    className="rounded-3"
                  />
                </Form.Group>

                <Form.Group className="mb-4">
                  <Form.Label>Select File <span className="text-danger">*</span></Form.Label>
                  <div 
                    className="border-2 border-dashed rounded-3 p-4 text-center"
                    style={{ 
                      borderColor: '#dee2e6',
                      cursor: 'pointer',
                      background: fileName ? '#f8f9fa' : 'transparent'
                    }}
                    onClick={() => document.getElementById('fileInput').click()}
                  >
                    <i className="bi bi-cloud-upload fs-1 text-primary d-block mb-2"></i>
                    {fileName ? (
                      <>
                        <p className="mb-1"><strong>{fileName}</strong></p>
                        <small className="text-muted">Click to change file</small>
                      </>
                    ) : (
                      <>
                        <p className="mb-1">Drop files here or click to upload</p>
                        <small className="text-muted">Supports PDF, JPG, PNG, DOC formats (Max 10MB)</small>
                      </>
                    )}
                  </div>
                  <Form.Control
                    id="fileInput"
                    type="file"
                    onChange={handleFileChange}
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    style={{ display: 'none' }}
                    required
                  />
                </Form.Group>

                <Form.Group className="mb-4">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <Form.Label className="mb-0">
                      Select Recipients <span className="text-danger">*</span>
                      <Badge bg="secondary" className="ms-2">{recipients.length} selected</Badge>
                    </Form.Label>
                    <div>
                      <Button 
                        variant="outline-primary" 
                        size="sm" 
                        onClick={selectAllRecipients}
                        className="me-2"
                      >
                        Select All
                      </Button>
                      <Button 
                        variant="outline-secondary" 
                        size="sm" 
                        onClick={clearAllRecipients}
                      >
                        Clear All
                      </Button>
                    </div>
                  </div>
                  
                  <div 
                    className="border rounded-3 p-3" 
                    style={{ maxHeight: '300px', overflowY: 'auto' }}
                  >
                    {users.length > 0 ? (
                      users.map((recipient) => (
                        <Form.Check
                          key={recipient.id}
                          type="checkbox"
                          id={`recipient-${recipient.id}`}
                          label={
                            <div>
                              <strong>{recipient.name}</strong>
                              <br />
                              <small className="text-muted">
                                {recipient.email} • {recipient.department} • Level {recipient.access_level}
                              </small>
                            </div>
                          }
                          checked={recipients.includes(recipient.id)}
                          onChange={() => handleRecipientChange(recipient.id)}
                          className="mb-3"
                        />
                      ))
                    ) : (
                      <p className="text-muted text-center py-3">No recipients available</p>
                    )}
                  </div>
                </Form.Group>

                <div className="d-grid gap-2 d-md-flex justify-content-md-end">
                  <Button
                    variant="outline-secondary"
                    onClick={() => navigate('/document')}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={loading}
                    style={{
                      background: 'linear-gradient(45deg, #ff4400, #e0681e)',
                      border: 'none'
                    }}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-cloud-upload me-2"></i>
                        Upload Document
                      </>
                    )}
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={4}>
          <Card className="border-0 shadow-sm mb-3">
            <Card.Body>
              <h5 className="fw-bold mb-3">
                <i className="bi bi-info-circle me-2"></i>
                Upload Guidelines
              </h5>
              <ul className="small">
                <li className="mb-2">Maximum file size: 10MB</li>
                <li className="mb-2">Supported formats: PDF, JPG, PNG, DOC, DOCX</li>
                <li className="mb-2">Document title is required</li>
                <li className="mb-2">Select at least one recipient</li>
                <li className="mb-2">Recipients will receive instant notifications</li>
                <li className="mb-2">QR code will be automatically generated</li>
              </ul>
            </Card.Body>
          </Card>

          <Card className="border-0 shadow-sm">
            <Card.Body>
              <h5 className="fw-bold mb-3">
                <i className="bi bi-shield-check me-2"></i>
                Security Features
              </h5>
              <ul className="small">
                <li className="mb-2">
                  <i className="bi bi-check-circle text-success me-2"></i>
                  Unique Document ID
                </li>
                <li className="mb-2">
                  <i className="bi bi-check-circle text-success me-2"></i>
                  Paper ID for verification
                </li>
                <li className="mb-2">
                  <i className="bi bi-check-circle text-success me-2"></i>
                  QR code tracking
                </li>
                <li className="mb-2">
                  <i className="bi bi-check-circle text-success me-2"></i>
                  Activity logging
                </li>
                <li className="mb-2">
                  <i className="bi bi-check-circle text-success me-2"></i>
                  Role-based access
                </li>
              </ul>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default UploadDocument;