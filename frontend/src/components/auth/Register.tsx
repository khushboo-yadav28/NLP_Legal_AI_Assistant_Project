// src/components/auth/Register.tsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Scale, Mail, Lock, User } from 'lucide-react';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

    try {
      // 1. Send registration request to your FastAPI backend
      const response = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          password: password,
          full_name: name
        })
      });

      const data = await response.json();

      // 2. Handle errors if registration fails (e.g., email already exists)
      if (!response.ok) {
        throw new Error(data.detail || 'Registration failed.');
      }

      // 3. Automatically log the user in by saving session details after successful registration
      localStorage.setItem('legal_ai_user', JSON.stringify(data));
      localStorage.setItem('legal_ai_user_name', data.full_name || name);

      // 4. Navigate into the chat dashboard
      navigate('/chat', { replace: true });
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred during registration.');
    }
  };

  return (
    <div className="min-h-screen bg-brand-light flex flex-col justify-center items-center p-4 font-sans text-gray-800">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
        
        <div className="bg-brand-blue p-6 text-center">
          <div className="mx-auto bg-brand-blue border border-brand-gold text-brand-gold w-12 h-12 rounded-full flex items-center justify-center mb-2">
            <Scale size={24} />
          </div>
          <h1 className="text-xl font-serif font-bold text-white">Create Account</h1>
        </div>

        <div className="p-8">
          {errorMsg && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-xs font-medium mb-4 border border-red-100 text-center">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Full Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-gold transition bg-brand-light"
                  placeholder="John Doe"
                />
              </div>
            </div>

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
                  className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-gold transition bg-brand-light"
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
                  className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-gold transition bg-brand-light"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-brand-gold text-brand-blue font-bold py-3 px-4 rounded-lg hover:bg-opacity-90 transition shadow-md mt-6"
            >
              Register Securely
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-blue font-bold hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}