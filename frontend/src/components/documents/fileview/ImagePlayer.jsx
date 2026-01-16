import React, { useState, useRef, useEffect } from 'react';
import { BsZoomIn, BsZoomOut, BsArrowClockwise, BsPrinter } from 'react-icons/bs';
import { BiReset } from 'react-icons/bi';
import { BiText } from 'react-icons/bi';

const ImagePlayer = ({ 
  src, 
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
  handleOCR
}) => {
  const containerRef = useRef(null);
  const [showControls, setShowControls] = useState(true);
  const [isHovering, setIsHovering] = useState(false);

  // Auto-hide controls
  useEffect(() => {
    if (!isHovering) {
      const timer = setTimeout(() => {
        setShowControls(false);
      }, 3000);
      return () => clearTimeout(timer);
    } else {
      setShowControls(true);
    }
  }, [isHovering]);

  return (
    <div
      ref={containerRef}
      className="youtube-image-player"
      onMouseEnter={() => {
        setIsHovering(true);
        setShowControls(true);
      }}
      onMouseLeave={() => setIsHovering(false)}
      onMouseMove={() => {
        setIsHovering(true);
        setShowControls(true);
      }}
    >
      <div className="youtube-image-container">
        <div className="image-ocr-container">
          <img
            ref={imgRef}
            src={src}
            alt={fileName}
            className="youtube-image-element"
            style={{
              cursor: "pointer",
              transform: `scale(${zoom}) rotate(${rotation}deg)`,
              transformOrigin: "center center",
              transition: "transform 0.2s ease",
            }}
          />
          {showOCR &&
            imgRef.current &&
            ocrWords.map((w, i) => {
              const scaleX =
                (imgRef.current.clientWidth * zoom) / imgRef.current.naturalWidth;
              const scaleY =
                (imgRef.current.clientHeight * zoom) / imgRef.current.naturalHeight;
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
        </div>
      </div>

      {/* Controls Overlay */}
      <div className={`youtube-controls-overlay ${showControls || isHovering ? 'show' : ''}`}>
        {/* Bottom Controls */}
        <div className="youtube-controls-bottom">
          <div className="youtube-controls-left">
            {/* Zoom Out */}
            <button 
              className="youtube-control-btn" 
              onClick={zoomOut}
              title="Zoom Out"
            >
              <BsZoomOut />
            </button>

            {/* Zoom In */}
            <button 
              className="youtube-control-btn" 
              onClick={zoomIn}
              title="Zoom In"
            >
              <BsZoomIn />
            </button>

            {/* Rotate */}
            <button 
              className="youtube-control-btn" 
              onClick={rotate}
              title="Rotate"
            >
              <BsArrowClockwise />
            </button>

            {/* Reset View */}
            <button 
              className="youtube-control-btn" 
              onClick={resetView}
              title="Reset View"
            >
              <BiReset />
            </button>
          </div>

          <div className="youtube-controls-right">
            {/* Print */}
            <button
              className="youtube-control-btn"
              onClick={handlePrint}
              title="Print"
            >
              <BsPrinter />
            </button>

            {/* OCR */}
            <button
              className={`youtube-control-btn ${showOCR ? 'active' : ''}`}
              onClick={handleOCR}
              disabled={ocrLoading}
              title={ocrLoading ? "Scanning..." : showOCR ? "Hide OCR" : "OCR Text Recognition"}
            >
              <i className={`bi ${showOCR ? "bi-eye-slash" : "bi-text-paragraph"}`}></i>
            </button>
          </div>
        </div>
      </div>

    </div>
  );
};

export default ImagePlayer;
