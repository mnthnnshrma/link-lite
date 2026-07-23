import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

function Home() {
  const { user, api } = useAuth();
  const [url, setUrl] = useState('');
  const [alias, setAlias] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const location = useLocation();
  const navigate = useNavigate();
  const toastShown = useRef(false);

  useEffect(() => {
    const query = new URLSearchParams(location.search);
    if (query.get('login') === 'success' && !toastShown.current) {
      toastShown.current = true;
      toast.success('Welcome back!');
      navigate('/', { replace: true });
    }
  }, [location.search, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setResult(null);

    if (!url.trim()) {
      toast.error('Please enter a URL.');
      return;
    }

    setLoading(true);

    try {
      const payload = { originalUrl: url.trim() };
      if (alias.trim()) {
        payload.customAlias = alias.trim();
      }

      const res = await api.post('/api/shorten', payload);
      const data = res.data;
      setResult(data);
      setHistory((prev) => [data, ...prev]);
      setUrl('');
      setAlias('');
      toast.success('URL successfully shortened!');
    } catch (err) {
      if (err.response && err.response.data && err.response.data.error) {
        toast.error(err.response.data.error);
      } else {
        toast.error('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard!');
    } catch {
      toast.error('Failed to copy to clipboard.');
    }
  };

  return (
    <>
      <div className="card">
        <header className="app-header">
          <h1>Shorten a URL</h1>
          <p>
            Paste a long URL and get a short, shareable link.
            {!user && ' Sign up for custom aliases and more.'}
          </p>
        </header>

        <form className="shorten-form" id="shorten-form" onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="url-input" className="input-label">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
              Long URL <span className="text-danger">*</span>
            </label>
            <input
              id="url-input"
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste long URL here"
              autoFocus
            />
          </div>

          {user && (
            <div className="input-group">
              <label htmlFor="alias-input" className="input-label">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                  <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                </svg>
                Alias (optional)
              </label>
              <input
                id="alias-input"
                type="text"
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
                placeholder="Add alias here"
                className="alias-input"
              />
              <small className="helper-text" >Must be at least 3 characters</small>
            </div>
          )}

          <button id="shorten-btn" type="submit" disabled={loading}>
            {loading ? 'Shortening…' : 'Shorten'}
          </button>
        </form>

        {result && (
          <div className="result-card" id="result-card">
            <p>Your shortened URL:</p>
            <div className="result-url-row">
              <a
                href={result.shortUrl}
                target="_blank"
                rel="noopener noreferrer"
                id="short-url-link"
              >
                {result.shortUrl}
              </a>
              <button
                className="copy-btn"
                id="copy-btn"
                onClick={() => handleCopy(result.shortUrl)}
              >
                Copy
              </button>
            </div>
          </div>
        )}
      </div>

      {history.length > 0 && (
        <section className="history-section" id="history-section">
          <h2>Session History</h2>
          <ul className="history-list">
            {history.map((item, index) => (
              <li className="history-item" key={`${item.shortCode}-${index}`}>
                <div className="history-item-urls">
                  <a
                    className="history-item-short"
                    href={item.shortUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {item.shortUrl}
                  </a>
                  <span className="history-item-original" title={item.originalUrl}>
                    {item.originalUrl}
                  </span>
                </div>
                <button
                  className="copy-btn"
                  onClick={() => handleCopy(item.shortUrl)}
                >
                  Copy
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

export default Home;
