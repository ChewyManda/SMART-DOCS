import React, { useState, useEffect, useCallback, memo, useRef } from 'react';
import {
  Container, Row, Col, Card, Table, Badge,
  Button, Form, Spinner, Dropdown, Pagination
} from 'react-bootstrap';
import api from '../../services/api';
import '../../css/admin/user-management.css';
import '../../css/components/edit-user-modal.css';
import '../../css/components/create-user-modal.css';
import CreateUserModal from '../../components/admin/CreateUserModal.jsx';
import EditUserModal from '../../components/admin/EditUserModal.jsx';

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


/* ============================================================
   USER TABLE
=============================================================== */
const UserTable = memo(({ users = [], loading, toggleStatus, deleteUser, currentUser, onEdit }) => {
  const getRoleBadge = (role) => {
    const map = { admin: 'danger', staff: 'warning', user: 'info' };
    return <Badge bg={map[role] || 'secondary'} className="fw-semibold">{role}</Badge>;
  };

  return (
    <Card className="user-card-list">
      <Card.Header className="d-flex justify-content-between align-items-center">
        <h5 className="mb-0 fw-bold">Users</h5>
      </Card.Header>

      <Card.Body className="p-0">
        <div className="table-responsive position-relative">
          {loading && (
            <div className="user-table-loading-overlay d-flex justify-content-center align-items-center">
              <Spinner animation="border" variant="primary" />
            </div>
          )}

          <Table className="user-table mb-0">
            <thead className="table-light">
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Department</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {users.length > 0 ? users.map(u => (
                <tr key={u.id}>
                  <td><code>{u.user_id}</code></td>
                  <td className="text-truncate">{u.name}</td>
                  <td className="text-truncate">{u.email}</td>
                  <td>{u.info?.department?.name || '-'}</td>
                  <td>{getRoleBadge(u.role)}</td>
                  <td>
                    <Badge bg={u.is_active ? 'success' : 'danger'} className="fw-semibold">
                      {u.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="d-flex gap-2 justify-content-end">
                    <Button size="sm" variant="outline-primary" onClick={() => onEdit(u.id)}>
                      <i className="bi bi-pencil" />
                    </Button>
                    <Button size="sm" variant="outline-warning" onClick={() => toggleStatus(u.id, u.is_active)}>
                      <i className={`bi bi-${u.is_active ? 'pause' : 'play'}`} />
                    </Button>
                    {currentUser?.role === 'admin' && (
                      <Button size="sm" variant="outline-danger" onClick={() => deleteUser(u.id)}>
                        <i className="bi bi-trash" />
                      </Button>
                    )}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="7" className="text-center py-5 text-muted">
                    <i className="bi bi-people fs-1 mb-3" /><br />
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </div>
      </Card.Body>
    </Card>
  );
});

/* ============================================================
   MAIN USER MANAGEMENT PAGE
=============================================================== */
const UserManagement = ({ user }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [manualSearch, setManualSearch] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDept, setFilterDept] = useState('all');
  const [sortOrder, setSortOrder] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editUserId, setEditUserId] = useState(null);
  const [editUserData, setEditUserData] = useState(null);
  const [departmentsList, setDepartmentsList] = useState([]);

  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);

  // Fetch departments list (only active ones for filtering)
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const res = await api.get('/departments', { params: { is_active: true } });
        setDepartmentsList(res.data.data || []);
      } catch (err) {
        console.error('Failed to fetch departments:', err);
      }
    };
    fetchDepartments();
  }, []);

  // Fetch users with optional search term
  const fetchUsers = useCallback(async (page = 1, search = searchQuery) => {
    try {
      setLoading(true);
      const params = {
        page,
        search: search || undefined,
        role: filterRole,
        status: filterStatus,
        department_id: filterDept !== 'all' ? filterDept : undefined,
        sort: sortOrder || undefined
      };
      const res = await api.get('/user/users', { params });
      setUsers(res.data.data || []);
      setCurrentPage(res.data.current_page || 1);
      setLastPage(res.data.last_page || 1);
    } catch (err) {
      console.error('Fetch users error:', err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, filterRole, filterStatus, filterDept, sortOrder]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // Click outside to close autocomplete
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        autocompleteRef.current &&
        !autocompleteRef.current.contains(e.target) &&
        inputRef.current &&
        !inputRef.current.contains(e.target)
      ) {
        setShowAutocomplete(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch autocomplete suggestions
  const fetchSuggestions = async (value) => {
    if (!value || value.length < 2) {
      setSuggestions([]);
      return;
    }
    try {
      const response = await api.get('/user/autocomplete', { params: { query: value } });
      setSuggestions(response.data.slice(0, 10));
    } catch (err) {
      console.error('Autocomplete error:', err);
    }
  };

  const handleKeyDown = (e) => {
    if (!showAutocomplete || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((prev) => (prev <= 0 ? suggestions.length - 1 : prev - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightIndex >= 0) {
        const selected = suggestions[highlightIndex];
        setManualSearch(selected.name);
        setSearchQuery(selected.name);
        fetchUsers(1, selected.name);
        setSuggestions([]);
        setShowAutocomplete(false);
      }
    }
  };

  const toggleStatus = async (id, status) => {
    await api.put(`/user/users/${id}`, { is_active: !status });
    fetchUsers(currentPage);
  };

  const deleteUser = async (id) => {
    if (!window.confirm('Delete this user?')) return;
    await api.delete(`/user/users/${id}`);
    fetchUsers(currentPage);
  };

  const handleEdit = (id) => {
    const user = users.find(u => u.id === id);
    setEditUserId(id);
    setEditUserData(user || null);
    setShowEdit(true);
  };

  const resetFilters = () => {
    setManualSearch('');
    setSearchQuery('');
    setFilterRole('all');
    setFilterStatus('all');
    setFilterDept('all');
    setSortOrder('');
  };

  const handlePageChange = (page) => {
    if (page < 1 || page > lastPage) return;
    fetchUsers(page);
  };

  const renderPagination = () => {
    if (lastPage <= 1) return null;
    const maxButtons = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
    let endPage = startPage + maxButtons - 1;
    if (endPage > lastPage) {
      endPage = lastPage;
      startPage = Math.max(1, endPage - maxButtons + 1);
    }
    const pages = [];
    if (startPage > 1) pages.push(<Pagination.Ellipsis key="start-ellipsis" disabled />);
    for (let i = startPage; i <= endPage; i++) {
      pages.push(<Pagination.Item key={i} active={i === currentPage} onClick={() => handlePageChange(i)}>{i}</Pagination.Item>);
    }
    if (endPage < lastPage) pages.push(<Pagination.Ellipsis key="end-ellipsis" disabled />);

    return (
      <Pagination className="justify-content-center mb-0">
        <Pagination.First disabled={currentPage === 1} onClick={() => handlePageChange(1)} />
        <Pagination.Prev disabled={currentPage === 1} onClick={() => handlePageChange(currentPage - 1)} />
        {pages}
        <Pagination.Next disabled={currentPage === lastPage} onClick={() => handlePageChange(currentPage + 1)} />
        <Pagination.Last disabled={currentPage === lastPage} onClick={() => handlePageChange(lastPage)} />
      </Pagination>
    );
  };

  // Departments are now fetched from API

  return (
    <Container fluid className="user-management-container">
      <Row className="user-page-header mb-4">
        <Col md={6}>
          <h2 className="fw-bold">User Management</h2>
          <p className="text-secondary">Manage system users</p>
        </Col>
        <Col md={6} className="text-md-end mt-3 mt-md-0">
          <Button
            className="user-create-btn shadow-sm fw-semibold"
            onClick={() => setShowCreate(true)}
          >
            <i className="bi bi-plus-lg me-2"></i> Create User
          </Button>
        </Col>
      </Row>

      <CreateUserModal
        show={showCreate}
        onHide={() => setShowCreate(false)}
        onSuccess={() => fetchUsers(1)}
      />

      <EditUserModal
        show={showEdit}
        onHide={() => {
          setShowEdit(false);
          setEditUserId(null);
          setEditUserData(null);
        }}
        onSuccess={() => {
          fetchUsers(currentPage);
          setShowEdit(false);
          setEditUserId(null);
          setEditUserData(null);
        }}
        userId={editUserId}
        userData={editUserData}
      />

      {/* SEARCH + FILTERS */}
      <Row className="mb-4">
        <Col>
          <Card className="user-search-card">
            <Card.Body>
              <Row className="g-3 align-items-center">
                <Col lg={6} style={{ position: 'relative' }}>
                  <div style={{ position: 'relative' }}>
                    <Form.Control
                      ref={inputRef}
                      type="text"
                      placeholder="Search name, email or ID..."
                      value={manualSearch}
                      onChange={(e) => {
                        setManualSearch(e.target.value);
                        fetchSuggestions(e.target.value);
                        setShowAutocomplete(true);
                        setHighlightIndex(-1);
                      }}
                      onKeyDown={handleKeyDown}
                      onFocus={() => { if (suggestions.length > 0) setShowAutocomplete(true); }}
                      style={{ height: '40px', fontSize: '0.95rem', paddingRight: manualSearch ? '45px' : '12px' }}
                    />
                    {manualSearch && (
                      <button
                        type="button"
                        className="search-clear-btn"
                        onClick={() => {
                          setManualSearch('');
                          setSearchQuery('');
                          setSuggestions([]);
                          setShowAutocomplete(false);
                          fetchUsers(1, '');
                        }}
                        style={{
                          position: 'absolute',
                          right: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          border: 'none',
                          background: 'transparent',
                          padding: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.2rem',
                          color: '#64748b',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          borderRadius: '6px',
                          width: '32px',
                          height: '32px',
                          zIndex: 10
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.color = '#FF6B00';
                          e.target.style.backgroundColor = 'rgba(255, 107, 0, 0.08)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.color = '#64748b';
                          e.target.style.backgroundColor = 'transparent';
                        }}
                      >
                        <i className="bi bi-x-lg"></i>
                      </button>
                    )}
                  </div>
                  {showAutocomplete && suggestions.length > 0 && (
                    <ul ref={autocompleteRef} className="user-autocomplete-suggestions list-unstyled shadow-sm">
                      {suggestions.map((s, index) => (
                        <li
                          key={s.id}
                          className={highlightIndex === index ? 'active' : ''}
                          onMouseEnter={() => setHighlightIndex(index)}
                          onClick={() => {
                            setManualSearch(s.name);
                            setSearchQuery(s.name);
                            fetchUsers(1, s.name);
                            setSuggestions([]);
                            setShowAutocomplete(false);
                          }}
                          style={{ fontSize: '0.9rem' }}
                        >
                          {s.name} ({s.user_id})
                        </li>
                      ))}
                    </ul>
                  )}
                </Col>

                <Col lg={2}>
                  <FilterSelect
                    value={filterRole}
                    onChange={(value) => setFilterRole(value)}
                    options={[
                      { value: 'all', label: 'All Roles' },
                      { value: 'admin', label: 'Admin' },
                      { value: 'staff', label: 'Staff' },
                      { value: 'user', label: 'User' }
                    ]}
                    placeholder="All Roles"
                  />
                </Col>

                <Col lg={2}>
                  <Button
                    className="w-100 user-search-btn fw-semibold"
                    onClick={() => {
                      setSearchQuery(manualSearch);
                      fetchUsers(1, manualSearch);
                      setSuggestions([]);
                    }}
                    style={{ height: '40px', fontSize: '0.95rem' }}
                  >
                    <i className="bi bi-search me-1"></i> Search
                  </Button>
                </Col>

                <Col lg={2} className="text-end">
                  <Dropdown>
                    <Dropdown.Toggle className="w-100 fw-semibold user-dropdown-toggle" variant="outline-secondary"
                      style={{ height: '40px', fontSize: '0.95rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      More Filters
                    </Dropdown.Toggle>
                    <Dropdown.Menu className="p-3" style={{ width: 300 }}>
                      <Form.Group className="mb-3">
                        <FilterSelect
                          label="Status"
                          value={filterStatus}
                          onChange={(value) => setFilterStatus(value)}
                          options={[
                            { value: 'all', label: 'All' },
                            { value: 'active', label: 'Active' },
                            { value: 'inactive', label: 'Inactive' }
                          ]}
                          placeholder="All"
                        />
                      </Form.Group>

                      <Form.Group className="mb-3">
                        <FilterSelect
                          label="Department"
                          value={filterDept}
                          onChange={(value) => setFilterDept(value)}
                          options={[
                            { value: 'all', label: 'All' },
                            ...departmentsList.map(d => ({ value: d.id.toString(), label: d.name }))
                          ]}
                          placeholder="All"
                        />
                      </Form.Group>

                      <Form.Group className="mb-3">
                        <FilterSelect
                          label="Sort"
                          value={sortOrder}
                          onChange={(value) => setSortOrder(value)}
                          options={[
                            { value: 'newest', label: 'Newest' },
                            { value: 'a-z', label: 'Name A-Z' },
                            { value: 'z-a', label: 'Name Z-A' }
                          ]}
                          placeholder="Newest"
                        />
                      </Form.Group>

                      <Button variant="outline-danger" className="w-100 fw-semibold" onClick={resetFilters}>
                        Reset Filters
                      </Button>
                    </Dropdown.Menu>
                  </Dropdown>
                </Col>

              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* USER TABLE */}
      <Row>
        <Col>
          <UserTable
            users={users}
            loading={loading}
            toggleStatus={toggleStatus}
            deleteUser={deleteUser}
            currentUser={user}
            onEdit={handleEdit}
          />
        </Col>
      </Row>

      {/* PAGINATION */}
      {lastPage > 1 && (
        <Row className="mt-3">
          <Col>{renderPagination()}</Col>
        </Row>
      )}
    </Container>
  );
};

export default UserManagement;
