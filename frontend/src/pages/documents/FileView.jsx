import React, { useEffect, useState, useRef } from "react";
import { Container, Row, Col, Card, Button, Alert } from "react-bootstrap";
import { useParams, useNavigate } from "react-router-dom";
import Cropper from "react-cropper";
import "cropperjs/dist/cropper.css";
import api from "../../services/api";
import "../../css/documents/fileview.css";

const FileView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const imgRef = useRef(null);
  const cropperRef = useRef(null);

  const [fileUrl, setFileUrl] = useState(null);
  const [fileType, setFileType] = useState(null);
  const [isImage, setIsImage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [fileName, setFileName] = useState("");

  // 🔹 OCR
  const [ocrWords, setOcrWords] = useState([]);
  const [showOCR, setShowOCR] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);

  // 🔹 Crop
  const [isCropping, setIsCropping] = useState(false);
  const [cropLoading, setCropLoading] = useState(false);

  useEffect(() => {
    if (!id) {
      setErrorMsg("Invalid document ID.");
      setLoading(false);
      return;
    }

    const fetchDocument = async () => {
      try {
        const infoRes = await api.get(`/document/info/${id}`);
        const docTitle = infoRes.data.title || `document-${id}`;
        setFileName(docTitle);

        const fileRes = await api.get(`/document/view/${id}`, {
          responseType: "blob",
        });

        const mimeType = fileRes.data.type;
        setFileType(mimeType);

        if (mimeType.includes("image")) {
          setFileUrl(URL.createObjectURL(fileRes.data));
          setIsImage(true);
          return;
        }

        setFileUrl(URL.createObjectURL(fileRes.data));
      } catch (error) {
        console.error(error);
        setErrorMsg("Failed to load document.");
      } finally {
        setLoading(false);
      }
    };

    fetchDocument();
  }, [id]);

  /* ---------------- OCR TOGGLE ---------------- */
  const handleOCR = async () => {
    if (showOCR) {
      setShowOCR(false);
      return;
    }

    try {
      setOcrLoading(true);

      if (ocrWords.length === 0) {
        const res = await api.get(`/document/ocr/${id}`);

        if (!res.data.words || res.data.words.length === 0) {
          alert("No text found in image.");
          return;
        }

        setOcrWords(res.data.words);
      }

      setShowOCR(true);
    } catch (err) {
      console.error(err);
      alert("OCR failed.");
    } finally {
      setOcrLoading(false);
    }
  };

  /* ---------------- CROP ---------------- */
  const handleCrop = () => {
    setShowOCR(false);
    setIsCropping(true);
  };

  const handleCropCancel = () => {
    setIsCropping(false);
  };

  const handleCropSave = async () => {
    try {
      setCropLoading(true);

      const cropper = cropperRef.current.cropper;
      const canvas = cropper.getCroppedCanvas();

      const blob = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/png")
      );

      const formData = new FormData();
      formData.append("file", blob);

      await api.post(`/document/crop/${id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      // Reload image
      const refreshed = await api.get(`/document/view/${id}`, {
        responseType: "blob",
      });

      setFileUrl(URL.createObjectURL(refreshed.data));
      setIsCropping(false);
      setOcrWords([]);
      setShowOCR(false);
    } catch (err) {
      console.error(err);
      alert("Crop failed.");
    } finally {
      setCropLoading(false);
    }
  };

  if (loading)
    return (
      <Container className="mt-5 text-center">
        <div className="spinner-border text-primary"></div>
      </Container>
    );

  if (errorMsg)
    return (
      <Container className="mt-5">
        <Alert variant="danger">{errorMsg}</Alert>
      </Container>
    );

  return (
    <Container className="mt-4 mb-5">
      <Row className="mb-3">
        <Col>
          <Button
            variant="outline-secondary back-btn"
            onClick={() => navigate(-1)}
          >
            <i className="bi bi-arrow-left me-2"></i> Back
          </Button>
        </Col>
      </Row>

      <Row>
        <Col lg={12}>
          <Card className="shadow-sm border-0 file-view-card">
            <Card.Header className="bg-white border-0 d-flex justify-content-between align-items-center">
              <h5 className="fw-bold mb-0">
                <i className="bi bi-file-earmark-text me-2"></i>
                Viewing File: {fileName}
              </h5>

              {isImage && !isCropping && (
                <div>
                  <Button
                    variant="warning"
                    className="me-2 btn-orange"
                    onClick={handleCrop}
                  >
                    <i className="bi bi-scissors me-1"></i> Crop
                  </Button>

                  <Button
                    variant={showOCR ? "secondary" : "success"}
                    onClick={handleOCR}
                    disabled={ocrLoading}
                  >
                    <i
                      className={`bi ${
                        showOCR
                          ? "bi-eye-slash"
                          : "bi-text-paragraph"
                      } me-1`}
                    ></i>
                    {ocrLoading
                      ? "Scanning..."
                      : showOCR
                      ? "Hide OCR"
                      : "OCR"}
                  </Button>
                </div>
              )}

              {isCropping && (
                <div>
                  <Button
                    variant="secondary"
                    className="me-2"
                    onClick={handleCropCancel}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="success"
                    onClick={handleCropSave}
                    disabled={cropLoading}
                  >
                    {cropLoading ? "Saving..." : "Save Crop"}
                  </Button>
                </div>
              )}
            </Card.Header>

            <Card.Body>
              <div className="fileview-wrapper">
                {isImage ? (
                  <div className="image-ocr-container">
                    {isCropping ? (
                      <Cropper
                        src={fileUrl}
                        style={{ width: "100%", maxHeight: "80vh" }}
                        guides
                        viewMode={1}
                        ref={cropperRef}
                      />
                    ) : (
                      <>
                        <img
                          ref={imgRef}
                          src={fileUrl}
                          alt={fileName}
                          className="fileview-image"
                        />

                        {showOCR &&
                          imgRef.current &&
                          ocrWords.map((w, i) => {
                            const scaleX =
                              imgRef.current.clientWidth /
                              imgRef.current.naturalWidth;
                            const scaleY =
                              imgRef.current.clientHeight /
                              imgRef.current.naturalHeight;

                            return (
                              <span
                                key={i}
                                className="ocr-word"
                                style={{
                                  left: `${w.x0 * scaleX}px`,
                                  top: `${w.y0 * scaleY}px`,
                                  width: `${(w.x1 - w.x0) * scaleX}px`,
                                  height: `${(w.y1 - w.y0) * scaleY}px`,
                                }}
                              >
                                {w.text}
                              </span>
                            );
                          })}
                      </>
                    )}
                  </div>
                ) : (
                  <iframe
                    src={fileUrl}
                    title="Document Viewer"
                    className="fileview-iframe"
                  ></iframe>
                )}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default FileView;
