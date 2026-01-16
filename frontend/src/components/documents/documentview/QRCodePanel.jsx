// components/QRCodePanel.jsx
import React from 'react';
import { Card, Dropdown } from 'react-bootstrap';
import { QRCodeCanvas } from 'qrcode.react';

const QRCodePanel = ({ id, documentUrl, docData, handleDownloadQR, handlePrintQR }) => {
  return (
    <Card className="shadow-sm border-0 mb-4 qr-sticky qr-card">
      <Card.Header className="bg-white border-0">
        <h5><i className="bi bi-qr-code me-2"></i>Quick Access QR</h5>
      </Card.Header>
      <Card.Body className="d-flex flex-column align-items-center">

        <div 
          className="p-3 mb-3 rounded-3" 
          style={{
            background: '#f8f9fa',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            display: 'inline-block'
          }}
        >
          <QRCodeCanvas 
            id={`qr-code-${id}`} 
            value={documentUrl} 
            size={230} 
            level="H" 
            includeMargin={true}
            imageSettings={{
              src: '/logo-SMD.png',
              height: 50,
              width: 50,
              excavate: true, // Creates space around the logo
            }}
          />
        </div>

        <Dropdown>
          <Dropdown.Toggle variant="secondary" className="dropdown-qr-actions">
            QR Actions 
          </Dropdown.Toggle>

          <Dropdown.Menu>
            <Dropdown.Item onClick={handleDownloadQR}>
              <i className="bi bi-download me-2"></i>Download QR
            </Dropdown.Item>
            <Dropdown.Item onClick={handlePrintQR}>
              <i className="bi bi-printer me-2"></i>Print QR
            </Dropdown.Item>
            <Dropdown.Item onClick={() => navigator.clipboard.writeText(documentUrl)}>
              <i className="bi bi-link-45deg me-2"></i>Copy Link
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>

      </Card.Body>
    </Card>
  );
};

export default QRCodePanel;
