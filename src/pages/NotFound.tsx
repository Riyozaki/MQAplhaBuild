import React from 'react';
import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';

const NotFound: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <h1 className="text-9xl font-bold text-slate-800/50 mb-4">404</h1>
      <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 rpg-font">
        Страница не найдена
      </h2>
      <p className="text-slate-400 mb-8 max-w-md">
        Похоже, вы забрели в неизведанные земли. Здесь нет квестов, только пустота.
      </p>
      <Link 
        to="/" 
        className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold transition-colors shadow-lg shadow-purple-600/20"
      >
        <Home size={20} />
        Вернуться в лагерь
      </Link>
    </div>
  );
};

export default NotFound;
