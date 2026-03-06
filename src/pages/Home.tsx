import React, { useEffect, useState, Suspense } from 'react';
import { useAuth } from '../context/AuthContext';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { advanceCampaignDay } from '../store/userSlice';
import { fetchQuests } from '../store/questsSlice';
import { CAMPAIGN_DATA } from '../data/campaignData';
import QuestModal from '../components/QuestModal';
import BossBattleModal from '../components/BossBattleModal';
import { Quest } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { Home as HomeIcon, Map as MapIcon, Shield, Loader2 } from 'lucide-react';
import LandingPage from '../components/LandingPage';
import DashboardView from '../components/dashboard/DashboardView';
import CampaignView from '../components/dashboard/CampaignView';
import { useLocation } from 'react-router-dom';

import ErrorBoundary from '../components/ErrorBoundary';

const HomeSkeleton = () => (
    <div className="animate-pulse space-y-8 max-w-7xl mx-auto w-full">
        {/* Hero */}
        <div className="h-64 bg-slate-800/40 rounded-3xl w-full border border-slate-700/30 relative overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]"></div>
        </div>
        
        {/* Mood */}
        <div className="h-32 bg-slate-800/40 rounded-3xl w-full border border-slate-700/30"></div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
                <div key={i} className="h-96 bg-slate-800/40 rounded-2xl border border-slate-700/30 p-6 space-y-4">
                    <div className="h-6 w-1/3 bg-slate-700/50 rounded"></div>
                    <div className="h-4 w-2/3 bg-slate-700/40 rounded"></div>
                    <div className="space-y-3 mt-6">
                        {[1, 2, 3].map(j => (
                             <div key={j} className="h-20 bg-slate-700/20 rounded-xl"></div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    </div>
);

const StoryDashboard: React.FC = () => {
  const { user } = useAuth();
  const dispatch = useDispatch<AppDispatch>();
  const { list: quests, status } = useSelector((state: RootState) => state.quests);
  const shopItems = useSelector((state: RootState) => state.rewards.shopItems);
  
  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);
  const [questMultiplier, setQuestMultiplier] = useState(1);
  const [isBossModalOpen, setIsBossModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'dashboard' | 'campaign'>('dashboard');
  const location = useLocation();

  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchQuests());
    }
  }, [status, dispatch]);

  useEffect(() => {
      setSelectedQuest(null);
      setIsBossModalOpen(false);
  }, [location.pathname]);

  if (status === 'loading') {
      return (
        <div className="relative pb-20">
             <div className="flex justify-center mb-8">
                  <div className="bg-slate-900/80 backdrop-blur rounded-2xl p-1 flex gap-1 border border-slate-700/50 shadow-xl opacity-80 pointer-events-none">
                      <div className="px-6 py-2 rounded-xl bg-slate-800 text-slate-500 flex items-center gap-2"><HomeIcon size={16} /></div>
                      <div className="px-6 py-2 rounded-xl text-slate-600 flex items-center gap-2"><MapIcon size={16} /></div>
                  </div>
              </div>
            <HomeSkeleton />
        </div>
      );
  }

  if (!user) return null;

  const currentDayNum = user.campaign?.currentDay || 1;
  const rawStory = CAMPAIGN_DATA.find(d => d.day === currentDayNum) || CAMPAIGN_DATA[0];
  
  // 1. Resolve Quest IDs based on Grade
  const gradeGroup = user.gradeGroup || 'grade5';
  const rawQuestIds = Array.isArray(rawStory.questIds) 
      ? rawStory.questIds 
      : (rawStory.questIds[gradeGroup as keyof typeof rawStory.questIds] || rawStory.questIds['grade5']);
  
  const storyQuestIds = rawQuestIds.map(String);
  
  // 2. Resolve Dialogue based on performance (Streak as proxy)
  let dialogueLevel: 'high' | 'medium' | 'low' = 'medium';
  if (user.streakDays >= 3) dialogueLevel = 'high';
  else if (user.streakDays === 0) dialogueLevel = 'low';
  
  const resolvedDialogue = typeof rawStory.dialogue === 'string'
      ? rawStory.dialogue
      : rawStory.dialogue[dialogueLevel];

  // Create a resolved story object for the view
  const currentStory = {
      ...rawStory,
      questIds: rawQuestIds,
      dialogue: resolvedDialogue
  };

  const storyQuests = quests.filter(q => storyQuestIds.includes(String(q.id)));
  const hasCampaignQuests = storyQuests.length > 0;
  const completedCount = storyQuests.filter(q => q.completed).length;
  const totalCount = storyQuests.length;

  const handleQuestOpen = (quest: Quest, isBoosted = false) => {
      setQuestMultiplier(isBoosted ? 1.5 : 1);
      setSelectedQuest(quest);
  };

  return (
    <div className="relative pb-20">
      
      {/* Top Navigation Tabs */}
      <div className="flex justify-center mb-8">
          <div className="bg-slate-900/80 backdrop-blur rounded-2xl p-1 flex gap-1 border border-slate-700/50 shadow-xl">
              <button 
                onClick={() => setViewMode('dashboard')}
                className={`px-6 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${viewMode === 'dashboard' ? 'bg-primary-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
              >
                  <HomeIcon size={16} /> Штаб
              </button>
              <button 
                onClick={() => setViewMode('campaign')}
                className={`px-6 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${viewMode === 'campaign' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
              >
                  <MapIcon size={16} /> Кампания
              </button>
          </div>
      </div>

      <AnimatePresence mode="wait">
          {viewMode === 'dashboard' && (
              <motion.div key="dashboard" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.3 }}>
                  <DashboardView 
                    user={user} 
                    quests={quests} 
                    shopItems={shopItems} 
                    onQuestSelect={handleQuestOpen}
                  />
              </motion.div>
          )}
          
          {viewMode === 'campaign' && (
              <motion.div key="campaign" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
                  {hasCampaignQuests ? (
                      <CampaignView 
                        currentDayNum={currentDayNum}
                        currentStory={currentStory}
                        storyQuests={storyQuests}
                        completedCount={completedCount}
                        totalCount={totalCount}
                        onQuestSelect={(q) => handleQuestOpen(q)}
                        onBossOpen={() => setIsBossModalOpen(true)}
                        onAdvanceDay={() => dispatch(advanceCampaignDay())}
                        isDayComplete={user.campaign?.isDayComplete}
                        user={user}
                      />
                  ) : (
                      <div className="text-center py-16 bg-slate-900/50 rounded-3xl border border-slate-700/50">
                          <p className="text-slate-400 text-lg mb-4">
                              Кампания пока не адаптирована для твоего класса
                          </p>
                          <button 
                              onClick={() => setViewMode('dashboard')}
                              className="px-6 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-500 transition-colors"
                          >
                              Перейти в Штаб
                          </button>
                      </div>
                  )}
              </motion.div>
          )}
      </AnimatePresence>

      {/* Modals */}
      <ErrorBoundary>
        <QuestModal 
            quest={selectedQuest} 
            isOpen={!!selectedQuest} 
            onClose={() => setSelectedQuest(null)} 
            multiplier={questMultiplier}
            locationId={currentStory.locationId}
        />
      </ErrorBoundary>
      <ErrorBoundary>
        <BossBattleModal 
            isOpen={isBossModalOpen} 
            onClose={() => setIsBossModalOpen(false)} 
            allies={user.campaign.unlockedAllies || []} 
            gradeGroup={user.gradeGroup}
        />
      </ErrorBoundary>
    </div>
  );
};

const Home: React.FC = () => {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) return <StoryDashboard />;
  
  return (
      <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-primary-500" size={48} /></div>}>
          <LandingPage />
      </Suspense>
  );
};

export default Home;