// components/UploadGuidelines.jsx
import React from 'react';
import { Card } from 'react-bootstrap';

const UploadGuidelines = () => (
  <Card className="custom-card-guidelines shadow-sm border-0 mt-3">
    <Card.Body>
      <h6 className="fw-bold mb-2">
        <i className="bi bi-info-circle me-2"></i>Upload Guidelines
      </h6>
      <ul className="small mb-2">
        <li>Max file size: 10MB each</li>
        <li>Supported: PDF, JPG, PNG, DOC/DOCX</li>
        <li>Title and at least one recipient required</li>
      </ul>
    </Card.Body>
  </Card>
);

export default UploadGuidelines;
