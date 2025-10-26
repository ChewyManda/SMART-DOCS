import React, { useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert } from 'react-bootstrap';
import api from '../services/api';

const Login = ({ onLogin }) => {
  const [formData, setFormData] = useState({
    login: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

const handleSubmit = async (e) => {
  e.preventDefault();
  setError('');
  setLoading(true);

  try {
    const response = await api.post('/login', formData);
    
    console.log('Login response:', response.data); // DEBUG
    console.log('Token:', response.data.token); // DEBUG
    
    // Save token and user
    localStorage.setItem('token', response.data.token);
    localStorage.setItem('user', JSON.stringify(response.data.user));
    
    console.log('Token saved:', localStorage.getItem('token')); // DEBUG
    
    onLogin(response.data.user, response.data.token);
  } catch (err) {
    setError(err.response?.data?.message || 'Invalid credentials');
  } finally {
    setLoading(false);
  }
};

  return (
    <div 
      className="min-vh-100 d-flex align-items-center" 
      style={{
        background: 'linear-gradient(135deg, #FFB085 0%, #A9DFBF 100%)'
      }}
    >
      <Container>
        <Row className="justify-content-center">
          <Col md={6} lg={5}>
            <Card className="shadow-lg border-0 rounded-4">
              <Card.Body className="p-5">
                <div className="text-center mb-4">
                  <h1 className="fw-bold" style={{
                    background: 'linear-gradient(45deg, #ff4400, #034b21)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                  }}>
                    SMART-DOC
                  </h1>
                  <p className="text-muted">
                    Secure Management and Automated Receiving of Transmitted Documents
                  </p>
                </div>

                {error && <Alert variant="danger">{error}</Alert>}

                <Form onSubmit={handleSubmit} method="POST">
                  <Form.Group className="mb-3">
                    <Form.Label>User ID / Email</Form.Label>
                    <Form.Control
                      type="text"
                      name="login"
                      value={formData.login}
                      onChange={handleChange}
                      placeholder="Enter your User ID or Email"
                      required
                      className="rounded-3"
                    />
                  </Form.Group>

                  <Form.Group className="mb-4">
                    <Form.Label>Password</Form.Label>
                    <Form.Control
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Enter your password"
                      required
                      className="rounded-3"
                    />
                  </Form.Group>

                  <Button
                    type="submit"
                    className="w-100 rounded-pill py-2 fw-bold"
                    style={{
                      background: 'linear-gradient(45deg, #ff4400, #e0681e)',
                      border: 'none'
                    }}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" />
                        Logging in...
                      </>
                    ) : (
                      'Login'
                    )}
                  </Button>
                </Form>

                <div className="mt-4 text-center">
                  <small className="text-muted">
                    University of Caloocan City <br />
                    © 2024 SMART-DOC. All rights reserved.
                  </small>
                </div>

                <div className="mt-3 p-3 bg-light rounded">
                  <small className="text-muted">
                    <strong>Demo Accounts:</strong><br />
                    Admin: admin@ucc.edu.ph / admin123<br />
                    Staff: staff@ucc.edu.ph / staff123<br />
                    User: john.doe@ucc.edu.ph / user123
                  </small>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default Login;