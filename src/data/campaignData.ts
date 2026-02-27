import { StoryDay } from '../types';

export const CAMPAIGN_DATA: StoryDay[] = [
    { day: 1, title: "Пробуждение", locationId: 'village', locationName: "Деревня", description: "Начало пути. Приведи дела в порядок.", character: 'wizard', dialogue: "Здравствуй! Приведи в порядок свой штаб и тело.", questIds: [65, 55, 1], rewardText: "Начало Пути" },
    { day: 2, title: "Дисциплина", locationId: 'village', locationName: "Деревня", description: "Укрепление духа и режима.", character: 'wizard', dialogue: "Продолжай тренировки. Благодарность — сила героя.", questIds: [66, 75, 56], rewardText: "Бонус Стрика" },
    { day: 3, title: "Лесная Арифметика", locationId: 'forest', locationName: "Лес", description: "Основы вычислений.", character: 'fairy', dialogue: "Цифры запутали тропы! Помоги распутать их.", questIds: [2, 3, 57], rewardText: "Разблокирован Дух" },
    { day: 4, title: "Тропа Грамотности", locationId: 'forest', locationName: "Лес", description: "Работа с текстом.", character: 'fairy', dialogue: "Нужно больше усилий. Читай и записывай.", questIds: [11, 21, 67], rewardText: "Скин Леса" },
    { day: 5, title: "Научный Подход", locationId: 'forest', locationName: "Лес", description: "Изучение природы.", character: 'wizard', dialogue: "Мир полон загадок. Исследуй их!", questIds: [37, 81, 4], rewardText: "1-й Кристалл" },
    { day: 6, title: "Восхождение", locationId: 'mountains', locationName: "Горы", description: "Физика и выносливость.", character: 'wizard', dialogue: "В горах тяжело дышать. Законы Ньютона здесь суровы.", questIds: [38, 58, 5], rewardText: "Зелье Силы" },
    { day: 7, title: "Спасение Воина", locationId: 'mountains', locationName: "Горы", description: "Английский и логика.", character: 'warrior', dialogue: "Язык — это ключ к союзникам. Освободи меня!", questIds: [29, 93, 6], rewardText: "Разблокирован Воин" },
    { day: 8, title: "Лавина Задач", locationId: 'mountains', locationName: "Горы", description: "Многозадачность.", character: 'warrior', dialogue: "Держи ритм! Спорт и учеба — наш щит.", questIds: [59, 12, 68], rewardText: "2-й Кристалл" },
    { day: 9, title: "Руины Истории", locationId: 'castle', locationName: "Замок", description: "Исторические даты.", character: 'wizard', dialogue: "История учит нас не повторять ошибок.", questIds: [47, 48, 69], rewardText: "Щит Мудрости" },
    { day: 10, title: "Зал Литературы", locationId: 'castle', locationName: "Замок", description: "Чтение и анализ.", character: 'fairy', dialogue: "Слова имеют силу. Говори красиво и уверенно.", questIds: [22, 23, 76], rewardText: "Свиток Речи" },
    { day: 11, title: "Финансовая Грамота", locationId: 'castle', locationName: "Замок", description: "Учет ресурсов.", character: 'warrior', dialogue: "Золото требует счета. Подготовь казну.", questIds: [87, 88, 70], rewardText: "3-й Кристалл" },
    { day: 12, title: "Живой Песок", locationId: 'desert', locationName: "Пустыня", description: "Биология жизни.", character: 'fairy', dialogue: "В каждой клетке — жизнь. Изучи её.", questIds: [39, 82, 60], rewardText: "Зелье Жизни" },
    { day: 13, title: "Буря Кода", locationId: 'desert', locationName: "Пустыня", description: "Логика и IT.", character: 'warrior', dialogue: "Тень сопротивляется! Используй алгоритмы!", questIds: [94, 95, 7], rewardText: "4-й Кристалл" },
    { day: 14, title: "Трон Лени", locationId: 'throne', locationName: "Трон", description: "Финальный экзамен.", character: 'king', dialogue: "Я — твоя Лень. Сможешь ли ты победить себя?", questIds: [74, 100, 71], rewardText: "5-й Кристалл" }
];
