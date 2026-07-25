import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import './Redirect.css';

function Redirect() {
  const { code } = useParams();
  const [destination, setDestination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [countdown, setCountdown] = useState(4);

  useEffect(() => {
    const fetchDestination = async () => {
      try {
        const baseURL = import.meta.env.VITE_API_URL || '';
        const res = await axios.get(`${baseURL}/api/urls/resolve/${code}`, {
          params: { ref: document.referrer || '' },
        });
        setDestination(res.data.originalUrl);
      } catch (err) {
        if (err.response && err.response.status === 404) {
          setError('This short link does not exist or has expired.');
        } else {
          setError('Failed to resolve short link. Please try again later.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDestination();
  }, [code]);

  useEffect(() => {
    if (!destination || loading || error) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          window.location.href = destination;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [destination, loading, error]);

  const handleSkip = () => {
    if (destination) {
      window.location.href = destination;
    }
  };

  if (loading) {
    return (
      <div className="redirect-container">
        <div className="redirect-card glass-panel">
          <div className="spinner"></div>
          <h2 className="redirect-title">Resolving Link-Lite URL...</h2>
          <p className="redirect-subtitle">Please wait a moment</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="redirect-container">
        <div className="redirect-card glass-panel error-panel">
          <div className="error-icon">⚠️</div>
          <h2 className="redirect-title">Link Not Found</h2>
          <p className="redirect-error-msg">{error}</p>
          <Link to="/" className="redirect-btn secondary-btn">
            Return to Link-Lite Home
          </Link>
          <div className="redirect-footer">⚡ Powered by SharmaG</div>
        </div>
      </div>
    );
  }

  // Calculate progress bar percentage (4s total)
  const progressPercent = ((4 - countdown) / 4) * 100;

  return (
    <div className="redirect-container">
      <div className="redirect-card glass-panel">
        <div className="redirect-header">
          <Link to="/" className="redirect-logo">
            Link<span className="logo-accent">-Lite</span>
          </Link>
          <span className="security-badge">🔒 Safe Redirect in Progress</span>
        </div>

        <h1 className="countdown-title">
          Redirecting in <span className="countdown-number">{countdown}</span>...
        </h1>

        <div className="progress-bar-container">
          <div
            className="progress-bar-fill"
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>

        <div className="destination-box">
          <span className="destination-label">Destination URL:</span>
          <div className="destination-url" title={destination}>
            {destination}
          </div>
        </div>

        <button onClick={handleSkip} className="redirect-btn primary-btn">
          Skip / Continue Now ➔
        </button>

        <div className="redirect-footer">
          ⚡ Powered by <span className="brand-highlight">SharmaG</span>
        </div>
      </div>
    </div>
  );
}

export default Redirect;
