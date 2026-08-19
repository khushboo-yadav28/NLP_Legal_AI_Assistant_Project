// src/components/auth/Login.tsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Scale, Mail, Lock } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

    try {
      // Call your backend's partner-built authentication endpoint
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      // If backend rejects credentials (e.g. 401 Unauthorized), throw error
      if (!response.ok) {
        throw new Error(data.detail || 'Invalid email or password.');
      }

      // Save user details securely from backend response
      localStorage.setItem('legal_ai_user', JSON.stringify(data));
      localStorage.setItem('legal_ai_user_name', data.full_name || email.split('@')[0]);
      
      // Redirect to chat on success
      navigate('/chat', { replace: true });
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed. Please check your credentials.');
    }
  };

  return (
    <div className="min-h-screen bg-brand-light flex flex-col justify-center items-center p-4 font-sans text-gray-800">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
        
        {/* Header Section */}
        <div className="bg-brand-blue p-8 text-center">
          <div className="mx-auto bg-brand-blue border border-brand-gold text-brand-gold w-16 h-16 rounded-full flex items-center justify-center mb-4">
            <Scale size={32} />
          </div>
          <h1 className="text-2xl font-serif font-bold text-white mb-2">Legal AI Assistant</h1>
          <p className="text-brand-gold text-sm font-medium">Professional Legal Knowledge</p>
        </div>

        {/* Login Form */}
        <div className="p-8">
          <h2 className="text-xl font-bold text-brand-blue mb-6 text-center">Account Login</h2>
          
          {errorMsg && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-xs font-medium mb-4 border border-red-100 text-center">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-brand-gold transition bg-brand-light"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-brand-gold transition bg-brand-light"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-brand-blue text-white font-bold py-3 px-4 rounded-lg hover:bg-opacity-90 transition shadow-md mt-4"
            >
              Sign In
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-brand-gold font-bold hover:underline">
              Register here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}