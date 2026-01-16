import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Button, Alert } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import "../../css/documents/documentview.css";
import "../../css/admin/admin-dashboard.css";

import DocumentInfo from '../../components/documents/documentview/DocumentInfo';
import RecipientsTable from '../../components/documents/documentview/RecipientsTable';
import QRCodePanel from '../../components/documents/documentview/QRCodePanel';
import ActivityTimeline from '../../components/documents/documentview/ActivityTimeline';
import AuditTrailModal from '../../components/documents/documentview/modals/AuditTrail';
import WorkflowStatus from '../../components/documents/documentview/WorkflowStatus';

const DocumentView = ({ user }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [docData, setDocData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acknowledging, setAcknowledging] = useState(false);
  const [success, setSuccess] = useState('');
  const [showAuditTrail, setShowAuditTrail] = useState(false);

  // Pagination states
  const [recipientPage, setRecipientPage] = useState(1);
  const [activityPage, setActivityPage] = useState(1);
  const recipientsPerPage = 10;
  const activitiesPerPage = 8;

  const formatDate = (date) => new Date(date).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric"
  });

  const handleForward = async () => {
    // Refresh document data after forwarding
    await fetchDocument();
  };


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
      const response = await api.get(`/document/${id}/download`, {
        responseType: 'blob',
      });

      // Extract filename from Content-Disposition header
      const contentDisposition = response.headers['content-disposition'];
      let fileName = docData.title;

      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?(.+)"?/);
        if (match && match[1]) {
          fileName = match[1];
        }
      }

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
    const canvas = document.getElementById(`qr-code-${id}`);
    if (!canvas) return;
    
    // Convert canvas to image
    const png = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = png;
    a.download = `QR-${docData.document_id}.png`;
    a.click();
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
      <div className="user-dashboard-container">
        <Container>
          <div className="text-center py-5">
            <div className="spinner-border" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-3 text-muted">Loading document...</p>
          </div>
        </Container>
      </div>
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
    <div className="user-dashboard-container">
    <Container>
      <Row className="mb-3">
        <Col>
          <Button variant="secondary" className="back-btn" onClick={() => navigate('/document')}>
            <i className="bi bi-arrow-left me-2"></i> Back
          </Button>
        </Col>
      </Row>

      <Row className="g-4">
        <Col lg={8}>
          {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}
          <DocumentInfo
            docData={docData}
            user={user}
            isRecipient={isRecipient}
            myRecipientData={myRecipientData}
            acknowledging={acknowledging}
            handleAcknowledge={handleAcknowledge}
            handleDownload={handleDownload}
            handleViewFile={handleViewFile}
            handleForward={handleForward}
            formatDate={formatDate}
          />
          {docData && (
            <WorkflowStatus
              document={docData}
              user={user}
              onWorkflowUpdate={fetchDocument}
            />
          )}
          <RecipientsTable
            currentRecipients={currentRecipients}
            recipientPage={recipientPage}
            setRecipientPage={setRecipientPage}
            totalRecipientPages={totalRecipientPages}
          />
        </Col>
        <Col lg={4}>
          <QRCodePanel
            id={docData.id}
            documentUrl={documentUrl}
            docData={docData}
            handleDownloadQR={handleDownloadQR}
            handlePrintQR={handlePrintQR}
          />
          <ActivityTimeline
            currentActivities={currentActivities}
            activityPage={activityPage}
            setActivityPage={setActivityPage}
            totalActivityPages={totalActivityPages}
            getActivityIcon={getActivityIcon}
            formatDate={formatDate}
          />
          {user?.access_level >= 4 && (
            <div className="mt-3">
              <Button
                variant="outline-primary"
                className="w-100"
                onClick={() => setShowAuditTrail(true)}
              >
                <i className="bi bi-shield-check me-2"></i>
                View Full Audit Trail
              </Button>
            </div>
          )}
        </Col>
      </Row>

      {user?.access_level >= 4 && (
        <AuditTrailModal
          show={showAuditTrail}
          onHide={() => setShowAuditTrail(false)}
          document={docData}
        />
      )}
    </Container>
    </div>
  );
};

export default DocumentView;
