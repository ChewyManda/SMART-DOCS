// components/RecipientsPanel.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Card, InputGroup, Form, Button, Pagination, Spinner, Badge } from 'react-bootstrap';
import '../../../css/components/create-user-modal.css';

/* ============================================================
   Custom Dropdown Component (like Create User Modal)
=============================================================== */
const FilterSelect = ({ label, value, options, onChange, placeholder = "Select" }) => {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  return (
    <div className="cu-select-wrapper" ref={wrapperRef}>
      {label && <label className="cu-label">{label}</label>}
      <div
        className={`cu-select-trigger ${open ? 'open' : ''}`}
        onClick={() => setOpen(o => !o)}
        style={{ height: '40px', fontSize: '0.95rem' }}
      >
        <span>{options.find(o => o.value === value)?.label || placeholder}</span>
        <span className="cu-select-arrow">▾</span>
      </div>
      {open && (
        <div className="cu-select-options">
          {options.map(opt => (
            <div
              key={opt.value}
              className={`cu-select-option ${opt.value === value ? 'active' : ''}`}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const RecipientsPanel = ({
  users,
  filteredUsers,
  paginatedUsers,
  loadingUsers,
  recipients,
  handleRecipientToggle,
  selectAllFiltered,
  clearAllRecipients,
  recSearch, setRecSearch,
  recDeptFilter, setRecDeptFilter,
  recLevelFilter, setRecLevelFilter,
  recPage, setRecPage,
  deptOptions,
  accessLevelOptions,
  ITEMS_PER_PAGE,
  recipientLabel,
  loading
}) => {

  const totalRecPages = Math.max(1, Math.ceil(filteredUsers.length / ITEMS_PER_PAGE));

  return (
    <Card className="custom-card-recipients shadow-sm border-0 mb-3">
      <Card.Header className="custom-card-header">
        <h5 className="mb-0">
          Recipients <Badge bg="secondary">{recipientLabel(recipients.length)}</Badge>
        </h5>
      </Card.Header>
      <Card.Body>
        <InputGroup className="mb-2">
          <Form.Control
            placeholder="Search recipients..."
            value={recSearch}
            onChange={e => { setRecSearch(e.target.value); setRecPage(1); }}
            disabled={loadingUsers}
          />
          <Button
            variant="outline-secondary"
            onClick={() => { setRecSearch(''); setRecPage(1); }}
          >
            Clear
          </Button>
        </InputGroup>

        <div className="row g-2 mb-3">
          <div className="col">
            <FilterSelect
              value={recDeptFilter}
              onChange={(value) => { setRecDeptFilter(value); setRecPage(1); }}
              options={deptOptions.map((d) => ({
                value: d,
                label: d === 'all' ? 'All departments' : d
              }))}
              placeholder="All departments"
            />
          </div>
          <div className="col">
            <FilterSelect
              value={recLevelFilter}
              onChange={(value) => { setRecLevelFilter(value); setRecPage(1); }}
              options={accessLevelOptions.map((l) => ({
                value: l,
                label: l === 'all' ? 'All levels' : `Level ${l}`
              }))}
              placeholder="All levels"
            />
          </div>
        </div>

        <div className="d-flex gap-2 mb-3">
          <Button size="sm" variant="outline-success" onClick={selectAllFiltered}>Select all</Button>
          <Button size="sm" variant="outline-secondary" onClick={clearAllRecipients}>Remove</Button>
        </div>

        <div className="recipients-list">
          {loadingUsers ? (
            <div className="py-4 text-center"><Spinner animation="border" /></div>
          ) : paginatedUsers.length ? (
            paginatedUsers.map(u => (
              <div key={u.id} className="recipient-row d-flex justify-content-between align-items-center mb-2">
                <div>
                  <div className="fw-bold">{u.name}</div>
                  <div className="small text-muted">{u.email} • {u.department || '—'}</div>
                </div>
                <Form.Check
                  type="checkbox"
                  checked={recipients.includes(u.id)}
                  onChange={() => handleRecipientToggle(u.id)}
                />
              </div>
            ))
          ) : (
            <div className="py-4 text-center text-muted">
              <i className="bi bi-people fs-3 mb-2" /><br/>
              No recipients found
            </div>
          )}
        </div>

        {filteredUsers.length > ITEMS_PER_PAGE && (
          <div className="mt-3 d-flex justify-content-center">
            <Pagination size="sm" className="mb-0">
              <Pagination.Prev
                onClick={() => setRecPage(p => Math.max(1, p - 1))}
                disabled={recPage === 1}
              />
              {[...Array(totalRecPages)].map((_, i) => {
                const p = i + 1;
                if (p === 1 || p === totalRecPages || (p >= recPage - 1 && p <= recPage + 1)) {
                  return (
                    <Pagination.Item key={p} active={p === recPage} onClick={() => setRecPage(p)}>
                      {p}
                    </Pagination.Item>
                  );
                }
                if (p === recPage - 2 || p === recPage + 2) return <Pagination.Ellipsis key={`e-${p}`} disabled />;
                return null;
              })}
              <Pagination.Next
                onClick={() => setRecPage(p => Math.min(totalRecPages, p + 1))}
                disabled={recPage === totalRecPages}
              />
            </Pagination>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default RecipientsPanel;
