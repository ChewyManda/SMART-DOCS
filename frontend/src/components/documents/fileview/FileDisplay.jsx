import React from "react";
import { Button } from "react-bootstrap";
import VideoPlayer from "./VideoPlayer";
import AudioPlayer from "./AudioPlayer";
import ImagePlayer from "./ImagePlayer";

const FileDisplay = ({
  fileUrl,
  isImage,
  isVideo,
  isAudio,
  isOfficeDoc,
  officeDocType,
  fileName,
  zoom,
  rotation,
  imgRef,
  showOCR,
  ocrWords,
  ocrLoading,
  zoomIn,
  zoomOut,
  rotate,
  resetView,
  handlePrint,
  handleOCR,
  onNext,
  onPrevious,
  hasNext,
  hasPrevious,
}) => {
  if (!fileUrl) return null;

  // Generate viewer URL for Office documents
  const getOfficeViewerUrl = () => {
    if (!isOfficeDoc || !fileUrl) return null;
    
    const encodedUrl = encodeURIComponent(fileUrl);
    
    // Try Microsoft Office Online Viewer first (better for Office formats)
    // Falls back to Google Docs Viewer if needed
    // Note: Both require publicly accessible URLs or proper CORS headers
    
    // Microsoft Office Online Viewer
    if (officeDocType?.includes("word") || officeDocType?.includes("msword")) {
      return `https://view.officeapps.live.com/op/embed.aspx?src=${encodedUrl}`;
    } else if (officeDocType?.includes("spreadsheet") || officeDocType?.includes("ms-excel")) {
      return `https://view.officeapps.live.com/op/embed.aspx?src=${encodedUrl}`;
    } else if (officeDocType?.includes("presentation") || officeDocType?.includes("ms-powerpoint")) {
      return `https://view.officeapps.live.com/op/embed.aspx?src=${encodedUrl}`;
    }
    
    // Fallback to Google Docs Viewer
    return `https://docs.google.com/viewer?url=${encodedUrl}&embedded=true`;
  };

  // Get appropriate icon for Office document type
  const getOfficeIcon = () => {
    if (officeDocType?.includes("word")) return "bi-file-earmark-word";
    if (officeDocType?.includes("spreadsheet") || officeDocType?.includes("excel")) return "bi-file-earmark-excel";
    if (officeDocType?.includes("presentation") || officeDocType?.includes("powerpoint")) return "bi-file-earmark-ppt";
    if (officeDocType?.includes("text/plain")) return "bi-file-earmark-text";
    return "bi-file-earmark";
  };

  // Get document type name
  const getDocumentTypeName = () => {
    if (officeDocType?.includes("word")) return "Word Document";
    if (officeDocType?.includes("spreadsheet") || officeDocType?.includes("excel")) return "Excel Spreadsheet";
    if (officeDocType?.includes("presentation") || officeDocType?.includes("powerpoint")) return "PowerPoint Presentation";
    if (officeDocType?.includes("text/plain")) return "Text Document";
    if (officeDocType?.includes("rtf")) return "Rich Text Document";
    if (officeDocType?.includes("opendocument")) return "OpenDocument";
    return "Office Document";
  };

  return (
    <div className={`fileview-wrapper ${isVideo || isAudio || isImage ? 'media-wrapper' : ''}`}>
      {isImage ? (
        <ImagePlayer
          src={fileUrl}
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
        />
      ) : isVideo ? (
        <VideoPlayer
          src={fileUrl}
          fileName={fileName}
          onNext={onNext}
          onPrevious={onPrevious}
          hasNext={hasNext}
          hasPrevious={hasPrevious}
        />
      ) : isAudio ? (
        <AudioPlayer
          src={fileUrl}
          fileName={fileName}
          onNext={onNext}
          onPrevious={onPrevious}
          hasNext={hasNext}
          hasPrevious={hasPrevious}
        />
      ) : isOfficeDoc ? (
        <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
          <div style={{ marginBottom: "1rem", textAlign: "center" }}>
            <i className={`bi ${getOfficeIcon()}`} style={{ fontSize: "4rem", color: "#666" }}></i>
            <h5 style={{ marginTop: "1rem" }}>{fileName}</h5>
            <p style={{ color: "#666", marginTop: "0.5rem" }}>
              {getDocumentTypeName()}
            </p>
          </div>
          <div style={{ width: "100%", height: "75vh", border: "1px solid #e2e8f0", borderRadius: "8px", overflow: "hidden", backgroundColor: "#fff" }}>
            <iframe
              src={getOfficeViewerUrl()}
              style={{ width: "100%", height: "100%", border: "none" }}
              title="Office Document Viewer"
              onError={(e) => {
                console.error("Failed to load document viewer", e);
              }}
            >
              <div style={{ padding: "2rem", textAlign: "center" }}>
                <p>Your browser does not support iframes or the document cannot be displayed.</p>
                <Button variant="outline-primary" href={fileUrl} target="_blank" rel="noreferrer" download>
                  <i className="bi bi-download me-2"></i>
                  Download Document
                </Button>
              </div>
            </iframe>
          </div>
          <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem" }}>
            <Button 
              variant="outline-primary"
              href={fileUrl} 
              target="_blank" 
              rel="noreferrer" 
              download
            >
              <i className="bi bi-download me-2"></i>
              Download Document
            </Button>
            <Button 
              variant="outline-secondary"
              href={fileUrl} 
              target="_blank" 
              rel="noreferrer"
            >
              <i className="bi bi-box-arrow-up-right me-2"></i>
              Open in New Tab
            </Button>
          </div>
        </div>
      ) : (
        <object data={fileUrl} type="application/pdf" width="100%" height="800px">
          <p>
            PDF cannot be displayed.{" "}
            <a href={fileUrl} target="_blank" rel="noreferrer">
              Download PDF
            </a>
          </p>
        </object>
      )}
    </div>
  );
};

export default FileDisplay;
