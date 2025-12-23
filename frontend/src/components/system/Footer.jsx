import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';

const AppFooter = () => {
  return (
    <footer style={{ backgroundColor: '#f8f9fa', padding: '20px 0', borderTop: '1px solid #e5e5e5' }}>
      <Container>
        <Row className="text-center text-md-start">
          <Col md={6} className="mb-2 mb-md-0">
            <p className="mb-0">&copy; 2025 SMART-DOCS. All rights reserved.</p>
          </Col>
          <Col md={6} className="text-md-end">
            <a href="/privacy" className="me-3 text-decoration-none text-muted">Privacy Policy</a>
            <a href="/terms" className="text-decoration-none text-muted">Terms of Service</a>
          </Col>
        </Row>
      </Container>
    </footer>
  );
};

export default AppFooter;
