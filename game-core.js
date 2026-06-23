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
  const DEFAULT_MIN_COMBO_WINDOW_MS = 300;
  const DEFAULT_COMBO_WINDOW_STEP_MS = 100;
  const DEFAULT_GAME_DURATION_MS = 60_000;

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
    const durationMs = Number.isInteger(options.durationMs)
      ? options.durationMs
      : DEFAULT_GAME_DURATION_MS;
    const startedAt = Number.isFinite(options.startedAt) ? options.startedAt : null;
    const currentPaper = chooseNextPaper(null, rng);
    const comboTiming = {
      comboWindowMs,
      minComboWindowMs,
      comboWindowStepMs,
    };

    return {
      score: 0,
      clearedCount: 0,
      streak: 0,
      maxStreak: 0,
      mistakes: 0,
      maxMistakes,
      isGameOver: false,
      durationMs,
      startedAt,
      endedAt: null,
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

  function getRemainingTime(game, now = Date.now()) {
    if (!game || !Number.isFinite(game.durationMs)) {
      return 0;
    }

    if (!Number.isFinite(game.startedAt)) {
      return game.durationMs;
    }

    const measuredAt = Number.isFinite(game.endedAt) ? game.endedAt : now;
    const elapsedMs = Math.max(0, measuredAt - game.startedAt);

    return Math.max(0, game.durationMs - elapsedMs);
  }

  function expireGameIfTimeUp(game, now = Date.now()) {
    if (!game || game.isGameOver || !Number.isFinite(game.startedAt)) {
      return false;
    }

    if (now - game.startedAt < game.durationMs) {
      return false;
    }

    game.isGameOver = true;
    game.endedAt = game.startedAt + game.durationMs;

    return true;
  }

  function submitDirection(game, direction, options = {}) {
    if (!game || !game.currentPaper) {
      return {
        ignored: true,
        correct: false,
        timedOut: false,
      };
    }

    const now = Number.isFinite(options.now) ? options.now : Date.now();

    if (expireGameIfTimeUp(game, now) || game.isGameOver) {
      return {
        ignored: true,
        correct: false,
        timedOut: getRemainingTime(game, now) <= 0,
        streak: game.streak,
        maxStreak: game.maxStreak,
        comboWindowMs: game.currentComboWindowMs,
        currentPaper: game.currentPaper,
      };
    }

    const previousPaper = game.currentPaper;

    if (direction === previousPaper.direction) {
      const activeComboWindowMs = comboWindowForStreak(game.streak || 1, game);
      const continuesCombo =
        game.lastCorrectAt !== null &&
        now - game.lastCorrectAt <= activeComboWindowMs;

      game.streak = continuesCombo ? game.streak + 1 : 1;
      const pointsAwarded = game.streak >= 2 ? 2 : 1;
      game.score += pointsAwarded;
      game.clearedCount += 1;
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
        timedOut: false,
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
      game.endedAt = now;
    }

    return {
      ignored: false,
      correct: false,
      timedOut: false,
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
    expireGameIfTimeUp,
    getRemainingTime,
    submitDirection,
  };
});