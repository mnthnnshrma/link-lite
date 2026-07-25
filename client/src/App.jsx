import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import MyLinks from './pages/MyLinks';
import Stats from './pages/Stats';
import Redirect from './pages/Redirect';
import './App.css';

function AppContent() {
  const { loading } = useAuth();

  if (loading) {
    return <p className="loading-text">Loading…</p>;
  }

  return (
    <>
      <Toaster 
        position="bottom-right" 
        toastOptions={{
          style: {
            background: 'var(--surface)',
            color: 'var(--text-heading)',
            border: '1px solid var(--border)',
            fontFamily: 'var(--font)',
          },
        }}
      />
      <Navbar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/my-links" element={<MyLinks />} />
          <Route path="/stats/:shortCode" element={<Stats />} />
          <Route path="/:code" element={<Redirect />} />
        </Routes>
      </main>
    </>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
