import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { LogIn, Mail, Lock, AlertCircle, Info } from 'lucide-react';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const { error } = isSignUp 
        ? await signUp(email, password)
        : await signIn(email, password);

      if (error) {
        // Handle specific error cases
        if (error.message.includes('email_not_confirmed')) {
          setError('E-postadressen är inte bekräftad. Kontrollera din inkorg eller kontakta support.');
        } else if (error.message.includes('over_email_send_rate_limit')) {
          setError('För många försök. Vänta en minut innan du försöker igen.');
        } else if (error.message.includes('Invalid login credentials')) {
          setError('Felaktiga inloggningsuppgifter. Kontrollera e-post och lösenord.');
        } else if (error.message.includes('User already registered')) {
          setError('En användare med denna e-postadress finns redan. Försök logga in istället.');
        } else {
          setError(error.message);
        }
      } else if (isSignUp) {
        setSuccess('Konto skapat! Du kan nu logga in.');
        setIsSignUp(false);
      }
    } catch (err) {
      setError('Ett oväntat fel inträffade');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="bg-blue-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <LogIn className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {isSignUp ? 'Skapa konto' : 'Logga in'}
          </h1>
          <p className="text-gray-600">
            {isSignUp 
              ? 'Kom igång med din chatbot-plattform' 
              : 'Välkommen tillbaka till din chatbot-plattform'
            }
          </p>
        </div>

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-center">
            <Info className="w-5 h-5 text-green-500 mr-3" />
            <span className="text-green-700 text-sm">{success}</span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-3" />
            <span className="text-red-700 text-sm">{error}</span>
          </div>
        )}

        {/* Development Notice */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <Info className="w-5 h-5 text-yellow-500 mr-3 mt-0.5" />
            <div className="text-yellow-800 text-sm">
              <p className="font-medium mb-1">Utvecklingsläge</p>
              <p>E-postbekräftelse är inaktiverad. Du kan logga in direkt efter registrering.</p>
            </div>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              E-postadress
            </label>
            <div className="relative">
              <Mail className="w-5 h-5 text-gray-400 absolute left-3 top-3" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                placeholder="din@email.se"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Lösenord
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 text-gray-400 absolute left-3 top-3" />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
            {isSignUp && (
              <p className="text-xs text-gray-500 mt-1">
                Minst 6 tecken
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Laddar...' : (isSignUp ? 'Skapa konto' : 'Logga in')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
          >
            {isSignUp 
              ? 'Har du redan ett konto? Logga in' 
              : 'Behöver du ett konto? Registrera dig'
            }
          </button>
        </div>
      </div>
    </div>
  );
}