// components/RecipientsTable.jsx
import React from 'react';
import { Card, Table, Button, Badge } from 'react-bootstrap';

const RecipientsTable = ({ currentRecipients, recipientPage, setRecipientPage, totalRecipientPages }) => {
  return (
    <Card className="shadow-sm border-0 recepients-card mb-4">
      <Card.Header className="bg-white border-0">
        <h5><i className="bi bi-people me-2"></i>Recipients</h5>
      </Card.Header>
      <Card.Body className="p-0">
        <Table hover responsive className="mb-0">
          <thead>
            <tr>
              <th>Name</th>
              <th>Department</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {currentRecipients.map(r => (
              <tr key={r.id}>
                <td>
                  <div className="d-flex align-items-center">
                    <div className="bg-secondary text-white rounded-circle d-flex align-items-center justify-content-center me-2" style={{ width: 40, height: 40, fontSize: '0.875rem', fontWeight: 600 }}>
                      {r.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </div>
                    <div>
                      <div className="fw-semibold">{r.name}</div>
                      <small className="text-muted">{r.email}</small>
                    </div>
                  </div>
                </td>
                <td>{r.department || "-"}</td>
                <td>
                  {r.pivot.is_acknowledged ? (
                    <Badge bg="success"><i className="bi bi-check-circle me-1"></i>Acknowledged</Badge>
                  ) : r.pivot.is_viewed ? (
                    <Badge bg="info"><i className="bi bi-eye me-1"></i>Viewed</Badge>
                  ) : (
                    <Badge bg="secondary"><i className="bi bi-x-circle me-1"></i>Not Viewed</Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>

        {totalRecipientPages > 1 && (
          <div className="d-flex justify-content-end align-items-center p-3 border-top">
            <Button 
              variant="outline-secondary" 
              size="sm" 
              disabled={recipientPage === 1} 
              onClick={() => setRecipientPage(prev => prev - 1)}
              className="me-2"
            >
              <i className="bi bi-chevron-left"></i> Previous
            </Button>
            <span className="me-2 text-muted small">Page {recipientPage} of {totalRecipientPages}</span>
            <Button 
              variant="outline-secondary" 
              size="sm" 
              disabled={recipientPage === totalRecipientPages} 
              onClick={() => setRecipientPage(prev => prev + 1)}
            >
              Next <i className="bi bi-chevron-right"></i>
            </Button>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default RecipientsTable;
