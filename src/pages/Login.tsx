import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User as UserIcon, AlertCircle, Sword, Sparkles } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { loginLocal, registerLocal } from '../store/userSlice';
import { AppDispatch } from '../store';
import { motion } from 'framer-motion';
import TermsModal from '../components/TermsModal';

const Login: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ email: '', password: '', username: '' });
  
  // New Consent States
  const [hasDataConsent, setHasDataConsent] = useState(false);
  const [hasParentalConsent, setHasParentalConsent] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!formData.email || !formData.password) {
      setError('Заполните поля, путник.');
      return;
    }

    // Email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
        setError('Неверный формат магической почты');
        return;
    }

    if (!isLogin) {
        if (!hasDataConsent) {
            setError('Необходимо принять Свиток Законов (Условия).');
            return;
        }
        // Parental consent is technically optional if user is > 14, but we don't ask age.
        // However, the checkbox says "(For Young Heroes < 14)".
        // If they don't check it, we assume they are > 14.
        // But let's just enforce it as a confirmation of "I am > 14 OR I have consent".
        // Actually, the prompt says "Separate two consents".
        // Let's make the second one optional but recommended, OR make it a combined confirmation logic?
        // Let's stick to the prompt: "Separate two consents".
        // I will require the first one. The second one is context-dependent.
        // If I don't require the second one, users might skip it.
        // Let's require the first one absolutely.
    }

    setLoading(true);
    try {
      if (isLogin) {
         await dispatch(loginLocal({ email: formData.email, password: formData.password })).unwrap();
      } else {
        if (!formData.username) throw new Error('Назови себя!');
        await dispatch(registerLocal({
          email: formData.email,
          password: formData.password,
          username: formData.username,
          hasConsent: hasParentalConsent // Pass this to backend/store if needed
        })).unwrap();
      }
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Ошибка в заклинании входа');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-slate-950">
         <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-purple-900/20 via-slate-950 to-slate-950"></div>
      </div>

      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full glass-panel p-8 rounded-3xl shadow-[0_0_50px_rgba(124,58,237,0.1)] relative z-10 border border-slate-700/50"
      >
        
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4 relative">
             <div className="absolute inset-0 bg-purple-500 blur-2xl opacity-20 rounded-full"></div>
             <div className="bg-gradient-to-br from-purple-600 to-indigo-700 p-4 rounded-2xl shadow-xl relative">
                <Sword className="w-10 h-10 text-white" />
             </div>
          </div>
          <h2 className="text-3xl font-black rpg-font text-white tracking-wider mb-2">
            {isLogin ? 'Врата Героев' : 'Новая Легенда'}
          </h2>
          <p className="text-slate-400 text-sm font-medium">
            "Только знания откроют путь к величию"
          </p>
        </div>

        {error && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-3 bg-red-900/30 border border-red-500/30 text-red-200 rounded-xl text-center text-sm flex items-center justify-center">
            <AlertCircle className="inline h-4 w-4 mr-2" />
            {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1 ml-1">Имя Героя</label>
                <div className="relative">
                  <UserIcon className="absolute top-3 left-3 h-5 w-5 text-slate-500" />
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    className="block w-full pl-10 pr-3 py-3 bg-slate-900/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-slate-600 transition-all outline-none"
                    placeholder="Артур"
                  />
                </div>
              </div>

              {/* Consent Checkboxes */}
              <div className="space-y-3 bg-slate-900/30 p-3 rounded-xl border border-slate-700/50">
                  {/* Data Consent */}
                  <div className="flex items-start">
                      <input
                        id="dataConsent"
                        type="checkbox"
                        checked={hasDataConsent}
                        onChange={(e) => setHasDataConsent(e.target.checked)}
                        className="mt-1 h-4 w-4 text-purple-600 bg-slate-800 border-slate-600 rounded focus:ring-purple-500 shrink-0"
                      />
                    <label htmlFor="dataConsent" className="ml-3 text-xs text-slate-400 leading-tight">
                      Принимаю <button type="button" onClick={() => setShowTermsModal(true)} className="text-amber-400 hover:underline font-bold">Свиток Законов</button> и даю согласие на обработку данных.
                    </label>
                  </div>

                  {/* Parental Consent */}
                  <div className="flex items-start">
                      <input
                        id="parentalConsent"
                        type="checkbox"
                        checked={hasParentalConsent}
                        onChange={(e) => setHasParentalConsent(e.target.checked)}
                        className="mt-1 h-4 w-4 text-purple-600 bg-slate-800 border-slate-600 rounded focus:ring-purple-500 shrink-0"
                      />
                    <label htmlFor="parentalConsent" className="ml-3 text-xs text-slate-400 leading-tight">
                      (Для героев до 14 лет) Мои родители знают о походе и дали согласие.
                    </label>
                  </div>
              </div>
            </motion.div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1 ml-1">Магическая Почта</label>
            <div className="relative">
              <Mail className="absolute top-3 left-3 h-5 w-5 text-slate-500" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="block w-full pl-10 pr-3 py-3 bg-slate-900/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-slate-600 transition-all outline-none"
                placeholder="hero@realm.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1 ml-1">Тайный Шифр</label>
            <div className="relative">
              <Lock className="absolute top-3 left-3 h-5 w-5 text-slate-500" />
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                autoComplete="current-password"
                className="block w-full pl-10 pr-3 py-3 bg-slate-900/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-slate-600 transition-all outline-none"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 border-t border-white/20 rounded-xl font-bold text-white shadow-[0_4px_20px_rgba(245,158,11,0.3)] transition-all transform hover:-translate-y-1"
          >
            {loading ? <Sparkles className="animate-spin h-5 w-5 mx-auto" /> : (isLogin ? 'Войти в мир' : 'Создать Легенду')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
              setFormData({ email: '', password: '', username: '' });
            }}
            className="text-sm font-bold text-purple-400 hover:text-purple-300 transition-colors"
          >
            {isLogin ? 'Нет свитка? Напиши новый' : 'Уже есть свиток? Открыть'}
          </button>
        </div>
      </motion.div>

      <TermsModal 
        isOpen={showTermsModal} 
        onClose={() => setShowTermsModal(false)} 
      />
    </div>
  );
};

export default Login;