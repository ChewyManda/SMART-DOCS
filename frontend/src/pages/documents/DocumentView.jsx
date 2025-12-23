// ====================================
// DOCUMENT VIEW COMPONENT - PAGINATION + VIEW FILE
// ====================================

import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Button, Badge, Table, Alert } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Dropdown, ButtonGroup } from 'react-bootstrap';
import api from '../../services/api';
import '../../css/documents/documentview.css';

const DocumentView = ({ user }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [docData, setDocData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acknowledging, setAcknowledging] = useState(false);
  const [success, setSuccess] = useState('');

  // Pagination states
  const [recipientPage, setRecipientPage] = useState(1);
  const [activityPage, setActivityPage] = useState(1);
  const recipientsPerPage = 10;
  const activitiesPerPage = 8;

  const formatDate = (date) => new Date(date).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric"
  });

  const handleForward = async () => {
  // Example: open prompt to enter recipient email
  const recipientEmail = prompt("Enter the email of the person to forward this document to:");
  if (!recipientEmail) return;

  try {
    await api.post(`/document/${id}/forward`, { email: recipientEmail });
    alert(`Document forwarded to ${recipientEmail}`);
    fetchDocument(); // refresh if needed
  } catch (error) {
    console.error("Failed to forward document:", error);
    alert("Failed to forward document");
  }};


  const fetchDocument = useCallback(async () => {
    try {
      const response = await api.get(`/document/${id}`);
      setDocData(response.data);
    } catch (error) {
      console.error('Failed to fetch document:', error);
      alert('Document not found or you do not have access');
      navigate('/document');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => { fetchDocument(); }, [fetchDocument]);

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
    if (!docData) return;
    try {
      const response = await api.get(`/document/${id}/download`, { responseType: 'blob' });
      const extension = docData.file_type || 'pdf';
      const fileName = `${docData.title}.${extension}`;
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download document:', error);
      alert('Failed to download document');
    }
  };

  const handleViewFile = () => {
    if (!docData || !docData.id) return;
    navigate(`/document/view/${docData.id}`);
  };

  const handleDownloadQR = () => {
    const svg = document.getElementById(`qr-code-${id}`);
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      const png = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = png;
      a.download = `QR-${docData.document_id}.png`;
      a.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const handlePrintQR = () => {
    if (!docData) return;
    const documentUrl = `${window.location.origin}/document/${id}`;
    const win = window.open('', '', 'height=600,width=800');
    win.document.write(`
      <html><head><title>Print QR</title></head>
      <body style="text-align:center; padding:40px;">
        <h2>${docData.title}</h2>
        <div id="qr"></div>
        <p>Document ID: ${docData.document_id}</p>
        <button onclick="window.print()">Print</button>
        <script src="https://cdn.jsdelivr.net/npm/qrcode/build/qrcode.min.js"></script>
        <script>
          QRCode.toCanvas(document.createElement('canvas'), '${documentUrl}', { width: 240 }, function (err, canvas) {
            document.getElementById('qr').appendChild(canvas);
          });
        </script>
      </body></html>
    `);
    win.document.close();
  };

  const getActivityIcon = (type) => {
    const icons = {
      uploaded: 'cloud-upload',
      viewed: 'eye',
      downloaded: 'download',
      acknowledged: 'check-circle',
      printed: 'printer',
      exported: 'file-earmark-arrow-down'
    };
    return icons[type] || 'file-earmark';
  };

  if (loading)
    return (
      <Container className="mt-5 text-center">
        <div className="spinner-border text-primary"></div>
      </Container>
    );

  if (!docData) return null;

  const isRecipient = docData.recipients?.some(r => r.id === user.id);
  const myRecipientData = docData.recipients?.find(r => r.id === user.id);
  const documentUrl = `${window.location.origin}/document/${id}`;

  // Pagination logic
  const indexOfLastRecipient = recipientPage * recipientsPerPage;
  const indexOfFirstRecipient = indexOfLastRecipient - recipientsPerPage;
  const currentRecipients = docData.recipients.slice(indexOfFirstRecipient, indexOfLastRecipient);
  const totalRecipientPages = Math.ceil(docData.recipients.length / recipientsPerPage);

  const indexOfLastActivity = activityPage * activitiesPerPage;
  const indexOfFirstActivity = indexOfLastActivity - activitiesPerPage;
  const currentActivities = docData.activities.slice(indexOfFirstActivity, indexOfLastActivity);
  const totalActivityPages = Math.ceil(docData.activities.length / activitiesPerPage);

  return (
    <Container fluid className="document-view-container">

      {/* Back Button */}
      <Row className="mb-3">
        <Col>
          <Button variant="outline-secondary back-btn" onClick={() => navigate('/document')}>
            <i className="bi bi-arrow-left me-2"></i> Back
          </Button>
        </Col>
      </Row>

      {success && (
        <Alert variant="success" dismissible onClose={() => setSuccess('')}>
          <i className="bi bi-check-circle me-2"></i> {success}
        </Alert>
      )}

      <Row className="g-4">
        {/* LEFT */}
        <Col lg={8}>
          <Card className="shadow-sm border-0 mb-4 doc-info-card">
            <Card.Header className="bg-white border-0">
              <h5 className="mb-0"><i className="bi bi-file-text me-2"></i>Document Info</h5>
            </Card.Header>

            <Card.Body className="p-4">
              {/* HEADER */}
              <div className="mb-4">
                <h2 className="fw-bold mb-1" style={{ fontSize: "28px" }}>{docData.title}</h2>
                <p className="text-muted" style={{ fontSize: "15px" }}>{docData.description || "No description provided"}</p>
              </div>

              {/* METADATA */}
              <Row className="gy-3 mb-4">
                <Col md={6}>
                  <div className="text-uppercase text-muted fw-semibold mb-1" style={{ fontSize: "12px" }}>Document ID</div>
                  <div className="fw-bold" style={{ fontSize: "16px" }}><code>{docData.document_id}</code></div>
                </Col>
                <Col md={6}>
                  <div className="text-uppercase text-muted fw-semibold mb-1" style={{ fontSize: "12px" }}>Paper ID</div>
                  <div className="fw-bold" style={{ fontSize: "16px" }}><code>{docData.paper_id}</code></div>
                </Col>
                <Col md={6}>
                  <div className="text-uppercase text-muted fw-semibold mb-1" style={{ fontSize: "12px" }}>Uploaded By</div>
                  <div className="fw-bold" style={{ fontSize: "16px" }}>{docData.uploader?.name}</div>
                  <small className="text-muted">{docData.uploader?.email}</small>
                </Col>
                <Col md={6}>
                  <div className="text-uppercase text-muted fw-semibold mb-1" style={{ fontSize: "12px" }}>Uploaded On</div>
                  <div className="fw-bold" style={{ fontSize: "16px" }}>{formatDate(docData.created_at)}</div>
                </Col>
              </Row>

              {/* ACTIONS */}
              <div className="d-flex flex-wrap gap-2 mt-2">
                <Button variant="primary" onClick={handleDownload} className="px-3 py-2 rounded-3 download-btn" style={{ fontSize: "14px" }}>
                  <i className="bi bi-download me-2"></i>Download
                </Button>

                <Button variant="outline-primary" onClick={handleViewFile} className="px-3 py-2 rounded-3" style={{ fontSize: "14px" }}>
                  <i className="bi bi-eye me-2"></i>View File
                </Button>

                {isRecipient && myRecipientData?.pivot && !myRecipientData.pivot.is_acknowledged ? (
                  <Button variant="success" onClick={handleAcknowledge} disabled={acknowledging} className="px-3 py-2 rounded-3" style={{ fontSize: "14px" }}>
                    {acknowledging ? "Acknowledging..." : <span className="d-flex align-items-center"><i className="bi bi-check-circle me-2"></i>Acknowledge</span>}
                  </Button>
                ) : null}

                {myRecipientData?.pivot?.is_acknowledged ? (
                  <Badge bg="success" className="p-2 ps-3 pe-3 rounded-3 d-flex align-items-center" style={{ fontSize: "14px" }}>
                    <i className="bi bi-check-circle me-2"></i> Acknowledged on {formatDate(myRecipientData.pivot.acknowledged_at)}
                  </Badge>
                ) : null}

                {/* FORWARD BUTTON */}
                <Button 
                  variant="outline-warning" 
                  onClick={() => handleForward()} 
                  className="px-3 py-2 rounded-3" 
                  style={{ fontSize: "14px" }}
                >
                  <i className="bi bi-forward me-2"></i>Forward
                </Button>
              </div>

            </Card.Body>
          </Card>

          {/* RECIPIENTS */}
          <Card className="shadow-sm border-0 recepients-card">
            <Card.Header className="bg-white border-0">
              <h5><i className="bi bi-people me-2"></i>Recipients</h5>
            </Card.Header>
            <Card.Body className="p-0">
              <Table hover responsive className="mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Name</th>
                    <th>Department</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {currentRecipients.map(r => (
                    <tr key={r.id}>
                      <td>
                        <div className="d-flex align-items-center">
                          {/* Optional initials avatar */}
                          <div className="bg-secondary text-white rounded-circle d-flex align-items-center justify-content-center me-2" style={{ width: 35, height: 35, fontSize: '14px' }}>
                            {r.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </div>
                          <div>
                            <div className="fw-semibold">{r.name}</div>
                            <small className="text-muted">{r.email}</small>
                          </div>
                        </div>
                      </td>
                      <td>{r.department || "-"}</td>
                      <td>
                        {r.pivot.is_acknowledged ? (
                          <Badge bg="success"><i className="bi bi-check-circle me-1"></i>Acknowledged</Badge>
                        ) : r.pivot.is_viewed ? (
                          <Badge bg="info"><i className="bi bi-eye me-1"></i>Viewed</Badge>
                        ) : (
                          <Badge bg="secondary"><i className="bi bi-x-circle me-1"></i>Not Viewed</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>

              {/* PAGINATION */}
              {totalRecipientPages > 1 && (
                <div className="d-flex justify-content-end align-items-center p-3 border-top">
                  <Button 
                    variant="outline-secondary" 
                    size="sm" 
                    disabled={recipientPage === 1} 
                    onClick={() => setRecipientPage(prev => prev - 1)}
                    className="me-2"
                  >
                    <i className="bi bi-chevron-left"></i> Previous
                  </Button>
                  <span className="me-2 text-muted small">Page {recipientPage} of {totalRecipientPages}</span>
                  <Button 
                    variant="outline-secondary" 
                    size="sm" 
                    disabled={recipientPage === totalRecipientPages} 
                    onClick={() => setRecipientPage(prev => prev + 1)}
                  >
                    Next <i className="bi bi-chevron-right"></i>
                  </Button>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* RIGHT */}
        <Col lg={4}>
          {/* QR */}
          <Card className="shadow-sm border-0 mb-4 qr-sticky qr-card">
            <Card.Header className="bg-white border-0">
              <h5><i className="bi bi-qr-code me-2"></i>Quick Access QR</h5>
            </Card.Header>
            <Card.Body className="d-flex flex-column align-items-center">

              {/* QR Code */}
              <div 
                className="p-3 mb-3 rounded-3" 
                style={{
                  background: '#f8f9fa',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  display: 'inline-block'
                }}
              >
                <QRCodeSVG 
                  id={`qr-code-${id}`} 
                  value={documentUrl} 
                  size={180} 
                  level="H" 
                  includeMargin={true} 
                />
              </div>

              {/* Single Dropdown Button */}
              <Dropdown>
                <Dropdown.Toggle variant="secondary" className="dropdown-qr-actions">
                  QR Actions 
                </Dropdown.Toggle>

                <Dropdown.Menu>
                  <Dropdown.Item onClick={handleDownloadQR}>
                    <i className="bi bi-download me-2"></i>Download QR
                  </Dropdown.Item>
                  <Dropdown.Item onClick={handlePrintQR}>
                    <i className="bi bi-printer me-2"></i>Print QR
                  </Dropdown.Item>
                  <Dropdown.Item onClick={() => navigator.clipboard.writeText(documentUrl)}>
                    <i className="bi bi-link-45deg me-2"></i>Copy Link
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>

            </Card.Body>
          </Card>

          {/* ACTIVITY */}
          <Card className="shadow-sm border-0 activity-card">
            <Card.Header className="bg-white border-0">
              <h5><i className="bi bi-clock-history me-2"></i>Activity Timeline</h5>
            </Card.Header>
            <Card.Body>
              {currentActivities.length > 0 ? currentActivities.map(a => (
                <div key={a.id} className="d-flex mb-3">
                  <div className="me-3">
                    <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center" style={{ height: 35, width: 35 }}>
                      <i className={`bi bi-${getActivityIcon(a.activity_type)}`}></i>
                    </div>
                  </div>
                  <div>
                    <p className="mb-1"><strong>{a.user?.name}</strong> {a.activity_type} this document</p>
                    <small className="text-muted">{formatDate(a.created_at)}</small>
                  </div>
                </div>
              )) : <p className="text-center text-muted">No activities</p>}

              {totalActivityPages > 1 && (
                <div className="d-flex justify-content-between mt-2">
                  <Button variant="outline-secondary" size="sm" disabled={activityPage === 1} onClick={() => setActivityPage(prev => prev - 1)}>Previous</Button>
                  <span>Page {activityPage} of {totalActivityPages}</span>
                  <Button variant="outline-secondary" size="sm" disabled={activityPage === totalActivityPages} onClick={() => setActivityPage(prev => prev + 1)}>Next</Button>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default DocumentView;
