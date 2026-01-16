import React, { useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { Form, Button, Alert, Spinner } from "react-bootstrap";
import { BsEye, BsEyeSlash } from "react-icons/bs";
import api from "../../services/api";
import '../../css/account/login.css';

const ResetPassword = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const token = params.get("token");
  const email = params.get("email");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setStatus(null);
    setLoading(true);

    if (password !== confirm) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    try {
      await api.post("/auth/reset-password", {
        token,
        email,
        password,
        password_confirmation: confirm,
      });
      setStatus("Password has been reset successfully.");
      setTimeout(() => navigate("/login"), 2000); // Redirect after 2 sec
    } catch (err) {
      setError(err.response?.data?.message || "Reset failed.");
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

          <h3 className="fw-bold text-center text-success mb-2">Reset Password</h3>
          <p className="text-center text-muted mb-4">Enter your new password below to reset your account</p>

          {status && <Alert variant="success" className="text-center rounded-3">{status}</Alert>}
          {error && <Alert variant="danger" className="text-center rounded-3">{error}</Alert>}

          <Form onSubmit={handleSubmit}>

            {/* NEW PASSWORD */}
            <div className="input-wrapper password-wrapper mb-3">
              <Form.Label className="fw-semibold">New Password</Form.Label>
              <Form.Control
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password"
                required
              />
              {password && (
                <button
                  type="button"
                  className="toggle-password-btn"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <BsEyeSlash /> : <BsEye />}
                </button>
              )}
            </div>

            {/* CONFIRM PASSWORD */}
            <div className="input-wrapper password-wrapper mb-3">
              <Form.Label className="fw-semibold">Confirm Password</Form.Label>
              <Form.Control
                type={showConfirmPassword ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Confirm new password"
                required
              />
              {confirm && (
                <button
                  type="button"
                  className="toggle-password-btn"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <BsEyeSlash /> : <BsEye />}
                </button>
              )}
            </div>

            {/* RESET PASSWORD BUTTON */}
            <Button
              type="submit"
              className="login-btn w-100 rounded-pill fw-bold py-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" /> Resetting...
                </>
              ) : (
                'Reset Password'
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

export default ResetPassword;
