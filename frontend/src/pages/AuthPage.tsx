// src/components/pages/AuthPage.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    
    const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

    try {
      let response;
      
      if (isLogin) {
        // OAuth2PasswordRequestForm requires form-urlencoded format
        const formData = new URLSearchParams();
        formData.append('username', email);
        formData.append('password', password);

        response = await fetch(`${API_BASE}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: formData.toString()
        });
      } else {
        response = await fetch(`${API_BASE}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, full_name: fullName })
        });
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Authentication failed. Please check your credentials.');
      }

      if (isLogin) {
        // Save the token and user profile needed for authorized chat requests
        localStorage.setItem('legal_ai_token', data.access_token);
        localStorage.setItem('legal_ai_user', JSON.stringify(data.user));
        navigate('/chat');
      } else {
        setIsLogin(true);
        setErrorMsg('Registration successful! Please log in.');
      }
      
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred during authentication.');
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-md w-full max-w-md space-y-4 border border-gray-100">
        <h2 className="text-2xl font-bold text-center text-gray-800">
          {isLogin ? 'Welcome Back' : 'Create Account'}
        </h2>

        {errorMsg && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-xs font-medium border border-red-100">
            {errorMsg}
          </div>
        )}

        {!isLogin && (
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Full Name</label>
            <input 
              type="text" 
              value={fullName} 
              onChange={(e) => setFullName(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-600"
              required
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Email Address</label>
          <input 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-600"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Password</label>
          <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-600"
            required
          />
        </div>

        <button type="submit" className="w-full bg-blue-600 text-white p-3 rounded-xl font-semibold hover:bg-blue-700 transition">
          {isLogin ? 'Login' : 'Register'}
        </button>

        <p className="text-center text-xs text-gray-500 cursor-pointer pt-2" onClick={() => { setIsLogin(!isLogin); setErrorMsg(''); }}>
          {isLogin ? "Don't have an account? Sign up" : "Already have an account? Login"}
        </p>
      </form>
    </div>
  );
}