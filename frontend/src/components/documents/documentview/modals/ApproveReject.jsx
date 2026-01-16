import React, { useState, useEffect } from "react";
import { Modal, Button, Form, Spinner, Alert } from "react-bootstrap";
import api from "../../../../services/api";

const ApproveRejectModal = ({ show, onHide, document, onDecisionSaved }) => {
  const [action, setAction] = useState("approve");
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (show) {
      setAction("approve");
      setRemarks("");
      setError(null);
      setLoading(false);
    }
  }, [show]);

  const handleSubmit = async () => {
    if (!document?.id) {
      setError("Document ID is missing.");
      console.error("Document ID is missing", document);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log("Submitting decision:", { action, remarks });

      const response = await api.post(
        `/document/${document.id}/decision`,
        { action, remarks }
      );

      console.log("Decision saved successfully:", response.data);

      if (onDecisionSaved) onDecisionSaved(response.data);
      onHide();
    } catch (err) {
      console.error("Decision save failed:", err);

      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError("Failed to save decision. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Document Decision</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {error && <Alert variant="danger">{error}</Alert>}

        <Form>
          <Form.Group className="mb-3">
            <Form.Label>Action</Form.Label>
            <Form.Select
              value={action}
              onChange={e => setAction(e.target.value)}
              disabled={loading}
            >
              <option value="approve">Approve</option>
              <option value="hold">On Hold</option>
              <option value="reject">Reject</option>
            </Form.Select>
          </Form.Group>

          <Form.Group>
            <Form.Label>Remarks</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              placeholder="Optional notes or required changes..."
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              disabled={loading}
            />
          </Form.Group>
        </Form>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onHide} disabled={loading}>
          Cancel
        </Button>

        <Button
          variant={
            action === "approve" ? "success" :
            action === "hold" ? "warning" :
            "danger"
          }
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading && <Spinner animation="border" size="sm" className="me-2" />}
          {action === "approve" && "Approve"}
          {action === "hold" && "On Hold"}
          {action === "reject" && "Reject"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ApproveRejectModal;
