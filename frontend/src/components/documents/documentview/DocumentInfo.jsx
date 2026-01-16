import React, { useState, useEffect } from 'react';
import { Card, Button, ListGroup, Spinner, Badge } from 'react-bootstrap';
import SendBackModal from './modals/SendBack';
import ApproveRejectModal from './modals/ApproveReject';
import ForwardModal from './modals/Forward';
import api from '../../../services/api';

const DocumentInfo = ({
  docData,
  user,
  isRecipient,
  myRecipientData,
  acknowledging,
  handleAcknowledge,
  handleDownload,
  handleViewFile,
  handleForward,
  handleApprove,
  handleReject,
  formatDate
}) => {
  const [showSendBackModal, setShowSendBackModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [showForwardModal, setShowForwardModal] = useState(false);

  const [decisionHistory, setDecisionHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [hasDecision, setHasDecision] = useState(false);
  const [decisionStatus, setDecisionStatus] = useState(null);
  const [sendingBack, setSendingBack] = useState(false);
  const [forwarding, setForwarding] = useState(false);

  const isAcknowledged = Boolean(myRecipientData?.pivot?.is_acknowledged);

  const userLevel = Number(user?.access_level ?? 0);
  const canApproveReject = userLevel >= 3;
  const canForward = userLevel >= 2;

  const fetchDecisionHistory = async () => {
    setLoadingHistory(true);
    try {
      const response = await api.get(`/document/${docData.id}/decision-history`);
      setDecisionHistory(response.data);
    } catch (err) {
      console.error(err);
      setDecisionHistory([]);
    }
    setLoadingHistory(false);
  };

  const fetchHasDecision = async () => {
    try {
      const response = await api.get(`/document/${docData.id}/has-decision`);
      setHasDecision(response.data.hasDecision);
    } catch (err) {
      console.error(err);
      setHasDecision(false);
    }
  };

  const fetchDecisionStatus = async () => {
    try {
      const response = await api.get(`/document/${docData.id}/decision-status`);
      setDecisionStatus(response.data.status);
    } catch (err) {
      console.error(err);
      setDecisionStatus(null);
    }
  };

  useEffect(() => {
    fetchDecisionHistory();
    fetchHasDecision();
    fetchDecisionStatus();
  }, [docData.id]);

  const handleDecisionSaved = () => {
    fetchDecisionHistory();
    fetchHasDecision();
    fetchDecisionStatus();
  };

const handleSendBackSubmit = async (formData) => {
  setSendingBack(true);
  try {
    await api.post(`/document/send-back`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });

    setShowSendBackModal(false);
    await fetchDecisionHistory();
    await fetchHasDecision();
    await fetchDecisionStatus();
  } catch (err) {
    console.error("Send back failed", err);
    alert("Failed to send back document.");
  }
  setSendingBack(false);
};

const handleForwardSubmit = async (data) => {
  setForwarding(true);
  try {
    await api.post(`/document/${docData.id}/forward`, {
      email: data.email,
      message: data.message || null
    });

    setShowForwardModal(false);
    // Refresh document data if handleForward is provided (for parent component refresh)
    if (handleForward && typeof handleForward === 'function') {
      await handleForward();
    }
    alert(`Document forwarded to ${data.email}`);
  } catch (err) {
    console.error("Forward failed", err);
    const errorMessage = err.response?.data?.error || err.response?.data?.message || "Failed to forward document.";
    alert(errorMessage);
  } finally {
    setForwarding(false);
  }
};


  return (
    <>
      <Card className="shadow-sm border-0 mb-4 doc-info-card">
        <Card.Header className="bg-white border-0 d-flex justify-content-between align-items-center">
          <h5 className="mb-0">
            <i className="bi bi-file-text me-2"></i>Document Info
          </h5>

          {decisionStatus && (
            <Badge bg={decisionStatus === 'approve' ? 'success' : decisionStatus === 'reject' ? 'danger' : 'warning'}>
              {decisionStatus.toUpperCase()}
            </Badge>
          )}
        </Card.Header>

        <Card.Body className="p-4">
          {/* HEADER */}
          <div className="mb-4">
            <h2 className="fw-bold mb-1">{docData.title}</h2>
            <p className="text-muted">{docData.description || "No description provided"}</p>
          </div>

          {/* METADATA */}
          <div className="row gy-3 mb-4">
            <div className="col-md-6">
              <div className="text-uppercase text-muted fw-semibold mb-1">Document ID</div>
              <div className="fw-bold"><code>{docData.document_id}</code></div>
            </div>

            <div className="col-md-6">
              <div className="text-uppercase text-muted fw-semibold mb-1">Paper ID</div>
              <div className="fw-bold"><code>{docData.paper_id}</code></div>
            </div>

            <div className="col-md-6">
              <div className="text-uppercase text-muted fw-semibold mb-1">Uploaded By</div>
              <div className="fw-bold">{docData.uploader?.name}</div>
              <small className="text-muted">{docData.uploader?.email}</small>
            </div>

            <div className="col-md-6">
              <div className="text-uppercase text-muted fw-semibold mb-1">Uploaded On</div>
              <div className="fw-bold">{formatDate(docData.created_at)}</div>
            </div>

            {docData.classification && (
              <div className="col-md-6">
                <div className="text-uppercase text-muted fw-semibold mb-1">Classification</div>
                <div className="d-flex align-items-center gap-2">
                  <Badge bg={
                    docData.classification === 'invoice' ? 'primary' :
                    docData.classification === 'contract' ? 'success' :
                    docData.classification === 'report' ? 'info' :
                    docData.classification === 'form' ? 'warning' : 'secondary'
                  }>
                    {docData.classification.charAt(0).toUpperCase() + docData.classification.slice(1)}
                  </Badge>
                </div>
              </div>
            )}
          </div>

          {/* ACTIONS */}
          <div className="d-flex flex-wrap gap-2 mt-2 mb-4">
            {!isAcknowledged && isRecipient && (
              <Button variant="success" onClick={handleAcknowledge} disabled={acknowledging}>
                <i className="bi bi-check-circle me-2"></i>
                {acknowledging ? "Acknowledging..." : "Acknowledge"}
              </Button>
            )}

            {isAcknowledged && (
              <>
                <Button variant="outline-primary" onClick={handleDownload}>
                  <i className="bi bi-download me-2"></i>Download
                </Button>

                <Button variant="outline-primary" onClick={handleViewFile}>
                  <i className="bi bi-eye me-2"></i>View File
                </Button>

                {canForward && (
                  <Button variant="outline-warning" onClick={() => setShowForwardModal(true)}>
                    <i className="bi bi-forward me-2"></i>Forward
                  </Button>
                )}

                {decisionStatus !== 'approve' && !hasDecision && (
                  <Button variant="outline-danger" onClick={() => setShowSendBackModal(true)}>
                    <i className="bi bi-arrow-return-left me-2"></i>Send Back
                  </Button>
                )}

                {canApproveReject && (
                  <Button variant="outline-success" onClick={() => setShowActionModal(true)}>
                    <i className="bi bi-shield-check me-2"></i>
                    {decisionStatus ? "Change Action" : "Actions"}
                  </Button>
                )}
              </>
            )}
          </div>
        </Card.Body>
      </Card>

      {/* MODALS */}
      <SendBackModal
        show={showSendBackModal}
        onHide={() => setShowSendBackModal(false)}
        document={docData}
        onSendBack={handleSendBackSubmit}
        loading={sendingBack}
      />

      <ApproveRejectModal
        show={showActionModal}
        onHide={() => setShowActionModal(false)}
        document={docData}
        onDecisionSaved={handleDecisionSaved}
      />

      <ForwardModal
        show={showForwardModal}
        onHide={() => setShowForwardModal(false)}
        document={docData}
        onForward={handleForwardSubmit}
        user={user}
      />
    </>
  );
};

export default DocumentInfo;
