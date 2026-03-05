// Типы для системы квестов MotivaQuest

import { QuestRarity, GradeGroup } from '../types';

export interface QuestTemplate {
  id: string;
  title: string;
  description: string;
  category: string;
  categoryLabel: string;
  categoryIcon: string;
  rarity: QuestRarity;
  xpReward: number;
  coinReward: number;
  gradeGroup: GradeGroup;
}

export interface GradeGroupInfo {
  id: GradeGroup;
  label: string;
  description: string;
  grades: number[];
  icon: string;
  color: string;
}

export const GRADE_GROUPS: GradeGroupInfo[] = [
  {
    id: 'grade5',
    label: '5 класс',
    description: 'Основы: математика, природа, история древнего мира',
    grades: [5],
    icon: '🌱',
    color: '#22c55e',
  },
  {
    id: 'grade67',
    label: '6-7 класс',
    description: 'Физика, алгебра, начала программирования',
    grades: [6, 7],
    icon: '⚡',
    color: '#3b82f6',
  },
  {
    id: 'grade89',
    label: '8-9 класс',
    description: 'Химия, ОГЭ, углублённые науки',
    grades: [8, 9],
    icon: '🔥',
    color: '#f59e0b',
  },
  {
    id: 'grade1011',
    label: '10-11 класс',
    description: 'ЕГЭ, профильные предметы, проекты',
    grades: [10, 11],
    icon: '🎓',
    color: '#a855f7',
  },
];

export const gradeToGroup = (grade: number): GradeGroup => {
    if (grade === 5) return 'grade5';
    if (grade >= 6 && grade <= 7) return 'grade67';
    if (grade >= 8 && grade <= 9) return 'grade89';
    if (grade >= 10 && grade <= 11) return 'grade1011';
    return 'grade67'; // Default fallback
};

export const getHeroTitle = (grade: number): string => {
    if (grade === 5) return 'Герой-Авантюрист';
    if (grade >= 6 && grade <= 7) return 'Герой-Исследователь';
    if (grade >= 8 && grade <= 9) return 'Герой-Страж';
    if (grade >= 10 && grade <= 11) return 'Герой-Рыцарь';
    return 'Герой-Путешественник';
};

export const CATEGORY_TRANSLATIONS: Record<string, { label: string; icon: string }> = {
    math: { label: 'Математика', icon: '🔢' },
    russian: { label: 'Русский язык', icon: '📝' },
    literature: { label: 'Литература', icon: '📚' },
    english: { label: 'Английский', icon: '🇬🇧' },
    history: { label: 'История', icon: '⚔️' },
    biology: { label: 'Биология', icon: '🌿' },
    geography: { label: 'География', icon: '🌍' },
    physics: { label: 'Физика', icon: '⚡' },
    chemistry: { label: 'Химия', icon: '🧪' },
    social: { label: 'Общество', icon: '🤝' },
    sport: { label: 'Спорт', icon: '💪' },
    art: { label: 'Искусство', icon: '🎨' },
    music: { label: 'Музыка', icon: '🎵' },
    tech: { label: 'Технологии', icon: '💻' },
    it: { label: 'IT / Информатика', icon: '💻' },
    finance: { label: 'Финансы', icon: '💰' },
    ecology: { label: 'Экология', icon: '🌱' },
    self: { label: 'Саморазвитие', icon: '✨' },
    science: { label: 'Наука', icon: '🔬' },
    lang: { label: 'Языки', icon: '🗣️' }
};

export const RARITY_CONFIG: Record<QuestRarity, { label: string; color: string; bgColor: string; borderColor: string }> = {
  Common: {
    label: 'Обычный',
    color: '#94a3b8',
    bgColor: 'rgba(148, 163, 184, 0.1)',
    borderColor: 'rgba(148, 163, 184, 0.3)',
  },
  Rare: {
    label: 'Редкий',
    color: '#3b82f6',
    bgColor: 'rgba(59, 130, 246, 0.1)',
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  Epic: {
    label: 'Эпический',
    color: '#a855f7',
    bgColor: 'rgba(168, 85, 247, 0.1)',
    borderColor: 'rgba(168, 85, 247, 0.3)',
  },
  Legendary: {
    label: 'Легендарный',
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
};
