import { StoryDay } from '../types';

export const CAMPAIGN_DATA: StoryDay[] = [
    { 
        day: 1, 
        title: "Пробуждение", 
        locationId: 'village', 
        locationName: "Деревня", 
        description: "Начало пути. Приведи дела в порядок.", 
        character: 'wizard', 
        dialogue: {
            high: "Великолепно! Ты сразу взялся за дело. Твой дух крепок.",
            medium: "Хорошее начало. Но помни: дисциплина — это путь к мастерству.",
            low: "Тяжелое пробуждение? Не волнуйся, каждый шаг приближает к цели."
        },
        questIds: {
            grade5: ["grade5_001", 65, 55],
            grade67: ["grade67_001", 65, 55],
            grade89: ["grade89_001", 65, 55],
            grade1011: ["grade1011_001", 65, 55]
        },
        rewardText: "Начало Пути" 
    },
    { 
        day: 2, 
        title: "Дисциплина", 
        locationId: 'village', 
        locationName: "Деревня", 
        description: "Укрепление духа и режима.", 
        character: 'wizard', 
        dialogue: {
            high: "Твоя стойкость впечатляет. Продолжай в том же духе!",
            medium: "Режим — основа силы. Ты справляешься.",
            low: "Соберись. Хаос — союзник Тени. Порядок — твой щит."
        },
        questIds: [66, 75, 56], // Habits are universal
        rewardText: "Бонус Стрика" 
    },
    { 
        day: 3, 
        title: "Лесная Арифметика", 
        locationId: 'forest', 
        locationName: "Лес", 
        description: "Основы вычислений.", 
        character: 'fairy', 
        dialogue: {
            high: "Ты считаешь быстрее, чем ветер листает страницы!",
            medium: "Цифры слушаются тебя. Хорошая работа.",
            low: "Лес запутал тебя? Не спеши, найди логику в хаосе."
        },
        questIds: {
            grade5: ["grade5_002", "grade5_003", 57],
            grade67: ["grade67_002", "grade67_003", 57],
            grade89: ["grade89_002", "grade89_003", 57],
            grade1011: ["grade1011_002", "grade1011_003", 57]
        },
        rewardText: "Разблокирован Дух" 
    },
    { 
        day: 4, 
        title: "Тропа Грамотности", 
        locationId: 'forest', 
        locationName: "Лес", 
        description: "Работа с текстом.", 
        character: 'fairy', 
        dialogue: {
            high: "Твои слова точны, как стрелы эльфов!",
            medium: "Ты понимаешь суть написанного. Это важно.",
            low: "Слова — это магия. Учись управлять ими осторожно."
        },
        questIds: {
            grade5: ["grade5_011", "grade5_012", 67],
            grade67: ["grade67_011", "grade67_012", 67],
            grade89: ["grade89_011", "grade89_012", 67],
            grade1011: ["grade1011_011", "grade1011_012", 67]
        },
        rewardText: "Скин Леса" 
    },
    { 
        day: 5, 
        title: "Научный Подход", 
        locationId: 'forest', 
        locationName: "Лес", 
        description: "Изучение природы.", 
        character: 'wizard', 
        dialogue: {
            high: "Ты видишь скрытые связи в природе. Истинный мудрец!",
            medium: "Наблюдательность — ключ к науке. Продолжай.",
            low: "Природа хранит тайны. Будь внимательнее."
        },
        questIds: {
            grade5: ["grade5_041", "grade5_042", 4],
            grade67: ["grade67_041", "grade67_042", 4],
            grade89: ["grade89_041", "grade89_042", 4],
            grade1011: ["grade1011_041", "grade1011_042", 4]
        },
        rewardText: "1-й Кристалл" 
    },
    { 
        day: 6, 
        title: "Восхождение", 
        locationId: 'mountains', 
        locationName: "Горы", 
        description: "Физика и выносливость.", 
        character: 'wizard', 
        dialogue: {
            high: "Ты покорил эту вершину с легкостью орла!",
            medium: "Подъем труден, но вид сверху того стоит.",
            low: "Не смотри вниз. Смотри на следующую ступень."
        },
        questIds: {
            grade5: ["grade5_043", "grade5_004", 58], // 5th grade usually doesn't have physics, using nature/math
            grade67: ["grade67_061", "grade67_062", 58],
            grade89: ["grade89_061", "grade89_062", 58],
            grade1011: ["grade1011_061", "grade1011_062", 58]
        },
        rewardText: "Зелье Силы" 
    },
    { 
        day: 7, 
        title: "Спасение Воина", 
        locationId: 'mountains', 
        locationName: "Горы", 
        description: "Английский и логика.", 
        character: 'warrior', 
        dialogue: {
            high: "Thanks! Ты освободил меня. Твой разум — твое оружие.",
            medium: "Я свободен. Ты неплохо справился с замками.",
            low: "Было близко... Но главное — мы выбрались."
        },
        questIds: {
            grade5: ["grade5_071", "grade5_005", 6],
            grade67: ["grade67_071", "grade67_005", 6],
            grade89: ["grade89_071", "grade89_005", 6],
            grade1011: ["grade1011_071", "grade1011_005", 6]
        },
        rewardText: "Разблокирован Воин" 
    },
    { 
        day: 8, 
        title: "Лавина Задач", 
        locationId: 'mountains', 
        locationName: "Горы", 
        description: "Многозадачность.", 
        character: 'warrior', 
        dialogue: {
            high: "Ты двигаешься быстрее лавины! Впечатляет.",
            medium: "Ты устоял под натиском. Это главное.",
            low: "Лавина чуть не накрыла тебя. Будь быстрее."
        },
        questIds: {
            grade5: ["grade5_006", "grade5_013", 68],
            grade67: ["grade67_006", "grade67_013", 68],
            grade89: ["grade89_006", "grade89_013", 68],
            grade1011: ["grade1011_006", "grade1011_013", 68]
        },
        rewardText: "2-й Кристалл" 
    },
    { 
        day: 9, 
        title: "Руины Истории", 
        locationId: 'castle', 
        locationName: "Замок", 
        description: "Исторические даты.", 
        character: 'wizard', 
        dialogue: {
            high: "Ты читаешь прошлое, как открытую книгу.",
            medium: "История помнит победителей. Ты — один из них.",
            low: "Забыть прошлое — значит повторить его ошибки."
        },
        questIds: {
            grade5: ["grade5_031", "grade5_032", 69],
            grade67: ["grade67_031", "grade67_032", 69],
            grade89: ["grade89_031", "grade89_032", 69],
            grade1011: ["grade1011_031", "grade1011_032", 69]
        },
        rewardText: "Щит Мудрости" 
    },
    { 
        day: 10, 
        title: "Зал Литературы", 
        locationId: 'castle', 
        locationName: "Замок", 
        description: "Чтение и анализ.", 
        character: 'fairy', 
        dialogue: {
            high: "Твоя речь льется как песня. Прекрасно!",
            medium: "Ты чувствуешь ритм слов. Продолжай читать.",
            low: "Слова путаются? Читай больше, и они станут друзьями."
        },
        questIds: {
            grade5: ["grade5_021", "grade5_022", 76],
            grade67: ["grade67_021", "grade67_022", 76],
            grade89: ["grade89_021", "grade89_022", 76],
            grade1011: ["grade1011_021", "grade1011_022", 76]
        },
        rewardText: "Свиток Речи" 
    },
    { 
        day: 11, 
        title: "Финансовая Грамота", 
        locationId: 'castle', 
        locationName: "Замок", 
        description: "Учет ресурсов.", 
        character: 'warrior', 
        dialogue: {
            high: "Казна полна! Ты отличный казначей.",
            medium: "Дебет с кредитом сошлись. Неплохо.",
            low: "Золото утекает сквозь пальцы. Считай внимательнее."
        },
        questIds: {
            grade5: ["grade5_007", "grade5_008", 70],
            grade67: ["grade67_007", "grade67_008", 70],
            grade89: ["grade89_007", "grade89_008", 70],
            grade1011: ["grade1011_007", "grade1011_008", 70]
        },
        rewardText: "3-й Кристалл" 
    },
    { 
        day: 12, 
        title: "Живой Песок", 
        locationId: 'desert', 
        locationName: "Пустыня", 
        description: "Биология жизни.", 
        character: 'fairy', 
        dialogue: {
            high: "Ты чувствуешь дыхание жизни даже в пустыне!",
            medium: "Жизнь находит выход. Ты тоже нашел верный ответ.",
            low: "Пустыня сурова. Изучи законы выживания."
        },
        questIds: {
            grade5: ["grade5_044", "grade5_045", 60],
            grade67: ["grade67_044", "grade67_045", 60],
            grade89: ["grade89_044", "grade89_045", 60],
            grade1011: ["grade1011_044", "grade1011_045", 60]
        },
        rewardText: "Зелье Жизни" 
    },
    { 
        day: 13, 
        title: "Буря Кода", 
        locationId: 'desert', 
        locationName: "Пустыня", 
        description: "Логика и IT.", 
        character: 'warrior', 
        dialogue: {
            high: "Твой алгоритм безупречен. Тень отступает!",
            medium: "Логика работает. Система стабильна.",
            low: "Ошибка в коде? Перезагрузись и попробуй снова."
        },
        questIds: {
            grade5: ["grade5_009", "grade5_010", 7],
            grade67: ["grade67_009", "grade67_010", 7],
            grade89: ["grade89_009", "grade89_010", 7],
            grade1011: ["grade1011_009", "grade1011_010", 7]
        },
        rewardText: "4-й Кристалл" 
    },
    { 
        day: 14, 
        title: "Трон Лени", 
        locationId: 'throne', 
        locationName: "Трон", 
        description: "Финальный экзамен.", 
        character: 'king', 
        dialogue: {
            high: "Ты победил меня... Нет, ты победил себя! Ты достоин трона.",
            medium: "Достойный бой. Ты доказал свою силу.",
            low: "Ты еще слаб. Но я вижу в тебе потенциал. Возвращайся."
        },
        questIds: {
            grade5: ["grade5_050", "grade5_060", 71],
            grade67: ["grade67_050", "grade67_060", 71],
            grade89: ["grade89_050", "grade89_060", 71],
            grade1011: ["grade1011_050", "grade1011_060", 71]
        },
        rewardText: "5-й Кристалл" 
    },
    { 
        day: 15, 
        title: "Новые Горизонты", 
        locationId: 'village', 
        locationName: "Деревня", 
        description: "Глава 2: Возвращение Героя.", 
        character: 'wizard', 
        dialogue: {
            high: "Ты вернулся победителем! Но мир велик, и новые тайны ждут.",
            medium: "Отдых был краток. Новые вызовы уже на горизонте.",
            low: "Даже героям нужно учиться заново. Начнем."
        },
        questIds: [65, 55, 1], // Placeholder quests for now
        rewardText: "Начало Главы 2" 
    }
];
