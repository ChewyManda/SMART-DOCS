
import React from 'react';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

const LandingPage = () => {
  const navigate = useNavigate();

  const scrollToFeatures = () => {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="landing-page">
      {/* Navigation */}
      <nav className="landing-navbar">
        <Container>
          <div className="d-flex justify-content-between align-items-center">
            <div className="landing-logo">SMART-DOCS</div>
            <ul className="landing-nav-links d-none d-md-flex">
              <li><a href="#home">Home</a></li>
              <li><a href="#features">Features</a></li>
              <li><a href="#about">About</a></li>
            </ul>
            <Button 
              className="landing-login-btn"
              onClick={() => navigate('/login')}
            >
              Login
            </Button>
          </div>
        </Container>
      </nav>

      {/* Hero Section */}
      <section id="home" className="landing-hero">
        <Container>
          <div className="hero-content text-center">
            <h1 className="landing-title animate-fadeInUp">SMART-DOCS</h1>
            <p className="landing-subtitle animate-fadeInUp-delay1">
              Secure Management and Automated Receiving of Transmitted Documents 
              for University of Caloocan City
            </p>
            <div className="landing-cta-buttons animate-fadeInUp-delay2">
              <Button 
                className="btn-landing-primary pulse"
                onClick={() => navigate('/login')}
              >
                Get Started
              </Button>
              <Button 
                className="btn-landing-secondary"
                onClick={scrollToFeatures}
              >
                Learn More
              </Button>
            </div>
          </div>
        </Container>
      </section>

      {/* Features Section */}
      <section id="features" className="landing-features">
        <Container>
          <h2 className="landing-section-title">Key Features</h2>
          <Row>
            <Col md={4} className="mb-4">
              <Card className="landing-feature-card border-top-orange">
                <Card.Body>
                  <div className="landing-feature-icon bg-orange">📄</div>
                  <h3>OCR & Searchability</h3>
                  <p>Convert scanned documents to searchable PDFs and editable Word files. Keyword search within stored documents with copy and paste functionality.</p>
                </Card.Body>
              </Card>
            </Col>
            
            <Col md={4} className="mb-4">
              <Card className="landing-feature-card border-top-green">
                <Card.Body>
                  <div className="landing-feature-icon bg-green">🔒</div>
                  <h3>Secure Document Routing</h3>
                  <p>Automatic assignment to recipients based on role-based access levels (Level 1-4). Restricted visibility ensures document security.</p>
                </Card.Body>
              </Card>
            </Col>
            
            <Col md={4} className="mb-4">
              <Card className="landing-feature-card border-top-orange">
                <Card.Body>
                  <div className="landing-feature-icon bg-orange">📱</div>
                  <h3>Mobile Scanning</h3>
                  <p>Enhanced mobile scanning with cropping, brightness correction, and perspective adjustment. Batch upload support for multiple documents.</p>
                </Card.Body>
              </Card>
            </Col>
            
            <Col md={4} className="mb-4">
              <Card className="landing-feature-card border-top-green">
                <Card.Body>
                  <div className="landing-feature-icon bg-green">📊</div>
                  <h3>Document Tracking</h3>
                  <p>Complete timeline tracking from receipt to acknowledgment. Status logs for scanning, viewing, printing, and exporting activities.</p>
                </Card.Body>
              </Card>
            </Col>
            
            <Col md={4} className="mb-4">
              <Card className="landing-feature-card border-top-orange">
                <Card.Body>
                  <div className="landing-feature-icon bg-orange">🔔</div>
                  <h3>Real-time Notifications</h3>
                  <p>Instant alerts via web, email, and mobile app when documents are received or require attention.</p>
                </Card.Body>
              </Card>
            </Col>
            
            <Col md={4} className="mb-4">
              <Card className="landing-feature-card border-top-green">
                <Card.Body>
                  <div className="landing-feature-icon bg-green">🏷️</div>
                  <h3>Paper ID & QR Codes</h3>
                  <p>Embedded unique identifiers for authenticity verification. Reprinting capability with same tracking ID for traceability.</p>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
      </section>

      {/* About Section */}
      <section id="about" className="landing-about">
        <Container>
          <Row className="justify-content-center">
            <Col lg={8}>
              <h2 className="landing-section-title">About SMART-DOCS</h2>
              <p className="text-center mb-4" style={{ fontSize: '1.2rem' }}>
                SMART-DOCS is a comprehensive web-based and mobile accessible platform designed 
                specifically for the University of Caloocan City (UCC) to revolutionize document 
                management processes.
              </p>
              
              <Card className="border-0 shadow-sm mb-4">
                <Card.Body>
                  <h3 style={{ color: '#ff4400' }} className="mb-3">Project Team</h3>
                  <ul style={{ listStyle: 'none', padding: 0 }}>
                    <li className="mb-2">• Frutas, Emmanuelle Joshua F.</li>
                    <li className="mb-2">• Liwanag, Lorenz A.</li>
                    <li className="mb-2">• Maiwat, Karylle M.</li>
                    <li className="mb-2">• Roque, Darrel T.</li>
                  </ul>
                  
                  <h3 style={{ color: '#034b21' }} className="mt-4 mb-3">Supervised By</h3>
                  <p>
                    <strong>PROF. CATHERINE P. LLENA, MIT, MPA</strong><br />
                    Professor, Capstone Project I
                  </p>
                </Card.Body>
              </Card>
              
              <Card className="border-0 shadow-sm" style={{ background: '#f8f9fa' }}>
                <Card.Body className="text-center">
                  <h3 className="mb-2">University of Caloocan City</h3>
                  <p className="mb-0">
                    College of Liberal Arts and Sciences<br />
                    Computer Studies Department
                  </p>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <Container>
          <p className="mb-0 text-center">
            © 2025 SMART-DOCS. University of Caloocan City. All rights reserved.
          </p>
        </Container>
      </footer>
    </div>
  );
};

export default LandingPage;