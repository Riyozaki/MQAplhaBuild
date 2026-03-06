import { Task, TaskType } from '../types';

// Fisher-Yates shuffle
const shuffle = (array: any[]) => {
    const newArr = [...array];
    for (let i = newArr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
};

// Helper for task creation
const t = (type: TaskType, q: string, correct: string, opts?: any): Omit<Task, 'id'> => {
    const task: any = {
        type,
        question: q,
        correctAnswer: correct,
        ...opts
    };

    // Auto-generate shuffled items for ordering tasks if not provided
    if (type === 'ordering' && task.correctOrder && !task.shuffledItems) {
        task.shuffledItems = shuffle(task.correctOrder);
    }

    return task;
};

const questsData = [
    // --- DAY 1: MATH ---
    { id: 1, title: "Быстрый счет: Таблица x7", description: "Вспомни таблицу умножения", category: "math", categoryLabel: "Математика", categoryIcon: "🔢", rarity: "Common", xp: 15, coins: 10, tasks: [
        t('timer_challenge', "7 × 6 = ?", "42", { timerSeconds: 15 }),
        t('timer_challenge', "7 × 8 = ?", "56", { timerSeconds: 15 }),
        t('timer_challenge', "7 × 9 = ?", "63", { timerSeconds: 15 })
    ]},
    { id: 55, title: "Спорт: Зарядка", description: "Разминка утром", category: "sport", categoryLabel: "Спорт", categoryIcon: "💪", rarity: "Common", xp: 15, coins: 10, tasks: [
        t('checklist', "Утро", "", { checklistItems: [{id:'1', label: '10 приседаний'}, {id:'2', label: 'Потягивания'}]}),
        t('yes_no', "Бодрость есть?", "yes")
    ]},
    { id: 65, title: "Уборка: Рабочий стол", description: "Порядок в вещах", category: "self", categoryLabel: "Саморазвитие", categoryIcon: "✨", rarity: "Common", xp: 20, coins: 15, tasks: [
        t('checklist', "Стол", "", { checklistItems: [{id:'1', label: 'Убрал мусор'}, {id:'2', label: 'Сложил ручки'}, {id:'3', label: 'Протер пыль'}]})
    ]},

    // --- DAY 2: DISCIPLINE ---
    { id: 66, title: "Режим дня", description: "Построй свой график", category: "self", categoryLabel: "Саморазвитие", categoryIcon: "✨", rarity: "Common", xp: 20, coins: 15, tasks: [
        t('checklist', "План", "", { checklistItems: [{id:'1', label: 'Собрал рюкзак с вечера'}, {id:'2', label: 'Одежда на завтра готова'}, {id:'3', label: 'Завел будильник'}] })
    ]},
    { id: 75, title: "Дневник благодарности", description: "Позитивное мышление", category: "self", categoryLabel: "Саморазвитие", categoryIcon: "✨", rarity: "Rare", xp: 30, coins: 20, tasks: [
        t('text_input', "Напиши одну вещь, за которую ты благодарен сегодня", "*", {})
    ]},
    { id: 56, title: "Спорт: Вода", description: "Гидратация", category: "sport", categoryLabel: "Спорт", categoryIcon: "💪", rarity: "Common", xp: 15, coins: 10, tasks: [
        t('checklist', "Вода", "", { checklistItems: [{id:'1', label: 'Стакан утром'}, {id:'2', label: 'Стакан в школе/днем'}, {id:'3', label: 'Стакан вечером'}]})
    ]},

    // --- DAY 3: MATH & ECO ---
    { id: 2, title: "Дроби: Сложение", description: "Сложи простые дроби", category: "math", categoryLabel: "Математика", categoryIcon: "🔢", rarity: "Rare", xp: 30, coins: 20, tasks: [
        t('quiz', "1/2 + 1/4 = ?", "", { options: ["3/4", "2/6", "1/6", "2/4"], correctIndex: 0 }),
        t('number_input', "Числитель 3/5 + 1/5?", "4", {})
    ]},
    { id: 3, title: "Проценты: Скидки", description: "Посчитай выгоду", category: "math", categoryLabel: "Математика", categoryIcon: "🔢", rarity: "Rare", xp: 30, coins: 20, tasks: [
        t('timer_challenge', "Цена 100, скидка 20%. Итог?", "80", { timerSeconds: 20 }),
        t('timer_challenge', "50% от 400?", "200", { timerSeconds: 15 })
    ]},
    { id: 57, title: "Лесная Экология", description: "Раздельный сбор", category: "ecology", categoryLabel: "Экология", categoryIcon: "🌱", rarity: "Common", xp: 25, coins: 15, tasks: [
        t('matching', "Сортировка", "", { pairs: [{left: 'Батарейки', right: 'Опасные отходы'}, {left: 'Бумага', right: 'Макулатура'}, {left: 'Яблоко', right: 'Компост'}] }),
        t('quiz', "Сколько разлагается пластик?", "", { options: ["50 лет", "100 лет", "400+ лет", "1 год"], correctIndex: 2 })
    ]},

    // --- DAY 4: RUSSIAN ---
    { id: 11, title: "Жи/Ши", description: "Основы правописания", category: "russian", categoryLabel: "Русский язык", categoryIcon: "📝", rarity: "Common", xp: 15, coins: 10, tasks: [
        t('quiz', "Какое слово верное?", "", { options: ["Шина", "Шына"], correctIndex: 0 }),
        t('quiz', "Какое слово верное?", "", { options: ["Жизнь", "Жызнь"], correctIndex: 0 })
    ]},
    { id: 21, title: "Ударения", description: "Говори правильно", category: "russian", categoryLabel: "Русский язык", categoryIcon: "📝", rarity: "Rare", xp: 30, coins: 20, tasks: [
        t('quiz', "Правильное ударение?", "", { options: ["звонИт", "звОнит"], correctIndex: 0 }),
        t('quiz', "Правильное ударение?", "", { options: ["тОрты", "тортЫ"], correctIndex: 0 }),
        t('quiz', "Правильное ударение?", "", { options: ["красИвее", "красивЕе"], correctIndex: 0 })
    ]},
    { id: 67, title: "Скорочтение", description: "Работа с текстом", category: "literature", categoryLabel: "Литература", categoryIcon: "📚", rarity: "Epic", xp: 40, coins: 30, tasks: [
        t('timer_challenge', "Прочитай стр. книги за 2 мин", "готово", { timerSeconds: 120, acceptableAnswers: ["готово", "да", "сделал"] }),
        t('text_input', "О чем была страница (кратко)?", "*", {})
    ]},

    // --- DAY 5: SCIENCE ---
    { id: 37, title: "Фотосинтез", description: "Как дышат растения", category: "science", categoryLabel: "Наука", categoryIcon: "🔬", rarity: "Rare", xp: 35, coins: 25, tasks: [
        t('ordering', "Процесс", "", { shuffledItems: ["Солнце светит", "Лист поглощает свет", "Выделяется кислород"], correctOrder: ["Солнце светит", "Лист поглощает свет", "Выделяется кислород"] }),
        t('quiz', "Что поглощают растения?", "", { options: ["Кислород", "Углекислый газ", "Азот"], correctIndex: 1 })
    ]},
    { id: 81, title: "Агрегатные состояния", description: "Физика воды", category: "science", categoryLabel: "Наука", categoryIcon: "🔬", rarity: "Common", xp: 20, coins: 15, tasks: [
        t('matching', "Состояния", "", { pairs: [{left: 'Лёд', right: 'Твердое'}, {left: 'Пар', right: 'Газообразное'}, {left: 'Вода', right: 'Жидкое'}] }),
        t('number_input', "Температура кипения воды (С)?", "100", {})
    ]},
    { id: 4, title: "Геометрия: Площадь", description: "Найди площадь фигур", category: "math", categoryLabel: "Математика", categoryIcon: "🔢", rarity: "Common", xp: 20, coins: 15, tasks: [
        t('number_input', "Прямоугольник 5x8. Площадь?", "40", {}),
        t('number_input', "Квадрат со стороной 6. Площадь?", "36", {})
    ]},

    // --- DAY 6: PHYSICS & SPORT ---
    { id: 38, title: "Сила и Движение", description: "Законы Ньютона", category: "science", categoryLabel: "Наука", categoryIcon: "🔬", rarity: "Epic", xp: 45, coins: 35, tasks: [
        t('quiz', "Формула силы?", "", { options: ["F = m*a", "F = m/a", "F = m+a"], correctIndex: 0 }),
        t('quiz', "Сила притяжения Земли - это...", "", { options: ["Трение", "Гравитация", "Инерция"], correctIndex: 1 }),
        t('yes_no', "Тяжелее ли 1кг ваты чем 1кг железа?", "no")
    ]},
    { id: 58, title: "Выносливость: Планка", description: "Укрепи кор", category: "sport", categoryLabel: "Спорт", categoryIcon: "💪", rarity: "Rare", xp: 35, coins: 25, tasks: [
        t('timer_challenge', "Стой в планке!", "да", { timerSeconds: 45, acceptableAnswers: ["да", "сделал", "готово"] })
    ]},
    { id: 5, title: "Уравнения: Найти X", description: "Реши линейные уравнения", category: "math", categoryLabel: "Математика", categoryIcon: "🔢", rarity: "Epic", xp: 50, coins: 40, tasks: [
        t('timer_challenge', "2x + 10 = 20. x=?", "5", { timerSeconds: 30 }),
        t('timer_challenge', "3x - 5 = 10. x=?", "5", { timerSeconds: 30 })
    ]},

    // --- DAY 7: ENGLISH & LOGIC ---
    { id: 29, title: "Irregular Verbs", description: "Неправильные глаголы", category: "english", categoryLabel: "Английский", categoryIcon: "🇬🇧", rarity: "Rare", xp: 30, coins: 25, tasks: [
        t('matching', "Forms", "", { pairs: [{left: 'Go', right: 'Went'}, {left: 'See', right: 'Saw'}, {left: 'Buy', right: 'Bought'}] }),
        t('fill_blanks', "Complete the sentence", "", { textWithBlanks: "I ___ my homework yesterday.", blankAnswers: ["did"] })
    ]},
    { id: 93, title: "Загадки Мудреца", description: "Тренировка ума", category: "math", categoryLabel: "Математика", categoryIcon: "🔢", rarity: "Epic", xp: 40, coins: 30, tasks: [
        t('text_input', "Что идет, не двигаясь с места?", "время", { acceptableAnswers: ["часы", "время", "жизнь"] }),
        t('quiz', "У отца Мэри 5 дочерей: Чача, Чече, Чичи, Чочо. Как зовут пятую?", "", { options: ["Чучу", "Мэри", "Чича"], correctIndex: 1 })
    ]},
    { id: 6, title: "Логика: Ряды чисел", description: "Продолжи последовательность", category: "math", categoryLabel: "Математика", categoryIcon: "🔢", rarity: "Rare", xp: 35, coins: 25, tasks: [
        t('quiz', "2, 4, 8, 16...?", "", { options: ["32", "24", "30"], correctIndex: 0 }),
        t('quiz', "1, 1, 2, 3, 5...?", "", { options: ["8", "7", "6"], correctIndex: 0 })
    ]},

    // --- DAY 8: MULTITASKING ---
    { id: 59, title: "Координация: Берпи", description: "Сложное упражнение", category: "sport", categoryLabel: "Спорт", categoryIcon: "💪", rarity: "Epic", xp: 45, coins: 30, tasks: [
        t('timer_challenge', "Сделай 5 берпи", "да", { timerSeconds: 40, acceptableAnswers: ["да", "готово"] }),
        t('yes_no', "Пульс участился?", "yes")
    ]},
    { id: 12, title: "Тся/Ться", description: "Мягкий знак в глаголах", category: "russian", categoryLabel: "Русский язык", categoryIcon: "📝", rarity: "Rare", xp: 30, coins: 20, tasks: [
        t('quiz', "Он (что делает?)", "", { options: ["Учится", "Учиться"], correctIndex: 0 }),
        t('quiz', "Надо (что делать?)", "", { options: ["Учиться", "Учится"], correctIndex: 0 })
    ]},
    { id: 68, title: "Планирование", description: "Матрица Эйзенхауэра", category: "self", categoryLabel: "Саморазвитие", categoryIcon: "✨", rarity: "Epic", xp: 40, coins: 35, tasks: [
        t('quiz', "Срочное и Важное - это...", "", { options: ["Сделать сейчас", "Делегировать", "Отложить"], correctIndex: 0 }),
        t('quiz', "Не срочное, но Важное - это...", "", { options: ["Запланировать", "Удалить", "Сделать сейчас"], correctIndex: 0 })
    ]},

    // --- DAY 9: HISTORY ---
    { id: 47, title: "Правители Руси", description: "Хронология", category: "history", categoryLabel: "История", categoryIcon: "⚔️", rarity: "Rare", xp: 35, coins: 25, tasks: [
        t('ordering', "Порядок правления", "", { shuffledItems: ["Петр I", "Иван Грозный", "Николай II", "Екатерина II"], correctOrder: ["Иван Грозный", "Петр I", "Екатерина II", "Николай II"] })
    ]},
    { id: 48, title: "Великие Открытия", description: "Кто что открыл?", category: "history", categoryLabel: "История", categoryIcon: "⚔️", rarity: "Epic", xp: 40, coins: 30, tasks: [
        t('matching', "Открытия", "", { pairs: [{left: 'Колумб', right: 'Америка'}, {left: 'Гагарин', right: 'Космос'}, {left: 'Менделеев', right: 'Таблица элементов'}] }),
        t('number_input', "В каком году Гагарин полетел в космос?", "1961", {})
    ]},
    { id: 69, title: "Режим сна", description: "Ложись вовремя", category: "self", categoryLabel: "Саморазвитие", categoryIcon: "✨", rarity: "Rare", xp: 40, coins: 30, tasks: [
        t('checklist', "Сон", "", { checklistItems: [{id:'1', label: 'Убрал телефон за час'}, {id:'2', label: 'Проветрил комнату'}, {id:'3', label: 'Лег до 23:00'}]})
    ]},

    // --- DAY 10: LITERATURE ---
    { id: 22, title: "Герои Книг", description: "Кто написал?", category: "literature", categoryLabel: "Литература", categoryIcon: "📚", rarity: "Common", xp: 20, coins: 15, tasks: [
        t('matching', "Автор - Герой", "", { pairs: [{left: 'Пушкин', right: 'Онегин'}, {left: 'Лермонтов', right: 'Печорин'}, {left: 'Толстой', right: 'Пьер Безухов'}] })
    ]},
    { id: 23, title: "Стихотворные размеры", description: "Ритм поэзии", category: "literature", categoryLabel: "Литература", categoryIcon: "📚", rarity: "Legendary", xp: 60, coins: 50, tasks: [
        t('quiz', "Ударный, Безударный (2 слога)", "", { options: ["Хорей", "Ямб"], correctIndex: 0 }),
        t('quiz', "Безударный, Ударный (2 слога)", "", { options: ["Ямб", "Хорей"], correctIndex: 0 }),
        t('quiz', "Мой дЯдя сАмых чЕстных прАвил...", "", { options: ["Ямб", "Дактиль", "Хорей"], correctIndex: 0 })
    ]},
    { id: 76, title: "Ораторское искусство", description: "Речь и дикция", category: "literature", categoryLabel: "Литература", categoryIcon: "📚", rarity: "Rare", xp: 30, coins: 20, tasks: [
        t('timer_challenge', "Скажи скороговорку: 'Шла Саша по шоссе' 3 раза", "да", { timerSeconds: 15, acceptableAnswers: ["да", "готово"] }),
        t('yes_no', "Получилось без запинки?", "yes")
    ]},

    // --- DAY 11: FINANCE ---
    { id: 87, title: "Бюджет Героя", description: "Доходы и расходы", category: "finance", categoryLabel: "Финансы", categoryIcon: "💰", rarity: "Rare", xp: 35, coins: 25, tasks: [
        t('quiz', "Карманные деньги - это...", "", { options: ["Доход", "Расход"], correctIndex: 0 }),
        t('quiz', "Покупка игры - это...", "", { options: ["Расход", "Инвестиция", "Доход"], correctIndex: 0 }),
        t('number_input', "Было 500, потратил 150. Остаток?", "350", {})
    ]},
    { id: 88, title: "Копилка", description: "Финансовая цель", category: "finance", categoryLabel: "Финансы", categoryIcon: "💰", rarity: "Common", xp: 20, coins: 15, tasks: [
        t('checklist', "Цель", "", { checklistItems: [{id:'1', label: 'Придумай цель накопления'}, {id:'2', label: 'Отложи 10% от имеющихся денег'}] })
    ]},
    { id: 70, title: "SMART Цели", description: "Умное планирование", category: "self", categoryLabel: "Саморазвитие", categoryIcon: "✨", rarity: "Epic", xp: 45, coins: 35, tasks: [
        t('ordering', "Расшифруй SMART", "", { shuffledItems: ["Measurable (Измеримая)", "Specific (Конкретная)", "Achievable (Достижимая)"], correctOrder: ["Specific (Конкретная)", "Measurable (Измеримая)", "Achievable (Достижимая)"] }),
        t('quiz', "Какая цель SMART?", "", { options: ["Хочу быть богатым", "Накопить 1000р к пятнице"], correctIndex: 1 })
    ]},

    // --- DAY 12: BIO & ECO ---
    { id: 39, title: "Анатомия Человека", description: "Твое тело", category: "science", categoryLabel: "Наука", categoryIcon: "🔬", rarity: "Epic", xp: 40, coins: 30, tasks: [
        t('drag_to_image', "Расставь органы", "", { 
            imageUrl: "https://placehold.co/600x400?text=Human+Body",
            dropZones: [
                { id: 'heart', x: 45, y: 35, width: 10, height: 10, label: 'Сердце' },
                { id: 'lungs', x: 35, y: 30, width: 30, height: 20, label: 'Легкие' },
                { id: 'stomach', x: 45, y: 55, width: 15, height: 10, label: 'Желудок' }
            ],
            items: [
                { id: 'item-heart', label: 'Сердце', targetZoneId: 'heart' },
                { id: 'item-lungs', label: 'Легкие', targetZoneId: 'lungs' },
                { id: 'item-stomach', label: 'Желудок', targetZoneId: 'stomach' }
            ]
        }),
        t('number_input', "Сколько камер в сердце человека?", "4", {})
    ]},
    { id: 82, title: "Пищевые Цепочки", description: "Экосистема", category: "ecology", categoryLabel: "Экология", categoryIcon: "🌱", rarity: "Rare", xp: 30, coins: 20, tasks: [
        t('ordering', "Цепочка", "", { shuffledItems: ["Волк", "Трава", "Заяц"], correctOrder: ["Трава", "Заяц", "Волк"] }),
        t('quiz', "Кто здесь продуцент (производитель)?", "", { options: ["Трава", "Волк", "Гриб"], correctIndex: 0 })
    ]},
    { id: 60, title: "Спорт: Растяжка", description: "Гибкость", category: "sport", categoryLabel: "Спорт", categoryIcon: "💪", rarity: "Common", xp: 20, coins: 15, tasks: [
        t('checklist', "Комплекс", "", { checklistItems: [{id:'1', label: 'Наклоны к полу (10 раз)'}, {id:'2', label: 'Тянем руки вверх'}] })
    ]},

    // --- DAY 13: IT & LOGIC ---
    { id: 94, title: "Алгоритмы", description: "Порядок действий", category: "it", categoryLabel: "IT / Информатика", categoryIcon: "💻", rarity: "Epic", xp: 50, coins: 40, tasks: [
        t('ordering', "Алгоритм: Чай", "", { shuffledItems: ["Налить кипяток", "Вскипятить воду", "Положить пакетик"], correctOrder: ["Вскипятить воду", "Положить пакетик", "Налить кипяток"] }),
        t('quiz', "Что такое цикл?", "", { options: ["Повторение действий", "Остановка программы", "Ошибка"], correctIndex: 0 })
    ]},
    { id: 95, title: "Двоичный Код", description: "Язык машин", category: "it", categoryLabel: "IT / Информатика", categoryIcon: "💻", rarity: "Legendary", xp: 60, coins: 50, tasks: [
        t('quiz', "101 в десятичной системе?", "", { options: ["5", "3", "4", "6"], correctIndex: 0 }),
        t('quiz', "1 байт = ? бит", "", { options: ["8", "10", "16", "4"], correctIndex: 0 }),
        t('matching', "Бит", "", { pairs: [{left: '0', right: 'Выкл'}, {left: '1', right: 'Вкл'}] })
    ]},
    { id: 7, title: "Степени двойки", description: "Информатика и математика", category: "math", categoryLabel: "Математика", categoryIcon: "🔢", rarity: "Epic", xp: 50, coins: 40, tasks: [
        t('matching', "Степени", "", { pairs: [{left:'2^3', right:'8'}, {left:'2^5', right:'32'}, {left:'2^10', right:'1024'}] })
    ]},

    // --- DAY 14: BOSS & FINAL ---
    { id: 74, title: "Рефлексия", description: "Оглянись назад", category: "self", categoryLabel: "Саморазвитие", categoryIcon: "✨", rarity: "Rare", xp: 40, coins: 30, tasks: [
        t('text_input', "Чему главному ты научился за 2 недели?", "*", {}),
        t('yes_no', "Гордишься собой?", "yes")
    ]},
    { id: 100, title: "Арт: Креатив", description: "Создание нового", category: "art", categoryLabel: "Искусство", categoryIcon: "🎨", rarity: "Epic", xp: 50, coins: 40, tasks: [
        t('text_input', "Придумай девиз своего героя", "*", {})
    ]},
    { id: 71, title: "План Будущего", description: "Что дальше?", category: "self", categoryLabel: "Саморазвитие", categoryIcon: "✨", rarity: "Legendary", xp: 100, coins: 100, tasks: [
        t('checklist', "План", "", { checklistItems: [{id:'1', label: 'Выбрать новую цель'}, {id:'2', label: 'Не бросать привычки'}, {id:'3', label: 'Победить Босса'}] }),
        t('text_input', "Напиши свою главную цель на следующий месяц", "*", {})
    ]},
    
    // --- Additional Pool Quests ---
    { id: 8, title: "Отрицательные числа", description: "Сложение и вычитание", category: "math", categoryLabel: "Математика", categoryIcon: "🔢", rarity: "Common", xp: 20, coins: 15, tasks: [
        t('timer_challenge', "-5 + 3 = ?", "-2", { timerSeconds: 20 }),
        t('timer_challenge', "-10 - 5 = ?", "-15", { timerSeconds: 20 })
    ]},
    { id: 9, title: "Округление", description: "Приближенные значения", category: "math", categoryLabel: "Математика", categoryIcon: "🔢", rarity: "Common", xp: 15, coins: 10, tasks: [
        t('quiz', "3.7 до целых?", "", { options: ["4", "3", "3.5"], correctIndex: 0 }),
        t('quiz', "12.2 до целых?", "", { options: ["12", "13", "12.5"], correctIndex: 0 })
    ]},
    { id: 10, title: "Римские цифры", description: "Древний счет", category: "math", categoryLabel: "Математика", categoryIcon: "🔢", rarity: "Rare", xp: 30, coins: 20, tasks: [
        t('matching', "Цифры", "", { pairs: [{left:'V', right:'5'}, {left:'IX', right:'9'}, {left:'X', right:'10'}] })
    ]},
];

// Post-process to assign deterministic IDs
export const rawQuests = questsData.map(quest => ({
    ...quest,
    tasks: quest.tasks.map((task: any, index: number) => ({
        ...task,
        id: `${quest.id}-${index}`
    }))
}));
