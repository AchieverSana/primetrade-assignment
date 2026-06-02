import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Sidebar() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <h1>Prime<span>trade</span></h1>
        <p>Task Manager</p>
      </div>

      <nav className="sidebar-nav">
        <NavLink
          to="/dashboard"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <span className="icon">▣</span> Dashboard
        </NavLink>

        {isAdmin && (
          <NavLink
            to="/users"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <span className="icon">◎</span> Users
          </NavLink>
        )}

        <a
          href="http://localhost:5000/api/docs"
          target="_blank"
          rel="noopener noreferrer"
          className="nav-link"
        >
          <span className="icon">⊞</span> API Docs
        </a>
      </nav>

      <div className="sidebar-footer">
        <div className="user-chip">
          <div className="avatar">{user?.name?.charAt(0)?.toUpperCase()}</div>
          <div className="user-info">
            <strong>{user?.name}</strong>
            <span>{user?.role}</span>
          </div>
        </div>
        <button className="nav-link" onClick={handleLogout} style={{ color: 'var(--red)' }}>
          <span className="icon">↩</span> Log out
        </button>
      </div>
    </aside>
  );
}
