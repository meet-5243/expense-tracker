import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Wallet, Mail, Lock, User, AlertCircle } from 'lucide-react';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const { login, signup, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Validation/Error states
  const [error, setError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const validateEmail = (email) => {
    return /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Client-side validations
    if (!email || !password) {
      setError('Please fill in all required fields.');
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (!isLogin) {
      if (!name) {
        setError('Please enter your name.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    }

    setFormLoading(true);

    try {
      if (isLogin) {
        const result = await login(email, password);
        if (result.success) {
          navigate('/');
        } else {
          setError(result.message);
        }
      } else {
        const result = await signup(name, email, password);
        if (result.success) {
          navigate('/');
        } else {
          setError(result.message);
        }
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setFormLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setName('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-bg px-4 py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-accent-teal/10 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-25%] right-[-10%] w-[500px] h-[500px] rounded-full bg-accent-violet/10 blur-[120px] pointer-events-none"></div>

      <div className="max-w-md w-full space-y-8 bg-dark-card border border-dark-border/60 p-8 rounded-3xl shadow-2xl relative z-10 transition-all duration-300">
        
        {/* Brand Header */}
        <div className="text-center">
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-2xl bg-gradient-to-tr from-accent-teal to-accent-violet shadow-lg shadow-accent-teal/10">
            <Wallet className="h-6 w-6 text-dark-bg" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-white tracking-tight font-sans">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="mt-2 text-sm text-dark-muted">
            {isLogin ? 'Manage your expenses in Indian Rupees (₹) effortlessly.' : 'Start tracking and optimizing your budget today.'}
          </p>
        </div>

        {/* Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="flex items-center space-x-2 p-4 bg-accent-rose/10 border border-accent-rose/25 text-accent-rose rounded-2xl text-sm animate-shake">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-4">
            {/* Name field for Signup */}
            {!isLogin && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-dark-muted mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-dark-muted" />
                  </div>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="block w-full pl-10 pr-4 py-3 bg-dark-input border border-dark-border/70 rounded-2xl text-dark-text placeholder-dark-muted focus:outline-none focus:ring-2 focus:ring-accent-teal/40 focus:border-accent-teal transition-all duration-200"
                    placeholder="Enter your name"
                  />
                </div>
              </div>
            )}

            {/* Email field */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-dark-muted mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-dark-muted" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-4 py-3 bg-dark-input border border-dark-border/70 rounded-2xl text-dark-text placeholder-dark-muted focus:outline-none focus:ring-2 focus:ring-accent-teal/40 focus:border-accent-teal transition-all duration-200"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            {/* Password field */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-dark-muted mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-dark-muted" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-4 py-3 bg-dark-input border border-dark-border/70 rounded-2xl text-dark-text placeholder-dark-muted focus:outline-none focus:ring-2 focus:ring-accent-teal/40 focus:border-accent-teal transition-all duration-200"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Confirm Password field for Signup */}
            {!isLogin && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-dark-muted mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-dark-muted" />
                  </div>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full pl-10 pr-4 py-3 bg-dark-input border border-dark-border/70 rounded-2xl text-dark-text placeholder-dark-muted focus:outline-none focus:ring-2 focus:ring-accent-teal/40 focus:border-accent-teal transition-all duration-200"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              disabled={formLoading}
              className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-2xl shadow-lg text-sm font-semibold text-dark-bg bg-accent-teal hover:bg-accent-tealHover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-teal transition-all duration-250 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.99]"
            >
              {formLoading ? (
                <div className="h-5 w-5 border-2 border-dark-bg border-t-transparent rounded-full animate-spin"></div>
              ) : isLogin ? (
                'Sign In'
              ) : (
                'Create Account'
              )}
            </button>
          </div>
        </form>

        {/* Toggle Mode */}
        <div className="text-center mt-6">
          <button
            onClick={toggleMode}
            className="text-sm font-medium text-accent-teal hover:text-accent-tealHover transition-colors duration-200"
          >
            {isLogin ? "Don't have an account? Sign Up" : 'Already have an account? Sign In'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
