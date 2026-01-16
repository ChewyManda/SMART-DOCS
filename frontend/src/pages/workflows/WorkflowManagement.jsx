import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Table, Badge, Modal, Form, Alert, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const WorkflowManagement = ({ user }) => {
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    if (user && (user.role === 'admin' || user.role === 'staff')) {
      fetchWorkflows();
    } else {
      navigate('/document');
    }
  }, [user, navigate]);

  const fetchWorkflows = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/workflow');
      setWorkflows(response.data);
    } catch (err) {
      console.error('Failed to fetch workflows:', err);
      setError('Failed to load workflows');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this workflow?')) {
      return;
    }

    try {
      await api.delete(`/workflow/${id}`);
      await fetchWorkflows();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete workflow');
    }
  };

  const getStatusBadge = (isActive) => {
    return isActive ? (
      <Badge bg="success">Active</Badge>
    ) : (
      <Badge bg="secondary">Inactive</Badge>
    );
  };

  const getTypeBadge = (type) => {
    const variants = {
      approval: 'primary',
      review: 'info',
      processing: 'warning',
    };
    return <Badge bg={variants[type] || 'secondary'}>{type}</Badge>;
  };

  if (loading) {
    return (
      <Container className="mt-4">
        <div className="text-center">
          <Spinner animation="border" /> Loading workflows...
        </div>
      </Container>
    );
  }

  return (
    <Container fluid className="mt-4">
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <h2>
              <i className="bi bi-diagram-3 me-2"></i>
              Workflow Management
            </h2>
            <Button variant="primary" onClick={() => navigate('/workflow/create')}>
              <i className="bi bi-plus-circle me-2"></i>
              Create Workflow
            </Button>
          </div>
        </Col>
      </Row>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Row>
        <Col>
          <Card>
            <Card.Header>
              <h5 className="mb-0">Workflows</h5>
            </Card.Header>
            <Card.Body>
              {workflows.length === 0 ? (
                <div className="text-center py-5">
                  <i className="bi bi-inbox fs-1 text-muted d-block mb-3"></i>
                  <p className="text-muted">No workflows found. Create your first workflow to get started.</p>
                </div>
              ) : (
                <Table responsive hover>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Type</th>
                      <th>Trigger</th>
                      <th>Steps</th>
                      <th>Priority</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workflows.map((workflow) => (
                      <tr key={workflow.id}>
                        <td>
                          <strong>{workflow.name}</strong>
                          {workflow.description && (
                            <div className="small text-muted">{workflow.description}</div>
                          )}
                        </td>
                        <td>{getTypeBadge(workflow.type)}</td>
                        <td>
                          <small>
                            {workflow.trigger_type === 'classification' ? (
                              <>
                                <strong>Classification:</strong> {workflow.trigger_value || 'Any'}
                              </>
                            ) : (
                              'Manual'
                            )}
                          </small>
                        </td>
                        <td>{workflow.steps?.length || 0}</td>
                        <td>{workflow.priority}</td>
                        <td>{getStatusBadge(workflow.is_active)}</td>
                        <td>
                          <div className="d-flex gap-2">
                            <Button
                              size="sm"
                              variant="outline-info"
                              onClick={() => {
                                setSelectedWorkflow(workflow);
                                setShowViewModal(true);
                              }}
                            >
                              <i className="bi bi-eye"></i>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline-danger"
                              onClick={() => handleDelete(workflow.id)}
                            >
                              <i className="bi bi-trash"></i>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* View Workflow Modal */}
      <Modal show={showViewModal} onHide={() => setShowViewModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Workflow Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedWorkflow && (
            <>
              <div className="mb-3">
                <strong>Name:</strong> {selectedWorkflow.name}
              </div>
              <div className="mb-3">
                <strong>Description:</strong> {selectedWorkflow.description || 'N/A'}
              </div>
              <div className="mb-3">
                <strong>Type:</strong> {getTypeBadge(selectedWorkflow.type)}
              </div>
              <div className="mb-3">
                <strong>Trigger:</strong>{' '}
                {selectedWorkflow.trigger_type === 'classification' ? (
                  <>Classification: {selectedWorkflow.trigger_value || 'Any'}</>
                ) : (
                  'Manual'
                )}
              </div>
              <div className="mb-3">
                <strong>Steps:</strong>
                {selectedWorkflow.steps && selectedWorkflow.steps.length > 0 ? (
                  <ol className="mt-2">
                    {selectedWorkflow.steps.map((step, idx) => (
                      <li key={step.id} className="mb-2">
                        <strong>{step.name}</strong>
                        {step.description && (
                          <div className="small text-muted">{step.description}</div>
                        )}
                        <div className="small">
                          Type: {step.step_type} | Order: {step.step_order} | Required:{' '}
                          {step.is_required ? 'Yes' : 'No'}
                        </div>
                        {step.assignees && step.assignees.length > 0 && (
                          <div className="small text-muted mt-1">
                            Assignees: {step.assignees.length}
                          </div>
                        )}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <div className="text-muted">No steps configured</div>
                )}
              </div>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowViewModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default WorkflowManagement;
