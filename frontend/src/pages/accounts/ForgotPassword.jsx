import React, { useState } from 'react';
import { Form, Button, Alert, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import '../../css/account/login.css'; // Keep the same CSS for layout

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus(null);
    setError(null);
    setLoading(true);

    try {
      const res = await api.post('/auth/forgot-password', { email });
      setStatus(res.data.message);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send reset link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page d-flex flex-column flex-md-row">

      {/* LEFT BRAND PANEL */}
      <div className="login-left d-flex flex-column justify-content-center align-items-center text-white p-5 text-center">
        <div className="d-flex align-items-center mb-4">
          <img src="/logo-SMD.png" alt="SmartDocs Logo" height="70" className="me-3" />
          <img src="/UCC.png" alt="UCC Logo" height="70" />
        </div>

        <h4 className="fw-bold mb-2" style={{ fontSize: "1.6rem", letterSpacing: "0.5px" }}>
          University of Caloocan City
        </h4>

        <h1 className="brand-title fw-bold mt-3 mb-3" style={{ fontSize: "4rem" }}>
          SMART-DOCS
        </h1>

        <p className="lead fw-medium mb-4" style={{ fontSize: "1.05rem", lineHeight: "1.7" }}>
          Secure Management and Automated Receiving<br />
          of Transmitted Documents System
        </p>

        <hr className="brand-divider my-4" />
      </div>

      {/* RIGHT SIDE */}
      <div className="login-right d-flex justify-content-center align-items-center p-4">
        <div className="login-box p-5 rounded-4 shadow">

          <h3 className="fw-bold text-center text-success mb-2">Forgot Password</h3>
          <p className="text-center text-muted mb-4">Enter your email address to receive a password reset link</p>

          {status && <Alert variant="success" className="text-center rounded-3">{status}</Alert>}
          {error && <Alert variant="danger" className="text-center rounded-3">{error}</Alert>}

          <Form onSubmit={handleSubmit}>

            {/* EMAIL ADDRESS */}
            <div className="input-wrapper mb-3">
              <Form.Label className="fw-semibold">Email Address</Form.Label>
              <Form.Control
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />
            </div>

            {/* SEND RESET LINK BUTTON */}
            <Button
              type="submit"
              className="login-btn w-100 rounded-pill fw-bold py-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" /> Sending...
                </>
              ) : (
                'Send Reset Link'
              )}
            </Button>
          </Form>

          <div className="text-center mt-4">
            <Link to="/login" className="text-decoration-none fw-semibold">
              Back to Login
            </Link>
          </div>

          <div className="text-center mt-4">
            <small className="text-muted">© 2025 SMART-DOCS. All rights reserved.</small>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
