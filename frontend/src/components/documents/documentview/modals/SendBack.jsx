import React, { useState, useEffect } from "react";
import { Modal, Button, Form, Spinner, Alert } from "react-bootstrap";

const SendBackModal = ({ show, onHide, document, onSendBack }) => {
  const [message, setMessage] = useState("");
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!show) {
      setMessage("");
      setFile(null);
      setError(null);
      setSubmitting(false);
    }
  }, [show]);

  const handleSubmit = async () => {
    if (!document?.id) {
      setError("Document not loaded.");
      return;
    }

    if (!message.trim()) {
      setError("Message is required.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("document_id", document.id);
      formData.append("message", message);
      if (file) formData.append("file", file);

      await onSendBack(formData);   // 🔹 await parent API call
      onHide();
    } catch (err) {
      console.error(err);
      setError("Failed to send back document.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>Send Back Document</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {error && <Alert variant="danger">{error}</Alert>}

        <Form>
          <Form.Group className="mb-3">
            <Form.Label>Message</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Explain what needs to be changed or signed..."
            />
          </Form.Group>

          <Form.Group>
            <Form.Label>Attach File (optional)</Form.Label>
            <Form.Control type="file" onChange={e => setFile(e.target.files[0])} />
          </Form.Group>
        </Form>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onHide} disabled={submitting}>
          Cancel
        </Button>
        <Button variant="warning" onClick={handleSubmit} disabled={submitting || !message.trim()}>
          {submitting ? <Spinner size="sm" /> : "Send Back"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default SendBackModal;
