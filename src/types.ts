
export type TaskType = 
  | 'yes_no'           
  | 'quiz'             
  | 'text_input'       
  | 'number_input'     
  | 'timer_challenge'  
  | 'checklist'        
  | 'ordering'         
  | 'matching'
  | 'drag_to_image'
  | 'fill_blanks';

export interface Task {
  id: number | string;
  type: TaskType;
  question: string;
  
  // Quiz
  options?: string[];
  correctIndex?: number;
  
  // Input
  correctAnswer?: string;
  acceptableAnswers?: string[];
  caseSensitive?: boolean;
  
  // Timer
  timerSeconds?: number;
  
  // Checklist
  checklistItems?: { id: string; label: string }[];
  
  // Ordering
  correctOrder?: string[];
  shuffledItems?: string[]; // For initial display
  
  // Matching
  pairs?: { left: string; right: string }[];

  // Drag to Image
  imageUrl?: string;
  dropZones?: { id: string; x: number; y: number; width?: number; height?: number; label?: string }[];
  dragItems?: { id: string; label: string; correctZoneId: string }[];

  // Fill Blanks
  textWithBlanks?: string; // "The capital of France is ___"
  blankAnswers?: string[]; // ["Paris"]
  
  // General
  hint?: string;
  explanation?: string;
  xpBonus?: number;
  
  // State for user answers (optional, usually handled in component state)
  userAnswer?: any; 
}

export type QuestRarity = 'Common' | 'Rare' | 'Epic' | 'Legendary';

export type ThemeColor = 'purple' | 'blue' | 'green' | 'crimson' | 'amber';

export type QuestCategory = 
  | 'Math' | 'Russian' | 'Literature' | 'Lang' | 'Science' 
  | 'History' | 'Sport' | 'Social' | 'Ecology' | 'Self' 
  | 'Finance' | 'IT' | 'Art';

export type HeroClass = 'warrior' | 'mage' | 'ranger' | 'healer';

export type GradeGroup = 'grade5' | 'grade67' | 'grade89' | 'grade1011';

export interface Quest {
  id: number | string;
  title: string;
  description: string;
  category: QuestCategory | string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  rarity: QuestRarity | string;
  xp: number;
  coins: number;
  completed: boolean;
  tasks: Task[];
  type: 'daily' | 'story' | 'quest'; 
  isHabit?: boolean; // New: Distinguishes routine tasks from random challenges
  gradeRange?: [number, number]; 
  gradeGroup?: GradeGroup;
  minMinutes: number; 
  prerequisiteId?: number | string; // Quest ID that must be completed first
}

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  cost: number;
  type: 'skin' | 'consumable';
  value: string;
  icon: string;
  category?: 'skin' | 'real' | 'boost';
  rarity?: 'Common' | 'Rare' | 'Epic' | 'Legendary';
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  conditionType: 'quests' | 'xp' | 'coins' | 'items' | 'streak';
  threshold: number;
  rewardXp: number;
  rewardCoins: number;
}

export interface QuestHistoryItem {
  questId: number | string;
  questTitle: string; 
  xpEarned: number;
  coinsEarned?: number;
  date: string; 
  score?: number;
  category?: string;
}

export interface SurveySubmission {
  id: string;
  date: string;
  motivationScore: number;
  stressScore: number;
  enjoymentScore: number;
}

export interface StoryDay {
  day: number;
  title: string;
  locationId: 'village' | 'forest' | 'mountains' | 'castle' | 'desert' | 'throne';
  locationName: string;
  description: string;
  character: 'wizard' | 'fairy' | 'warrior' | 'king';
  dialogue: string | { high: string; medium: string; low: string };
  questIds: (number | string)[] | {
    grade5: (number | string)[];
    grade67: (number | string)[];
    grade89: (number | string)[];
    grade1011: (number | string)[];
  };
  rewardText: string;
}

