import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

function MyLinks() {
  const { api } = useAuth();
  const navigate = useNavigate();
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Edit state
  const [editingId, setEditingId] = useState(null);
  const [editOriginalUrl, setEditOriginalUrl] = useState('');
  const [editAlias, setEditAlias] = useState('');

  // Menu state
  const [openMenuId, setOpenMenuId] = useState(null);

  useEffect(() => {
    const closeMenu = () => setOpenMenuId(null);
    document.addEventListener('click', closeMenu);
    return () => document.removeEventListener('click', closeMenu);
  }, []);

  useEffect(() => {
    const fetchLinks = async () => {
      try {
        const res = await api.get('/api/urls/mine');
        setLinks(res.data);
      } catch {
        setError('Failed to load your links.');
      } finally {
        setLoading(false);
      }
    };

    fetchLinks();
  }, [api]);

  const handleCopy = async (id, text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard!');
    } catch {
      toast.error('Failed to copy to clipboard.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this link?")) return;
    try {
      await api.delete(`/api/urls/${id}`);
      setLinks(links.filter((link) => link._id !== id));
      toast.success('Link deleted successfully.');
    } catch {
      toast.error("Failed to delete link.");
    }
  };

  const handleEditStart = (link) => {
    setEditingId(link._id);
    setEditOriginalUrl(link.originalUrl);
    setEditAlias(link.shortCode);
  };

  const handleEditSave = async (id) => {
    try {
      const res = await api.put(`/api/urls/${id}`, {
        originalUrl: editOriginalUrl,
        customAlias: editAlias,
      });
      setLinks(links.map((link) => (link._id === id ? res.data : link)));
      setEditingId(null);
      toast.success('Link updated successfully.');
    } catch (err) {
      if (err.response && err.response.data && err.response.data.error) {
        toast.error(err.response.data.error);
      } else {
        toast.error("Failed to update link.");
      }
    }
  };

  const handleEditCancel = () => {
    setEditingId(null);
  };

  if (loading) {
    return <p className="loading-text">Loading your links…</p>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="my-links-page">
      <h1>My Links</h1>

      {links.length === 0 ? (
        <p className="empty-state">You haven&apos;t shortened any links yet.</p>
      ) : (
        <ul className="my-links-list">
          {links.map((link) => (
            <li className="my-links-item" key={link._id}>
              {editingId === link._id ? (
                <div className="edit-link-form">
                  <input
                    type="text"
                    value={editOriginalUrl}
                    onChange={(e) => setEditOriginalUrl(e.target.value)}
                    placeholder="Original URL"
                    className="edit-input"
                  />
                  <input
                    type="text"
                    value={editAlias}
                    onChange={(e) => setEditAlias(e.target.value)}
                    placeholder="Custom Alias"
                    className="edit-input"
                  />
                  <div className="edit-link-actions">
                    <button
                      className="btn-primary"
                      onClick={() => handleEditSave(link._id)}
                    >
                      Save
                    </button>
                    <button className="navbar-btn" onClick={handleEditCancel}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="my-links-item-urls">
                    <a
                      className="my-links-item-short"
                      href={link.shortUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {link.shortUrl}
                    </a>
                    <span className="my-links-item-original" title={link.originalUrl}>
                      {link.originalUrl}
                    </span>
                  </div>
                  <div className="my-links-item-meta">
                    <span className="my-links-item-clicks">
                      {link.humanClicks || 0} click{(link.humanClicks || 0) === 1 ? '' : 's'}
                    </span>
                    <span className="my-links-item-date">
                      {new Date(link.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    <button
                      className="copy-icon-btn"
                      onClick={() => handleCopy(link._id, `${window.location.origin}/${link.shortCode}`)}
                      title="Copy Link"
                    >
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                      </svg>
                    </button>
                    <div className="menu-container" onClick={(e) => e.stopPropagation()}>
                      <button 
                        className="icon-btn" 
                        onClick={() => setOpenMenuId(openMenuId === link._id ? null : link._id)}
                      >
                        ⋮
                      </button>
                      {openMenuId === link._id && (
                        <div className="menu-dropdown">
                          <button onClick={() => { navigate(`/stats/${link.shortCode}`); setOpenMenuId(null); }}>Stats</button>
                          <button onClick={() => { handleEditStart(link); setOpenMenuId(null); }}>Edit</button>
                          <button className="text-danger" onClick={() => { handleDelete(link._id); setOpenMenuId(null); }}>Delete</button>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default MyLinks;
