import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import TaskModal from '../components/TaskModal';
import { useAuth } from '../context/AuthContext';

const statusClass = { todo: 'badge-todo', 'in-progress': 'badge-in-progress', done: 'badge-done' };
const priorityClass = { low: 'badge-low', medium: 'badge-medium', high: 'badge-high' };

function Badge({ value, classMap }) {
  return <span className={`badge ${classMap[value] || ''}`}>{value}</span>;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [filters, setFilters] = useState({ status: '', priority: '', search: '' });
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        page: pagination.page,
        limit: 15,
        ...(filters.status && { status: filters.status }),
        ...(filters.priority && { priority: filters.priority }),
        ...(filters.search && { search: filters.search }),
      };
      const { data } = await api.get('/tasks', { params });
      setTasks(data.data.tasks);
      setPagination((p) => ({ ...p, ...data.data.pagination }));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load tasks.');
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.page]);

  const fetchStats = async () => {
    try {
      const { data } = await api.get('/tasks/stats');
      setStats(data.data);
    } catch {}
  };

  useEffect(() => {
    fetchTasks();
    fetchStats();
  }, [fetchTasks]);

  const handleCreate = async (payload) => {
    await api.post('/tasks', payload);
    fetchTasks();
    fetchStats();
  };

  const handleUpdate = async (payload) => {
    await api.put(`/tasks/${editingTask._id}`, payload);
    fetchTasks();
    fetchStats();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this task?')) return;
    try {
      await api.delete(`/tasks/${id}`);
      fetchTasks();
      fetchStats();
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed.');
    }
  };

  const openEdit = (task) => { setEditingTask(task); setModalOpen(true); };
  const openCreate = () => { setEditingTask(null); setModalOpen(true); };

  const handleFilterChange = (key, val) => {
    setFilters((f) => ({ ...f, [key]: val }));
    setPagination((p) => ({ ...p, page: 1 }));
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Tasks</h1>
          <p>Hello, {user?.name}. Here's what's on your plate.</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ New Task</button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Total</div>
            <div className="stat-value">{stats.total}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Todo</div>
            <div className="stat-value" style={{ color: 'var(--text2)' }}>{stats.byStatus?.todo || 0}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">In Progress</div>
            <div className="stat-value" style={{ color: 'var(--accent)' }}>{stats.byStatus?.['in-progress'] || 0}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Done</div>
            <div className="stat-value" style={{ color: 'var(--green)' }}>{stats.byStatus?.done || 0}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">High Priority</div>
            <div className="stat-value" style={{ color: 'var(--red)' }}>{stats.byPriority?.high || 0}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="filters">
        <input
          placeholder="Search tasks..."
          value={filters.search}
          onChange={(e) => handleFilterChange('search', e.target.value)}
          style={{ minWidth: 200 }}
        />
        <select value={filters.status} onChange={(e) => handleFilterChange('status', e.target.value)}>
          <option value="">All Statuses</option>
          <option value="todo">Todo</option>
          <option value="in-progress">In Progress</option>
          <option value="done">Done</option>
        </select>
        <select value={filters.priority} onChange={(e) => handleFilterChange('priority', e.target.value)}>
          <option value="">All Priorities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        {(filters.status || filters.priority || filters.search) && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setFilters({ status: '', priority: '', search: '' }); setPagination(p => ({ ...p, page: 1 })); }}>
            Clear
          </button>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Task List */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
        </div>
      ) : tasks.length === 0 ? (
        <div className="empty-state">
          <h3>No tasks found</h3>
          <p>Create your first task or adjust your filters.</p>
        </div>
      ) : (
        <div className="task-list">
          {tasks.map((task) => (
            <div key={task._id} className={`task-item ${task.status === 'done' ? 'done' : ''}`}>
              <div className="task-info">
                <div className="task-title">{task.title}</div>
                <div className="task-meta">
                  <Badge value={task.status} classMap={statusClass} />
                  <Badge value={task.priority} classMap={priorityClass} />
                  {task.dueDate && (
                    <span className="text-xs">
                      Due {new Date(task.dueDate).toLocaleDateString()}
                    </span>
                  )}
                  {task.tags?.map((tag) => (
                    <span key={tag} className="text-xs" style={{ color: 'var(--accent)', background: 'var(--accent-glow)', padding: '1px 6px', borderRadius: 4 }}>
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
              <div className="task-actions">
                <button className="btn btn-ghost btn-sm" onClick={() => openEdit(task)}>Edit</button>
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(task._id)}>Del</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 24, justifyContent: 'center' }}>
          <button
            className="btn btn-ghost btn-sm"
            disabled={pagination.page === 1}
            onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
          >
            ← Prev
          </button>
          <span className="text-muted">{pagination.page} / {pagination.totalPages}</span>
          <button
            className="btn btn-ghost btn-sm"
            disabled={pagination.page === pagination.totalPages}
            onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
          >
            Next →
          </button>
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <TaskModal
          task={editingTask}
          onClose={() => setModalOpen(false)}
          onSave={editingTask ? handleUpdate : handleCreate}
        />
      )}
    </div>
  );
}
