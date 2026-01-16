// DocumentDetails.jsx
import React, { useEffect, useRef, useState } from 'react';
import { Card, Form, Button, Alert, Spinner, Modal } from 'react-bootstrap';
import '../../../css/components/create-user-modal.css';

/* ============================================================
   Custom Dropdown Component (like Create User Modal)
=============================================================== */
const FilterSelect = ({ label, value, options, onChange, placeholder = "Select" }) => {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  return (
    <div className="cu-select-wrapper" ref={wrapperRef}>
      {label && <label className="cu-label">{label}</label>}
      <div
        className={`cu-select-trigger ${open ? 'open' : ''}`}
        onClick={() => setOpen(o => !o)}
        style={{ height: '40px', fontSize: '0.95rem' }}
      >
        <span>{options.find(o => o.value === value)?.label || placeholder}</span>
        <span className="cu-select-arrow">▾</span>
      </div>
      {open && (
        <div className="cu-select-options">
          {options.map(opt => (
            <div
              key={opt.value}
              className={`cu-select-option ${opt.value === value ? 'active' : ''}`}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const DocumentDetails = ({
  title, setTitle,
  description, setDescription,
  classification, setClassification,
  files, setFiles,
  isDragging, setIsDragging,
  handleFileChange, removeFile,
  showSourcePopup, setShowSourcePopup,
  scanning, startScanner, captureScan, stopScanner,
  showCameraModal, setShowCameraModal,
  importFromGoogleDrive, // <- added prop
  loading, error, setError,
  success, setSuccess
}) => {
  const videoRef = useRef(null);

  // Attach stream to video when modal opens
  useEffect(() => {
    if (showCameraModal && videoRef.current && scanning && videoRef.current.srcObject === null) {
      videoRef.current.srcObject = videoRef.current.srcObject || null;
    }
  }, [showCameraModal, scanning]);

  return (
    <>
      <Card className="custom-card-details shadow-sm border-0">
        <Card.Header className="custom-card-header">
          <h5 className="mb-0">Document Details</h5>
        </Card.Header>
        <Card.Body>
          {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
          {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

          <Form.Group className="mb-3">
            <Form.Label className="fw-bold">Title <span className="text-danger">*</span></Form.Label>
            <Form.Control
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Enter title"
              disabled={loading}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label className="fw-bold">Description</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Optional description"
              disabled={loading}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label className="fw-bold">
              Classification <small className="text-muted">(Optional - Auto-detected if not specified)</small>
            </Form.Label>
            <FilterSelect
              value={classification}
              onChange={(value) => setClassification(value)}
              options={[
                { value: '', label: 'Auto-detect' },
                { value: 'invoice', label: 'Invoice' },
                { value: 'contract', label: 'Contract' },
                { value: 'report', label: 'Report' },
                { value: 'form', label: 'Form' },
                { value: 'other', label: 'Other' }
              ]}
              placeholder="Auto-detect"
            />
            <Form.Text className="text-muted" style={{ display: 'block', marginTop: '8px' }}>
              Leave as "Auto-detect" to automatically classify based on document content, or manually select a type.
            </Form.Text>
          </Form.Group>

          {/* FILE DROP */}
          <Form.Group className="mb-4" style={{ position: 'relative' }}>
            <Form.Label className="fw-bold">Select Files <span className="text-danger">*</span></Form.Label>
            <div
              className={`file-drop rounded-3 ${files.length ? 'has-file' : ''} ${isDragging ? 'drag-active' : ''}`}
              onClick={() => setShowSourcePopup(prev => !prev)}
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={e => {
                e.preventDefault();
                handleFileChange({ target: { files: e.dataTransfer.files } });
              }}
              style={{ cursor: 'pointer', position: 'relative' }}
            >
              {!files.length ? (
                <>
                  <i className="bi bi-cloud-upload-fill file-drop-icon" />
                  <div className="file-drop-text">
                    <strong>Drop files here or click to upload</strong>
                    <div className="text-muted small">PDF, JPG, PNG, DOC/DOCX, MP4, MP3, Video, Audio — Max 10MB each</div>
                  </div>
                </>
              ) : (
                <div className="d-flex flex-column gap-2">
                  {files.map((f, idx) => (
                    <div key={idx} className="file-preview d-flex align-items-center justify-content-between">
                      <div className="d-flex align-items-center gap-3">
                        {f.preview && (f.file.type === 'application/pdf' ? (
                          <iframe
                            src={f.preview}
                            title="preview"
                            style={{ width: '80px', height: '80px', border: '1px solid #ccc', borderRadius: '4px' }}
                          />
                        ) : f.file.type.startsWith('video/') ? (
                          <video
                            src={f.preview}
                            style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '4px' }}
                            muted
                          />
                        ) : f.file.type.startsWith('audio/') ? (
                          <div style={{ width: '80px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
                            <i className="bi bi-music-note-beamed" style={{ fontSize: '2rem', color: '#666' }}></i>
                          </div>
                        ) : (
                          <img
                            src={f.preview}
                            alt="preview"
                            style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '4px' }}
                          />
                        ))}
                        <div className="file-info d-flex gap-2 align-items-center">
                          <span className="fw-bold">{f.file.name}</span>
                          <span className="text-muted small">({(f.file.size / 1024 / 1024).toFixed(2)} MB)</span>
                        </div>
                      </div>
                      <Button size="sm" variant="outline-secondary" onClick={e => { e.stopPropagation(); removeFile(idx); }}>Remove</Button>
                    </div>
                  ))}
                  <Button
                    className="add-more-files-btn"
                    variant="outline-success"
                    onClick={e => { e.stopPropagation(); setShowSourcePopup(prev => !prev); }}
                  >
                    <i className="bi bi-plus-circle-fill me-2"></i>
                    Add More Files
                  </Button>
                </div>
              )}
            </div>

            <Form.Control
              id="fileInput"
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.mp4,.mp3,.avi,.mov,.wmv,.flv,.webm,.mkv,.wav,.ogg,.aac,.m4a,video/*,audio/*"
              onChange={handleFileChange}
              style={{ display: 'none' }}
              disabled={loading}
            />

            {/* SOURCE POPUP */}
            {showSourcePopup && (
              <div
                className="source-popup"
                style={{
                  position: 'absolute',
                  top: '10px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  zIndex: 1050,
                }}
              >
                <Button
                  variant="light"
                  className="w-100 text-start"
                  onClick={() => { document.getElementById('fileInput').click(); setShowSourcePopup(false); }}
                >
                  <i className="bi bi-folder2-open"></i>
                  Import from Device
                </Button>
                <Button
                  variant="light"
                  className="w-100 text-start"
                  onClick={() => { importFromGoogleDrive(); setShowSourcePopup(false); }}
                >
                  <i className="bi bi-google"></i>
                  Import from Google Drive
                </Button>
                <Button
                  variant="light"
                  className="w-100 text-start"
                  onClick={() => { setShowCameraModal(true); startScanner(); setShowSourcePopup(false); }}
                >
                  <i className="bi bi-camera-fill"></i>
                  Camera Scan
                </Button>
              </div>
            )}

            {/* CAMERA MODAL */}
            <Modal
              show={showCameraModal}
              onHide={() => { setShowCameraModal(false); stopScanner(); }}
              centered
              size="md"
            >
              <Modal.Header closeButton>
                <Modal.Title>Camera Scan</Modal.Title>
              </Modal.Header>
              <Modal.Body className="d-flex justify-content-center">
                <video
                  ref={videoRef}
                  id="scannerVideo"
                  autoPlay
                  playsInline
                  muted
                  style={{ width: '90%', border: '1px solid #ccc', borderRadius: '4px' }}
                />
              </Modal.Body>
              <Modal.Footer>
                <Button variant="success" onClick={() => { captureScan(); setShowCameraModal(false); }}>Capture</Button>
                <Button variant="secondary" onClick={() => { setShowCameraModal(false); stopScanner(); }}>Cancel</Button>
              </Modal.Footer>
            </Modal>
          </Form.Group>

          <div className="d-flex justify-content-end gap-2">
            <Button
              variant="outline-secondary"
              disabled={loading}
              onClick={() => window.history.back()}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="upload-btn"
              disabled={loading}
            >
              {loading ? <Spinner animation="border" size="sm" className="me-2" /> : <i className="bi bi-cloud-upload me-2" />}
              {loading ? 'Uploading...' : 'Upload Document'}
            </Button>
          </div>
        </Card.Body>
      </Card>
    </>
  );
};

export default DocumentDetails;
