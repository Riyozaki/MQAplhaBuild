export const calculateNextLevelXp = (level: number): number => {
    return Math.floor(100 * Math.pow(1.5, level - 1));
};

export const calculateLevelFromXp = (totalXp: number): { level: number; currentXp: number; nextLevelXp: number } => {
    let level = 1;
    let xp = totalXp;
    let nextLevelXp = calculateNextLevelXp(level);

    while (xp >= nextLevelXp) {
        xp -= nextLevelXp;
        level++;
        nextLevelXp = calculateNextLevelXp(level);
    }

    return { level, currentXp: xp, nextLevelXp };
};

export const applyXpGain = (currentXp: number, currentLevel: number, xpAmount: number): { level: number; currentXp: number; nextLevelXp: number; leveledUp: boolean } => {
    let xp = currentXp + xpAmount;
    let level = currentLevel;
    let nextLevelXp = calculateNextLevelXp(level);
    let leveledUp = false;

    while (xp >= nextLevelXp) {
        xp -= nextLevelXp;
        level++;
        nextLevelXp = calculateNextLevelXp(level);
        leveledUp = true;
    }

    return { level, currentXp: xp, nextLevelXp, leveledUp };
};
