import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface RPGLoaderProps {
    message?: string;
}

const RPGLoader: React.FC<RPGLoaderProps> = ({ message = "Загрузка..." }) => {
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowFallback(true), 15000);
    return () => clearTimeout(timer);
  }, []);

  return (
  <div className="flex flex-col items-center justify-center py-12 min-h-[50vh]">
    <motion.div 
      className="relative w-20 h-20"
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
    >
      {/* Внешнее кольцо */}
      <div className="absolute inset-0 border-4 border-purple-500/20 rounded-full" />
      <div className="absolute inset-0 border-4 border-transparent border-t-amber-400 rounded-full" />
      
      {/* Внутренняя иконка */}
      <motion.div
        className="absolute inset-3 flex items-center justify-center"
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ repeat: Infinity, duration: 1 }}
      >
        <span className="text-2xl">⚔️</span>
      </motion.div>
    </motion.div>
    
    {/* Мерцающий текст */}
    <motion.p
      className="mt-4 text-slate-400 text-sm font-bold rpg-font"
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={{ repeat: Infinity, duration: 1.5 }}
    >
      {message}
    </motion.p>
    
    {/* Прогресс-бар с рандомными "хитами" */}
    <div className="w-48 h-1.5 bg-slate-800 rounded-full mt-3 overflow-hidden relative">
      <motion.div
        className="h-full bg-gradient-to-r from-purple-500 to-amber-500 absolute left-0 top-0"
        animate={{ width: ['0%', '30%', '50%', '70%', '90%', '100%'] }}
        transition={{ repeat: Infinity, duration: 3, times: [0, 0.2, 0.4, 0.6, 0.8, 1] }}
      />
    </div>

    {showFallback && (
        <div className="mt-6 text-center animate-fade-in">
            <p className="text-amber-500/80 text-xs mb-2">Что-то долго...</p>
            <button 
                onClick={() => window.location.reload()}
                className="text-xs text-slate-400 hover:text-white underline"
            >
                Перезагрузить страницу
            </button>
        </div>
    )}
  </div>
  );
};

export default RPGLoader;
