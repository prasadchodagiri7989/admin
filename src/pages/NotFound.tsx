import { useNavigate } from 'react-router-dom';

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center space-y-3">
        <p className="text-5xl font-bold text-gray-200">404</p>
        <p className="text-gray-600 font-medium">Page not found</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="text-sm text-indigo-600 hover:text-indigo-800"
        >
          ← Back to Dashboard
        </button>
      </div>
    </div>
  );
}
