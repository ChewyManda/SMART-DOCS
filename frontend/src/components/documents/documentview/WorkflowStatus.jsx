import React, { useState, useEffect } from 'react';
import { Card, Badge, Button, Spinner, Alert, Modal, Form } from 'react-bootstrap';
import api from '../../../services/api';

const WorkflowStatus = ({ document, user, onWorkflowUpdate }) => {
  const [workflowInstance, setWorkflowInstance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [selectedStepInstance, setSelectedStepInstance] = useState(null);
  const [action, setAction] = useState('approved');
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (document?.id) {
      fetchWorkflow();
    }
  }, [document?.id]);

  const fetchWorkflow = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/workflow/document/${document.id}`);
      setWorkflowInstance(response.data.instance);
    } catch (err) {
      if (err.response?.status !== 404) {
        console.error('Failed to fetch workflow:', err);
        setError('Failed to load workflow status');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteStep = (stepInstance) => {
    setSelectedStepInstance(stepInstance);
    setAction('approved');
    setComments('');
    setShowCompleteModal(true);
  };

  const submitStepCompletion = async () => {
    if (!selectedStepInstance) return;

    setSubmitting(true);
    try {
      await api.post(
        `/workflow/instance/${workflowInstance.id}/step/${selectedStepInstance.id}/complete`,
        {
          action,
          comments: comments.trim() || null,
        }
      );
      setShowCompleteModal(false);
      await fetchWorkflow();
      if (onWorkflowUpdate) {
        onWorkflowUpdate();
      }
    } catch (err) {
      console.error('Failed to complete step:', err);
      alert(err.response?.data?.error || 'Failed to complete step');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      pending: 'warning',
      in_progress: 'info',
      completed: 'success',
      cancelled: 'secondary',
      failed: 'danger',
      approved: 'success',
      rejected: 'danger',
      skipped: 'secondary',
    };
    return <Badge bg={variants[status] || 'secondary'}>{status}</Badge>;
  };

  if (loading) {
    return (
      <Card className="mb-3">
        <Card.Body className="text-center">
          <Spinner size="sm" /> Loading workflow status...
        </Card.Body>
      </Card>
    );
  }

  if (!workflowInstance) {
    return null; // Don't show anything if no workflow
  }

  const currentStep = workflowInstance.currentStep;
  const stepInstances = workflowInstance.stepInstances || [];
  const myPendingSteps = stepInstances.filter(
    (si) => si.assigned_to === user?.id && si.status === 'pending'
  );

  return (
    <>
      <Card className="mb-4 shadow-sm border-0">
        <Card.Header className="bg-white border-0 d-flex justify-content-between align-items-center">
          <h6 className="mb-0">
            <i className="bi bi-diagram-3 me-2"></i>
            Workflow Status
          </h6>
          {getStatusBadge(workflowInstance.status)}
        </Card.Header>
        <Card.Body>
          <div className="mb-3">
            <strong>Workflow:</strong> {workflowInstance.workflow?.name || 'N/A'}
            <br />
            <small className="text-muted">
              {workflowInstance.workflow?.description || ''}
            </small>
          </div>

          {currentStep && (
            <div className="mb-3">
              <strong>Current Step:</strong> {currentStep.name}
              <br />
              <small className="text-muted">{currentStep.description || ''}</small>
            </div>
          )}

          {stepInstances.length > 0 && (
            <div>
              <strong>Step Progress:</strong>
              <div className="mt-2">
                {stepInstances.map((stepInstance, idx) => {
                  const step = stepInstance.workflowStep;
                  const isMyStep = stepInstance.assigned_to === user?.id;
                  const isPending = stepInstance.status === 'pending';
                  const canComplete = isMyStep && isPending;

                  return (
                    <div
                      key={stepInstance.id}
                      className={`p-3 mb-2 rounded border ${
                        stepInstance.id === currentStep?.id
                          ? 'border-primary bg-light'
                          : 'border-secondary'
                      }`}
                      style={{
                        borderColor: stepInstance.id === currentStep?.id ? '#f97316' : '#e2e8f0',
                        backgroundColor: stepInstance.id === currentStep?.id ? '#fff5f0' : '#ffffff'
                      }}
                    >
                      <div className="d-flex justify-content-between align-items-start">
                        <div className="flex-grow-1">
                          <div className="fw-semibold">
                            {idx + 1}. {step?.name || 'Unknown Step'}
                          </div>
                          <div className="small text-muted">
                            Assigned to:{' '}
                            {stepInstance.assignedUser?.name ||
                              stepInstance.assignedUser?.email ||
                              'N/A'}
                          </div>
                          {stepInstance.comments && (
                            <div className="small mt-1">
                              <em>"{stepInstance.comments}"</em>
                            </div>
                          )}
                        </div>
                        <div className="d-flex align-items-center gap-2">
                          {getStatusBadge(stepInstance.status)}
                          {canComplete && (
                            <Button
                              size="sm"
                              variant="success"
                              onClick={() => handleCompleteStep(stepInstance)}
                            >
                              Complete
                            </Button>
                          )}
                        </div>
                      </div>
                      {stepInstance.completed_at && (
                        <div className="small text-muted mt-1">
                          Completed:{' '}
                          {new Date(stepInstance.completed_at).toLocaleString()}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {myPendingSteps.length > 0 && (
            <Alert variant="info" className="mt-3">
              <i className="bi bi-info-circle me-2"></i>
              You have {myPendingSteps.length} pending workflow step(s) for this document.
            </Alert>
          )}

          {workflowInstance.completed_at && (
            <div className="mt-3 small text-muted">
              Completed: {new Date(workflowInstance.completed_at).toLocaleString()}
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Complete Step Modal */}
      <Modal show={showCompleteModal} onHide={() => setShowCompleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Complete Workflow Step</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Action</Form.Label>
              <Form.Select
                value={action}
                onChange={(e) => setAction(e.target.value)}
                disabled={submitting}
              >
                <option value="approved">Approve</option>
                <option value="rejected">Reject</option>
                <option value="skipped">Skip</option>
              </Form.Select>
            </Form.Group>
            <Form.Group>
              <Form.Label>Comments (optional)</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Add comments..."
                disabled={submitting}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowCompleteModal(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button variant="primary" onClick={submitStepCompletion} disabled={submitting}>
            {submitting ? (
              <>
                <Spinner size="sm" className="me-2" /> Submitting...
              </>
            ) : (
              'Submit'
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default WorkflowStatus;
