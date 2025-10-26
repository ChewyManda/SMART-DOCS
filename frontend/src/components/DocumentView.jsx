// ====================================
// DOCUMENT VIEW COMPONENT - UPDATED WITH QR CODE FEATURES
// File: smartdoc-frontend/src/components/DocumentView.jsx
// ====================================

import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Button, Badge, Table, Alert, Modal } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import api from '../services/api';

const DocumentView = ({ user }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acknowledging, setAcknowledging] = useState(false);
  const [success, setSuccess] = useState('');
  const [showQRModal, setShowQRModal] = useState(false);

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
      const link = window.document.createElement('a');
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

  const handleDownloadQR = () => {
    const svg = window.document.getElementById(`qr-code-${id}`);
    if (!svg) {
      console.error('QR code element not found');
      return;
    }
    
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = window.document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');
      
      const downloadLink = window.document.createElement('a');
      downloadLink.download = `QR-${document.document_id}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const handlePrintQR = () => {
    const documentUrl = `${window.location.origin}/document/${id}`;
    const printWindow = window.open('', '', 'height=600,width=800');
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print QR Code - ${document.document_id}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              padding: 40px;
              margin: 0;
            }
            .qr-container {
              text-align: center;
              border: 3px solid #000;
              padding: 40px;
              margin: 20px;
              border-radius: 10px;
            }
            h1 { margin: 0 0 10px 0; color: #333; }
            h2 { margin: 10px 0; color: #666; }
            p { margin: 8px 0; font-size: 14px; }
            code {
              background: #f4f4f4;
              padding: 4px 8px;
              border-radius: 4px;
              font-family: monospace;
            }
            canvas { margin: 20px 0; border: 1px solid #ddd; }
            .footer { margin-top: 20px; font-size: 12px; color: #999; }
            button {
              margin-top: 30px;
              padding: 12px 24px;
              font-size: 16px;
              background: #007bff;
              color: white;
              border: none;
              border-radius: 5px;
              cursor: pointer;
            }
            @media print {
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <h1>SMART-DOCS</h1>
            <h2>${document.title}</h2>
            <div id="qr-container"></div>
            <p><strong>Document ID:</strong> <code>${document.document_id}</code></p>
            <p><strong>Paper ID:</strong> <code>${document.paper_id}</code></p>
            <p><strong>Uploaded:</strong> ${new Date(document.created_at).toLocaleDateString()}</p>
            <div class="footer">
              <p>Scan QR code to access this document</p>
            </div>
          </div>
          <button onclick="window.print()">Print QR Code</button>
          <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.1/build/qrcode.min.js"></script>
          <script>
            QRCode.toCanvas(document.createElement('canvas'), '${documentUrl}', { 
              width: 256,
              margin: 2,
              errorCorrectionLevel: 'H'
            }, function (error, canvas) {
              if (error) console.error(error);
              document.getElementById('qr-container').appendChild(canvas);
            });
          </script>
        </body>
      </html>
    `);
    
    printWindow.document.close();
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
  const documentUrl = `${window.location.origin}/document/${id}`;

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
          <i className="bi bi-check-circle me-2"></i>
          {success}
        </Alert>
      )}

      <Row>
        <Col lg={8} className="mb-4">
          <Card className="border-0 shadow-sm mb-4">
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
                <Button
                  variant="outline-primary"
                  size="sm"
                  onClick={() => setShowQRModal(true)}
                >
                  <i className="bi bi-qr-code me-1"></i>
                  QR Code
                </Button>
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
                <Button variant="primary" onClick={handleDownload}>
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
                  <Badge bg="success" className="p-2 d-inline-flex align-items-center">
                    <i className="bi bi-check-circle me-2"></i>
                    Acknowledged on {new Date(myRecipientData.pivot.acknowledged_at).toLocaleDateString()}
                  </Badge>
                )}
              </div>
            </Card.Body>
          </Card>

          {/* Recipients */}
          <Card className="border-0 shadow-sm">
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
                    <th>Status</th>
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

        {/* Right Column - QR Code & Activity */}
        <Col lg={4}>
          {/* QR Code Card */}
          <Card className="border-0 shadow-sm mb-4 sticky-top" style={{ top: '20px' }}>
            <Card.Header className="bg-white border-0 py-3">
              <h5 className="mb-0">
                <i className="bi bi-qr-code me-2"></i>
                Quick Access QR
              </h5>
            </Card.Header>
            <Card.Body className="text-center">
              <div className="p-3 bg-light rounded mb-3">
                <QRCodeSVG
                  id={`qr-code-${id}`}
                  value={documentUrl}
                  size={180}
                  level="H"
                  includeMargin={true}
                  style={{ width: '100%', height: 'auto' }}
                />
              </div>
              <p className="text-muted small mb-3">
                <i className="bi bi-info-circle me-1"></i>
                Scan to access this document instantly
              </p>
              <div className="d-grid gap-2">
                <Button
                  variant="outline-primary"
                  size="sm"
                  onClick={handleDownloadQR}
                >
                  <i className="bi bi-download me-2"></i>
                  Download QR
                </Button>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={handlePrintQR}
                >
                  <i className="bi bi-printer me-2"></i>
                  Print QR
                </Button>
              </div>
            </Card.Body>
          </Card>

          {/* Activity Timeline */}
          <Card className="border-0 shadow-sm">
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

      {/* QR Code Modal */}
      <Modal show={showQRModal} onHide={() => setShowQRModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-qr-code me-2"></i>
            Document QR Code
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center py-4">
          <div className="p-4 bg-light rounded mb-3">
            <QRCodeSVG
              value={documentUrl}
              size={300}
              level="H"
              includeMargin={true}
              style={{ width: '100%', height: 'auto' }}
            />
          </div>
          <h5 className="mb-2">{document.title}</h5>
          <p className="text-muted mb-1">
            <small>Document ID: <code>{document.document_id}</code></small>
          </p>
          <p className="text-muted mb-0">
            <small>
              <i className="bi bi-info-circle me-1"></i>
              Scan this QR code to quickly access this document
            </small>
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-primary" onClick={handleDownloadQR}>
            <i className="bi bi-download me-2"></i>
            Download
          </Button>
          <Button variant="outline-secondary" onClick={handlePrintQR}>
            <i className="bi bi-printer me-2"></i>
            Print
          </Button>
          <Button variant="secondary" onClick={() => setShowQRModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default DocumentView;