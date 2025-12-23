import React, { useState } from 'react';
import { Form, Button, Alert, Spinner } from 'react-bootstrap';
import { BsEye, BsEyeSlash } from "react-icons/bs";
import api from '../../services/api';
import '../../css/account/login.css';

const Login = ({ onLogin }) => {
  const [formData, setFormData] = useState({ login: '', password: '' });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({ login: false, password: false });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setFieldErrors({ ...fieldErrors, [name]: false });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors({ login: false, password: false });
    setLoading(true);

    let hasError = false;
    let newFieldErrors = { login: false, password: false };

    if (!formData.login.trim()) { newFieldErrors.login = true; hasError = true; }
    if (!formData.password) { newFieldErrors.password = true; hasError = true; }

    if (hasError) {
      setFieldErrors(newFieldErrors);
      setLoading(false);
      return;
    }

    try {
      const response = await api.post('/login', formData);
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      onLogin(response.data.user, response.data.token);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page d-flex flex-column flex-md-row">

      {/* LEFT SIDE */}
      <div className="login-left d-flex flex-column justify-content-center align-items-center text-white p-5 text-center">

        {/* Logos */}
        <div className="d-flex align-items-center mb-4">
          <img src="/logo-SMD.png" alt="SmartDocs Logo" height="70" className="me-3" />
          <img src="/UCC.png" alt="UCC Logo" height="70" />
        </div>

        {/* University Name */}
        <h4 className="fw-bold mb-2" style={{ fontSize: "1.6rem", letterSpacing: "0.5px" }}>
          University of Caloocan City
        </h4>

        {/* SMART-DOCS Title */}
        <h1 className="brand-title fw-bold mt-3 mb-3" style={{ fontSize: "4rem" }}>
          SMART-DOCS
        </h1>

        {/* Full System Title */}
        <p className="lead fw-medium mb-4" style={{ fontSize: "1.05rem", lineHeight: "1.7" }}>
          Secure Management and Automated Receiving<br />
          of Transmitted Documents System
        </p>

        <hr className="brand-divider my-4" />
      </div>

      {/* RIGHT SIDE */}
      <div className="login-right d-flex justify-content-center align-items-center p-4">
        <div className="login-box p-5 rounded-4 shadow">

          <h3 className="fw-bold text-center text-success mb-2">Welcome Back</h3>
          <p className="text-center text-muted mb-4">Login to access your account</p>

          {error && <Alert variant="danger" className="text-center rounded-3">{error}</Alert>}

          <Form onSubmit={handleSubmit}>

            {/* USER ID / EMAIL */}
            <div className="input-wrapper mb-3">
              <Form.Label className="fw-semibold">User ID / Email</Form.Label>
              <Form.Control
                type="text"
                name="login"
                value={formData.login}
                onChange={handleChange}
                placeholder="Enter your User ID or Email"
                className={fieldErrors.login ? 'is-invalid' : ''}
              />
            </div>

            {/* PASSWORD */}
            <div className="input-wrapper password-wrapper mb-4">
              <Form.Label className="fw-semibold">Password</Form.Label>
              <Form.Control
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                className={fieldErrors.password ? 'is-invalid' : ''}
              />

              {formData.password && (
                <button
                  type="button"
                  className="toggle-password-btn"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <BsEyeSlash /> : <BsEye />}
                </button>
              )}
            </div>

            {/* LOGIN BUTTON */}
            <Button
              type="submit"
              className="login-btn w-100 rounded-pill fw-bold py-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" /> Logging in...
                </>
              ) : (
                'Login'
              )}
            </Button>
          </Form>

          <div className="text-center mt-4">
            <small className="text-muted">© 2025 SMART-DOCS. All rights reserved.</small>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
