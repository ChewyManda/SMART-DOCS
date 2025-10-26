

import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Button, Badge, Table, Alert } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import QRCode from 'qrcode.react';


const DocumentView = ({ user }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acknowledging, setAcknowledging] = useState(false);
  const [success, setSuccess] = useState('');

  const fetchDocument = useCallback(async () => {
    try {
      const response = await api.get(`/document/${id}`);
      setDocument(response.data);
    } catch (error) {
      console.error('Failed to fetch document:', error);
      alert('Document not found or you do not have access');
      navigate('/document'); 
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchDocument();
  }, [fetchDocument]);

  const handleAcknowledge = async () => { 
    setAcknowledging(true);
    try {
      await api.post(`/document/${id}/acknowledge`);
      setSuccess('Document acknowledged successfully!');
      fetchDocument();
    } catch (error) {
      console.error('Failed to acknowledge document:', error);
    } finally {
      setAcknowledging(false);
    }
  };

  const handleDownload = async () => {
    try {
      const response = await api.get(`/document/${id}/download`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = window.document.createElement('a'); // ✅ fixed bug
      link.href = url;
      link.setAttribute('download', document.title || 'document.pdf');
      window.document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Failed to download document:', error);
      alert('Failed to download document');
    }
  };

  const getActivityIcon = (activityType) => {
    const icons = {
      uploaded: 'cloud-upload',
      viewed: 'eye',
      downloaded: 'download',
      acknowledged: 'check-circle',
      printed: 'printer',
      exported: 'file-earmark-arrow-down',
    };
    return icons[activityType] || 'file-earmark';
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

  if (!document) {
    return null;
  }

  const isRecipient = document.recipients?.some(r => r.id === user.id);
  const myRecipientData = document.recipients?.find(r => r.id === user.id);

  return (
    <Container className="mt-4 mb-5">
      <Row className="mb-4">
        <Col>
          <Button variant="outline-secondary" onClick={() => navigate('/document')}>
            <i className="bi bi-arrow-left me-2"></i>
            Back to Documents
          </Button>
        </Col>
      </Row>

      {success && (
        <Alert variant="success" dismissible onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {/* Document Header */}
      <Row className="mb-4">
        <Col>
          <Card className="border-0 shadow-sm">
            <Card.Body className="p-4">
              <div className="d-flex justify-content-between align-items-start mb-3">
                <div className="flex-grow-1">
                  <h2 className="fw-bold mb-2">{document.title}</h2>
                  <p className="text-muted mb-2">{document.description || 'No description provided'}</p>
                  <div className="d-flex gap-3 flex-wrap">
                    <span>
                      <strong>Document ID:</strong> <code>{document.document_id}</code>
                    </span>
                    <span>
                      <strong>Paper ID:</strong> <code>{document.paper_id}</code>
                    </span>
                  </div>
                </div>
                <div className="text-end">
                  {document.qr_code_path && (
                    <img
                      src={`${process.env.REACT_APP_STORAGE_URL}/${document.qr_code_path}`}
                      alt="QR Code"
                      style={{ width: '100px', height: '100px' }}
                      className="border rounded"
                    />
                  )}
                </div>
              </div>

              <hr />

              <Row className="mb-3">
                <Col md={6}>
                  <strong>Uploaded By:</strong>
                  <p className="mb-2">{document.uploader?.name}</p>
                  <p className="text-muted small mb-0">{document.uploader?.email}</p>
                </Col>
                <Col md={6}>
                  <strong>Upload Date:</strong>
                  <p className="mb-0">{new Date(document.created_at).toLocaleString()}</p>
                </Col>
              </Row>

              <div className="d-flex gap-2 flex-wrap">
                <Button
                  variant="primary"
                  onClick={handleDownload}
                >
                  <i className="bi bi-download me-2"></i>
                  Download
                </Button>

                {isRecipient && !myRecipientData?.pivot?.is_acknowledged && (
                  <Button
                    variant="success"
                    onClick={handleAcknowledge}
                    disabled={acknowledging}
                  >
                    {acknowledging ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" />
                        Acknowledging...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check-circle me-2"></i>
                        Acknowledge Receipt
                      </>
                    )}
                  </Button>
                )}

                {myRecipientData?.pivot?.is_acknowledged && (
                  <Badge bg="success" className="p-2">
                    <i className="bi bi-check-circle me-2"></i>
                    Acknowledged on {new Date(myRecipientData.pivot.acknowledged_at).toLocaleString()}
                  </Badge>
                )}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        {/* Recipients */}
        <Col md={6} className="mb-4">
          <Card className="border-0 shadow-sm h-100">
            <Card.Header className="bg-white border-0 py-3">
              <h5 className="mb-0 fw-bold">
                <i className="bi bi-people me-2"></i>
                Recipients ({document.recipients?.length || 0})
              </h5>
            </Card.Header>
            <Card.Body>
              <Table hover size="sm" className="mb-0">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Department</th>
                  </tr>
                </thead>
                <tbody>
                  {document.recipients?.map((recipient) => (
                    <tr key={recipient.id}>
                      <td>
                        {recipient.name}
                        <br />
                        <small className="text-muted">{recipient.email}</small>
                      </td>
                      <td>{recipient.department || '-'}</td>
                      <td>
                        {recipient.pivot.is_acknowledged ? (
                          <Badge bg="success">Acknowledged</Badge>
                        ) : recipient.pivot.is_viewed ? (
                          <Badge bg="info">Viewed</Badge>
                        ) : (
                          <Badge bg="secondary">Not Viewed</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>

        {/* Activity Timeline */}
        <Col md={6} className="mb-4">
          <Card className="border-0 shadow-sm h-100">
            <Card.Header className="bg-white border-0 py-3">
              <h5 className="mb-0 fw-bold">
                <i className="bi bi-clock-history me-2"></i>
                Activity Timeline
              </h5>
            </Card.Header>
            <Card.Body style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {document.activities && document.activities.length > 0 ? (
                <div className="timeline">
                  {document.activities.map((activity) => (
                    <div key={activity.id} className="d-flex mb-3">
                      <div className="me-3">
                        <div
                          className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center"
                          style={{ width: '35px', height: '35px' }}
                        >
                          <i className={`bi bi-${getActivityIcon(activity.activity_type)}`}></i>
                        </div>
                      </div>
                      <div className="flex-grow-1">
                        <p className="mb-1">
                          <strong>{activity.user?.name}</strong> {activity.activity_type} this document
                        </p>
                        <small className="text-muted">
                          {new Date(activity.created_at).toLocaleString()}
                        </small>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted py-4">No activities yet</p>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default DocumentView;
