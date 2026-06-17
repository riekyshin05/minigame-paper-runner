(function attachPaperRunnerCore(root, factory) {
  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  root.PaperRunnerCore = api;
})(typeof globalThis !== "undefined" ? globalThis : window, function createCore() {
  const PAPER_TYPES = [
    {
      id: "red",
      label: "빨간색",
      direction: "up",
      arrow: "↑",
    },
    {
      id: "blue",
      label: "파란색",
      direction: "right",
      arrow: "→",
    },
    {
      id: "yellow",
      label: "노란색",
      direction: "left",
      arrow: "←",
    },
    {
      id: "orange",
      label: "당근색",
      direction: "down",
      arrow: "↓",
    },
  ];

  const DEFAULT_MAX_MISTAKES = 1;
  const DEFAULT_PREVIEW_COUNT = 3;
  const DEFAULT_COMBO_WINDOW_MS = 1000;
  const DEFAULT_MIN_COMBO_WINDOW_MS = 450;
  const DEFAULT_COMBO_WINDOW_STEP_MS = 70;

  function clampRandomIndex(value, length) {
    const safeValue = Number.isFinite(value) ? value : 0;
    return Math.min(Math.floor(Math.max(safeValue, 0) * length), length - 1);
  }

  function chooseNextPaper(previousPaperId, rng = Math.random) {
    const candidates =
      previousPaperId && PAPER_TYPES.length > 1
        ? PAPER_TYPES.filter((paper) => paper.id !== previousPaperId)
        : PAPER_TYPES;

    return candidates[clampRandomIndex(rng(), candidates.length)];
  }

  function createUpcomingPapers(previousPaperId, count, rng) {
    const papers = [];
    let previousId = previousPaperId;

    for (let index = 0; index < count; index += 1) {
      const paper = chooseNextPaper(previousId, rng);
      papers.push(paper);
      previousId = paper.id;
    }

    return papers;
  }

  function comboWindowForStreak(streak, options = {}) {
    const baseWindow = Number.isFinite(options.comboWindowMs)
      ? options.comboWindowMs
      : DEFAULT_COMBO_WINDOW_MS;
    const minWindow = Number.isFinite(options.minComboWindowMs)
      ? options.minComboWindowMs
      : DEFAULT_MIN_COMBO_WINDOW_MS;
    const step = Number.isFinite(options.comboWindowStepMs)
      ? options.comboWindowStepMs
      : DEFAULT_COMBO_WINDOW_STEP_MS;
    const safeStreak = Math.max(Number.isFinite(streak) ? streak : 1, 1);

    return Math.max(minWindow, baseWindow - (safeStreak - 1) * step);
  }

  function createGame(options = {}) {
    const rng = typeof options.rng === "function" ? options.rng : Math.random;
    const maxMistakes = Number.isInteger(options.maxMistakes)
      ? options.maxMistakes
      : DEFAULT_MAX_MISTAKES;
    const previewCount = Number.isInteger(options.previewCount)
      ? options.previewCount
      : DEFAULT_PREVIEW_COUNT;
    const comboWindowMs = Number.isInteger(options.comboWindowMs)
      ? options.comboWindowMs
      : DEFAULT_COMBO_WINDOW_MS;
    const minComboWindowMs = Number.isInteger(options.minComboWindowMs)
      ? options.minComboWindowMs
      : DEFAULT_MIN_COMBO_WINDOW_MS;
    const comboWindowStepMs = Number.isInteger(options.comboWindowStepMs)
      ? options.comboWindowStepMs
      : DEFAULT_COMBO_WINDOW_STEP_MS;
    const currentPaper = chooseNextPaper(null, rng);
    const comboTiming = {
      comboWindowMs,
      minComboWindowMs,
      comboWindowStepMs,
    };

    return {
      score: 0,
      streak: 0,
      maxStreak: 0,
      mistakes: 0,
      maxMistakes,
      isGameOver: false,
      currentPaper,
      upcomingPapers: createUpcomingPapers(currentPaper.id, previewCount, rng),
      previewCount,
      comboWindowMs,
      minComboWindowMs,
      comboWindowStepMs,
      currentComboWindowMs: comboWindowForStreak(1, comboTiming),
      lastCorrectAt: null,
      rng,
    };
  }

  function submitDirection(game, direction, options = {}) {
    if (!game || game.isGameOver || !game.currentPaper) {
      return {
        ignored: true,
        correct: false,
      };
    }

    const previousPaper = game.currentPaper;

    if (direction === previousPaper.direction) {
      const now = Number.isFinite(options.now) ? options.now : Date.now();
      const activeComboWindowMs = comboWindowForStreak(game.streak || 1, game);
      const continuesCombo =
        game.lastCorrectAt !== null &&
        now - game.lastCorrectAt <= activeComboWindowMs;

      game.streak = continuesCombo ? game.streak + 1 : 1;
      const pointsAwarded = game.streak >= 2 ? 2 : 1;
      game.score += pointsAwarded;
      game.maxStreak = Math.max(game.maxStreak, game.streak);
      game.currentComboWindowMs = comboWindowForStreak(game.streak, game);
      game.lastCorrectAt = now;
      game.currentPaper =
        game.upcomingPapers.shift() || chooseNextPaper(previousPaper.id, game.rng);
      const lastPreviewPaper =
        game.upcomingPapers[game.upcomingPapers.length - 1] || game.currentPaper;
      game.upcomingPapers.push(chooseNextPaper(lastPreviewPaper.id, game.rng));

      return {
        ignored: false,
        correct: true,
        streak: game.streak,
        maxStreak: game.maxStreak,
        pointsAwarded,
        comboWindowMs: game.currentComboWindowMs,
        previousPaper,
        currentPaper: game.currentPaper,
      };
    }

    game.mistakes += 1;
    game.streak = 0;
    game.currentComboWindowMs = comboWindowForStreak(1, game);
    game.lastCorrectAt = null;

    if (game.mistakes >= game.maxMistakes) {
      game.isGameOver = true;
    }

    return {
      ignored: false,
      correct: false,
      streak: game.streak,
      maxStreak: game.maxStreak,
      comboWindowMs: game.currentComboWindowMs,
      previousPaper,
      currentPaper: game.currentPaper,
    };
  }

  return {
    PAPER_TYPES,
    comboWindowForStreak,
    chooseNextPaper,
    createUpcomingPapers,
    createGame,
    submitDirection,
  };
});