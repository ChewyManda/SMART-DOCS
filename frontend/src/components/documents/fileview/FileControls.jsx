import React from "react";
import { Button } from "react-bootstrap";

const FileControls = ({
  isImage,
  zoomIn,
  zoomOut,
  rotate,
  resetView,
  handlePrint,
  handleOCR,
  showOCR,
  ocrLoading,
}) => {
  if (!isImage) return null;

  return (
    <div className="d-flex gap-2">
      <Button variant="outline-secondary" onClick={zoomOut}>
        <i className="bi bi-zoom-out"></i>
      </Button>
      <Button variant="outline-secondary" onClick={zoomIn}>
        <i className="bi bi-zoom-in"></i>
      </Button>
      <Button variant="outline-secondary" onClick={rotate}>
        <i className="bi bi-arrow-clockwise"></i>
      </Button>
      <Button variant="outline-secondary" onClick={resetView}>
        Reset
      </Button>
      <Button variant="outline-dark" onClick={handlePrint}>
        <i className="bi bi-printer"></i>
      </Button>
      <Button
        variant={showOCR ? "secondary" : "success"}
        onClick={handleOCR}
        disabled={ocrLoading}
      >
        <i className={`bi ${showOCR ? "bi-eye-slash" : "bi-text-paragraph"} me-1`} />
        {ocrLoading ? "Scanning..." : showOCR ? "Hide OCR" : "OCR"}
      </Button>
    </div>
  );
};

export default FileControls;
