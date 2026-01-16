import React, { useEffect, useState, useRef } from "react";
import { Container, Row, Col, Card, Button, Alert } from "react-bootstrap";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../services/api";
import "../../css/documents/fileview.css";
import "../../css/admin/admin-dashboard.css";

import FileControls from "../../components/documents/fileview/FileControls";
import FileDisplay from "../../components/documents/fileview/FileDisplay";
import FilePagination from "../../components/documents/fileview/FilePagination";
import EnlargedImageModal from "../../components/documents/fileview/EnlargedImageModal";

const FileView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const imgRef = useRef(null);

  const [documentId, setDocumentId] = useState(id); // Initialize with URL param as fallback
  const [files, setFiles] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fileUrl, setFileUrl] = useState(null);
  const [fileType, setFileType] = useState(null);
  const [isImage, setIsImage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [fileName, setFileName] = useState("");

  const [ocrWords, setOcrWords] = useState([]);
  const [showOCR, setShowOCR] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);

  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [isVideo, setIsVideo] = useState(false);
  const [isAudio, setIsAudio] = useState(false);
  const [isOfficeDoc, setIsOfficeDoc] = useState(false);
  const [officeDocType, setOfficeDocType] = useState(null);

  useEffect(() => {
    const fetchDocument = async () => {
      try {
        const res = await api.get(`/document/view/${id}`);

        if (!res.data.files || res.data.files.length === 0) {
          throw new Error("No files available.");
        }

        setDocumentId(res.data.id || id);
        setFiles(res.data.files);
        setFileName(res.data.title || `document-${id}`);
        loadFile(res.data.files, 0);
      } catch (error) {
        console.error(error);
        setErrorMsg("Failed to load document.");
      } finally {
        setLoading(false);
      }
    };

    fetchDocument();
  }, [id]);

  const loadFile = (filesArray, index) => {
    const file = filesArray[index];

    if (!file || !file.view_url) {
      setErrorMsg("File not found or URL missing.");
      return;
    }

    const typeLower = file.file_type.toLowerCase();
    setFileType(typeLower);

    const imageTypes = ["png", "jpg", "jpeg", "gif", "webp"];
    const pdfTypes = ["pdf"];
    const videoTypes = ["mp4", "avi", "mov", "wmv", "flv", "webm", "mkv"];
    const audioTypes = ["mp3", "wav", "ogg", "aac", "m4a"];
    const officeTypes = {
      "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "doc": "application/msword",
      "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "xls": "application/vnd.ms-excel",
      "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "ppt": "application/vnd.ms-powerpoint",
      "odt": "application/vnd.oasis.opendocument.text",
      "ods": "application/vnd.oasis.opendocument.spreadsheet",
      "odp": "application/vnd.oasis.opendocument.presentation",
      "rtf": "application/rtf",
      "txt": "text/plain"
    };

    if (imageTypes.includes(typeLower)) {
      setFileUrl(file.view_url);
      setIsImage(true);
      setIsVideo(false);
      setIsAudio(false);
      setIsOfficeDoc(false);
    } else if (pdfTypes.includes(typeLower)) {
      setFileUrl(file.view_url);
      setIsImage(false);
      setIsVideo(false);
      setIsAudio(false);
      setIsOfficeDoc(false);
    } else if (videoTypes.includes(typeLower)) {
      setFileUrl(file.view_url);
      setIsImage(false);
      setIsVideo(true);
      setIsAudio(false);
      setIsOfficeDoc(false);
    } else if (audioTypes.includes(typeLower)) {
      setFileUrl(file.view_url);
      setIsImage(false);
      setIsVideo(false);
      setIsAudio(true);
      setIsOfficeDoc(false);
    } else if (officeTypes[typeLower]) {
      setFileUrl(file.view_url);
      setIsImage(false);
      setIsVideo(false);
      setIsAudio(false);
      setIsOfficeDoc(true);
      setOfficeDocType(officeTypes[typeLower]);
    } else {
      setErrorMsg("Unsupported file type.");
    }

    setZoom(1);
    setRotation(0);
    setShowOCR(false);
    setOcrWords([]);
    setCurrentIndex(index);
  };

  const goToPage = (index) => {
    if (index >= 0 && index < files.length) {
      loadFile(files, index);
    }
  };

  const handleOCR = async () => {
    if (showOCR) {
      setShowOCR(false);
      return;
    }

    // Use documentId from state or fallback to id from URL params
    const docId = documentId || id;
    if (!docId) {
      alert("Document ID not available.");
      return;
    }

    try {
      setOcrLoading(true);

      if (ocrWords.length === 0) {
        const currentFile = files[currentIndex];
        if (!currentFile) {
          alert("No file selected.");
          return;
        }

        // Use document ID and pass file_id as query parameter
        const res = await api.get(`/document/ocr/${docId}`, {
          params: {
            file_id: currentFile.id
          }
        });

        if (!res.data.words || res.data.words.length === 0) {
          alert("No text found in image.");
          return;
        }

        setOcrWords(res.data.words);
      }

      setShowOCR(true);
    } catch (err) {
      console.error(err);
      const errorMessage = err.response?.data?.error || err.response?.data?.message || "OCR failed.";
      alert(errorMessage);
    } finally {
      setOcrLoading(false);
    }
  };

  const zoomIn = () => setZoom((z) => Math.min(z + 0.2, 3));
  const zoomOut = () => setZoom((z) => Math.max(z - 0.2, 0.4));
  const resetView = () => {
    setZoom(1);
    setRotation(0);
  };
  const rotate = () => setRotation((r) => (r + 90) % 360);

  const handlePrint = () => {
    if (!isImage || !fileUrl) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <style>
            body { margin:0; display:flex; justify-content:center; align-items:center; height:100vh; }
            img { max-width:100%; max-height:100%; }
          </style>
        </head>
        <body>
          <img src="${fileUrl}" onload="window.print(); window.close();" />
        </body>
      </html>
    `);

    printWindow.document.close();
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
    <div className="user-dashboard-container">
    <Container>
      <Row className="mb-3">
        <Col>
          <Button variant="outline-secondary back-btn" onClick={() => navigate(-1)}>
            <i className="bi bi-arrow-left me-2"></i> Back
          </Button>
        </Col>
      </Row>

      <Row>
        <Col lg={12}>
          <Card className="shadow-sm border-0 file-view-card">
            <Card.Header className="bg-white border-0 d-flex justify-content-between align-items-center flex-wrap gap-2">
              <h5 className="fw-bold mb-0">
                <i className="bi bi-file-earmark-text me-2"></i>
                Viewing File: {fileName}
              </h5>

              {!isImage && (
                <FileControls
                  isImage={isImage}
                  isVideo={isVideo}
                  isAudio={isAudio}
                  isOfficeDoc={isOfficeDoc}
                  zoomIn={zoomIn}
                  zoomOut={zoomOut}
                  rotate={rotate}
                  resetView={resetView}
                  handlePrint={handlePrint}
                  handleOCR={handleOCR}
                  showOCR={showOCR}
                  ocrLoading={ocrLoading}
                />
              )}
            </Card.Header>

            <Card.Body>
              <FileDisplay
                fileUrl={fileUrl}
                isImage={isImage}
                isVideo={isVideo}
                isAudio={isAudio}
                isOfficeDoc={isOfficeDoc}
                officeDocType={officeDocType}
                fileName={fileName}
                zoom={zoom}
                rotation={rotation}
                imgRef={imgRef}
                showOCR={showOCR}
                ocrWords={ocrWords}
                ocrLoading={ocrLoading}
                zoomIn={zoomIn}
                zoomOut={zoomOut}
                rotate={rotate}
                resetView={resetView}
                handlePrint={handlePrint}
                handleOCR={handleOCR}
                onNext={() => goToPage(currentIndex + 1)}
                onPrevious={() => goToPage(currentIndex - 1)}
                hasNext={currentIndex < files.length - 1}
                hasPrevious={currentIndex > 0}
              />
            </Card.Body>

            <FilePagination files={files} currentIndex={currentIndex} goToPage={goToPage} />
          </Card>
        </Col>
      </Row>

      <EnlargedImageModal
        showModal={showModal}
        setShowModal={setShowModal}
        fileUrl={fileUrl}
        fileName={fileName}
      />
    </Container>
    </div>
  );
};

export default FileView;
