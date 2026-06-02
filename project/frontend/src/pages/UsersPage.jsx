import { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function UsersPage() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = search ? { search } : {};
      const { data } = await api.get('/users', { params });
      setUsers(data.data.users);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleRoleToggle = async (userId, currentRole) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    if (!confirm(`Change role to ${newRole}?`)) return;
    try {
      await api.patch(`/users/${userId}/role`, { role: newRole });
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update role.');
    }
  };

  const handleStatusToggle = async (userId) => {
    if (!confirm('Toggle user status?')) return;
    try {
      await api.patch(`/users/${userId}/status`);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update status.');
    }
  };

  const handleDelete = async (userId) => {
    if (!confirm('Delete this user and all their tasks? This cannot be undone.')) return;
    try {
      await api.delete(`/users/${userId}`);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed.');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>User Management</h1>
          <p>Admin view — manage all registered users.</p>
        </div>
      </div>

      <div className="filters" style={{ marginBottom: 20 }}>
        <input
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ minWidth: 250 }}
        />
        <button className="btn btn-primary btn-sm" onClick={fetchUsers}>Search</button>
        {search && <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); fetchUsers(); }}>Clear</button>}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
        </div>
      ) : users.length === 0 ? (
        <div className="empty-state">
          <h3>No users found</h3>
          <p>Try adjusting your search.</p>
        </div>
      ) : (
        <div className="task-list">
          {users.map((u) => (
            <div key={u._id} className="task-item" style={{ opacity: u.isActive ? 1 : 0.5 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', fontWeight: 700, fontSize: '0.8rem', flexShrink: 0, fontFamily: 'var(--font-head)' }}>
                {u.name?.charAt(0).toUpperCase()}
              </div>
              <div className="task-info">
                <div className="task-title">
                  {u.name}
                  {u._id === me._id && <span className="text-xs" style={{ marginLeft: 8, color: 'var(--accent)' }}>(you)</span>}
                </div>
                <div className="task-meta">
                  <span className="text-xs">{u.email}</span>
                  <span className={`badge badge-${u.role}`}>{u.role}</span>
                  <span className={`badge ${u.isActive ? 'badge-done' : 'badge-todo'}`}>
                    {u.isActive ? 'active' : 'inactive'}
                  </span>
                  {u.lastLogin && (
                    <span className="text-xs">Last login {new Date(u.lastLogin).toLocaleDateString()}</span>
                  )}
                </div>
              </div>
              {u._id !== me._id && (
                <div className="task-actions">
                  <button className="btn btn-ghost btn-sm" onClick={() => handleRoleToggle(u._id, u.role)}>
                    → {u.role === 'admin' ? 'user' : 'admin'}
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => handleStatusToggle(u._id)}>
                    {u.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(u._id)}>Del</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