export interface UserProfile {
  uid?: string;
  username: string;
  email: string;
  role: 'student' | 'admin';
  avatar: string; 
  visitorAvatar?: string;
  level: number;
  grade?: number; 
  gradeGroup?: GradeGroup;
  currentXp: number;
  nextLevelXp: number;
  coins: number;
  currentHp: number; 
  completedQuests: number;
  inventory: string[]; 
  achievements: string[]; 
  questHistory: QuestHistoryItem[];
  surveyHistory: SurveySubmission[];
  hasParentalConsent: boolean;
  lastDailyMood?: string; 
  themeColor?: ThemeColor;
  
  heroClass?: HeroClass; 
  className?: string; // v2.0
  classEmoji?: string; // v2.0
  currentLocation?: string; // v2.0

  // Mechanics
  activeQuestTimers: Record<string, number>;
  habitStreaks?: Record<string, number>; 
  dailyCompletionsCount: number;
  lastCompletionTime?: number;
  suspiciousFlags: number;
  penaltyUntil?: number;
  streakDays: number;
  lastLoginDate?: string;
  streakTakenToday: boolean;
  
  // v2.0 Stats
  totalQuestsCompleted?: number;
  totalXpEarned?: number;
  totalCoinsEarned?: number;
  weeklyXp?: number;
  weeklyXpResetDate?: string;
  tutorialCompleted?: boolean;

  // Guilds
  guildId?: string;
  guildName?: string;
  guildRole?: GuildRole;
  guildXPContributed?: number;

  // Story Mode
  lastCampaignAdvanceDate?: string; // ISO Date string of last advancement
  campaign: {
    currentDay: number;
    isDayComplete: boolean;
    unlockedAllies: string[];
  };
}

export interface LeaderboardUser {
  username: string; 
  className: string;
  classEmoji: string;
  level: number;
  xp: number;
  weeklyXp?: number;
  totalQuestsCompleted?: number;
  streakDays?: number;
  isCurrentUser?: boolean;
  id?: number; // legacy support
  avatar?: string; // legacy support
}

export interface AdminAnalyticsData {
  studentId: number;
  studentName: string;
  grade: number;
  appTimeMinutes: number;
  completedQuests: number;
  avgMotivation: number;
}

// --- Guilds ---

export type GuildRole = 'leader' | 'officer' | 'member';

export interface GuildMember {
  email: string;
  username: string;
  role: GuildRole;
  level: number;
  className: string;
  xpContributed: number;
  joinedAt: string;
}

export interface GuildQuest {
  questId: string;
  guildId: string;
  questName: string;
  questType: 'collective' | 'competitive';
  category: string;
  targetValue: number;
  currentValue: number;
  status: 'active' | 'completed' | 'expired';
  createdBy: string;
  createdAt: string;
  expiresAt: string;
  contributors: { email: string; amount: number }[];
  rewards: {
    xp: number;
    coins: number;
    reputation: number;
  };
}

export interface GuildLevelInfo {
  level: number;
  name: string;
  bonusSlots: number;
  currentXp: number;
  nextLevelXp: number | null;
}

export interface GuildData {
  guildId: string;
  name: string;
  description: string;
  emblem: string;
  leaderEmail: string;
  totalXp: number;
  treasury: number;
  reputation: number;
  createdAt: string;
  guildLevel: GuildLevelInfo;
  members: GuildMember[];
  quests: GuildQuest[];
  memberCount: number;
  maxMembers: number;
  myRole: GuildRole | null;
  settings: {
    isOpen: boolean;
    [key: string]: any;
  };
}

export interface GuildSummary {
  guildId: string;
  name: string;
  description: string;
  emblem: string;
  level: number;
  levelName: string;
  totalXp: number;
  reputation: number;
  memberCount: number;
  maxMembers: number;
  isOpen: boolean;
  createdAt: string;
}

export interface GuildLeaderboardEntry {
  guildId: string;
  name: string;
  emblem: string;
  level: number;
  levelName: string;
  totalXp: number;
  reputation: number;
  memberCount: number;
  treasury: number;
}

export interface GuildMessage {
  guildId: string;
  email: string;
  username: string;
  message: string;
  messageType: 'text' | 'system' | 'achievement';
  createdAt: string;
}