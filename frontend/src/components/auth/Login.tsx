// src/components/auth/Login.tsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Scale, Mail, Lock } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
      
      // OAuth2PasswordRequestForm expects form-urlencoded data with 'username' and 'password'
      const formData = new URLSearchParams();
      formData.append('username', email); // backend maps username to email
      formData.append('password', password);

      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Login failed');
      }

      const data = await response.json();
      
      // Save user info & token to local storage as expected by your App.tsx
      localStorage.setItem('legal_ai_user', JSON.stringify(data.user));
      localStorage.setItem('legal_ai_token', data.access_token);
      
      window.dispatchEvent(new Event('legal_ai_auth_change'));

      navigate('/chat', { replace: true });
    } catch (err: any) {
      setError(err.message || 'An error occurred during login');
    }
  };

  return (
    <div className="min-h-screen bg-brand-light flex flex-col justify-center items-center p-4 font-sans text-gray-800">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
        
        {/* Header Section */}
        <Link to="/" className="block bg-brand-blue p-8 text-center hover:opacity-95 transition" title="Return to Home">
          <div className="mx-auto bg-brand-blue border border-brand-gold text-brand-gold w-16 h-16 rounded-full flex items-center justify-center mb-4">
            <Scale size={32} />
          </div>
          <h1 className="text-2xl font-serif font-bold text-white mb-2">Legal AI Assistant</h1>
          <p className="text-brand-gold text-sm font-medium">Professional Legal Knowledge</p>
        </Link>

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
              className="w-full bg-brand-blue text-white font-bold py-3 px-4 rounded-lg hover:bg-opacity-90 transition shadow-md mt-4 cursor-pointer"
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

          <div className="mt-4 text-center">
            <Link to="/" className="text-xs text-gray-400 hover:text-brand-blue transition">
              ← Return to Home Overview
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
