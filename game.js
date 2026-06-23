(function startPaperRunner() {
  const {
    createGame,
    expireGameIfTimeUp,
    getRemainingTime,
    submitDirection,
  } = window.PaperRunnerCore;

  const BEST_SCORE_KEY = "paper-runner-best-score";
  const ANIMATION_MS = 180;
  const SWIPE_THRESHOLD = 36;

  const directionByKey = {
    ArrowUp: "up",
    ArrowRight: "right",
    ArrowLeft: "left",
    ArrowDown: "down",
  };

  const refs = {
    timeValue: document.getElementById("timeValue"),
    clearedValue: document.getElementById("clearedValue"),
    scoreValue: document.getElementById("scoreValue"),
    bestValue: document.getElementById("bestValue"),
    maxComboValue: document.getElementById("maxComboValue"),
    mistakePips: document.getElementById("mistakePips"),
    activePaper: document.getElementById("activePaper"),
    previewPapers: document.querySelectorAll("[data-preview-index]"),
    paperArrow: document.getElementById("paperArrow"),
    comboBadge: document.getElementById("comboBadge"),
    comboGauge: document.getElementById("comboGauge"),
    comboGaugeFill: document.getElementById("comboGaugeFill"),
    feedback: document.getElementById("feedback"),
    stage: document.getElementById("stage"),
    startScreen: document.getElementById("startScreen"),
    gameOverScreen: document.getElementById("gameOverScreen"),
    gameOverTitle: document.getElementById("gameOverTitle"),
    finalCleared: document.getElementById("finalCleared"),
    finalScore: document.getElementById("finalScore"),
    finalBest: document.getElementById("finalBest"),
    finalMaxCombo: document.getElementById("finalMaxCombo"),
    startButton: document.getElementById("startButton"),
    restartButton: document.getElementById("restartButton"),
    muteButton: document.getElementById("muteButton"),
    directionButtons: document.querySelectorAll("[data-direction]"),
  };

  let game = createGame();
  let bestScore = readBestScore();
  let playing = false;
  let locked = true;
  let ending = false;
  let swipeStart = null;
  let comboGaugeFrame = 0;
  let timerFrame = 0;
  const audio = createAudioController();

  renderGame();
  bindEvents();

  function bindEvents() {
    refs.startButton.addEventListener("click", startGame);
    refs.restartButton.addEventListener("click", startGame);
    refs.muteButton.addEventListener("click", toggleMute);

    refs.directionButtons.forEach((button) => {
      button.addEventListener("click", () => {
        pulseButton(button);
        handleDirection(button.dataset.direction);
      });
    });

    window.addEventListener("keydown", (event) => {
      const direction = directionByKey[event.key];

      if (direction) {
        event.preventDefault();
        pulseDirection(direction);
        handleDirection(direction);
        return;
      }

      if (event.key === "Enter" && !playing) {
        startGame();
      }
    });

    refs.stage.addEventListener("pointerdown", (event) => {
      swipeStart = {
        x: event.clientX,
        y: event.clientY,
        pointerId: event.pointerId,
      };
      refs.stage.setPointerCapture(event.pointerId);
    });

    refs.stage.addEventListener("pointerup", (event) => {
      if (!swipeStart || swipeStart.pointerId !== event.pointerId) {
        return;
      }

      const dx = event.clientX - swipeStart.x;
      const dy = event.clientY - swipeStart.y;
      swipeStart = null;

      if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_THRESHOLD) {
        return;
      }

      const direction =
        Math.abs(dx) > Math.abs(dy)
          ? dx > 0
            ? "right"
            : "left"
          : dy > 0
            ? "down"
            : "up";

      pulseDirection(direction);
      handleDirection(direction);
    });
  }

  function startGame() {
    game = createGame({ startedAt: performance.now() });
    playing = true;
    locked = false;
    ending = false;
    refs.startScreen.hidden = true;
    refs.gameOverScreen.hidden = true;
    refs.feedback.textContent = "";
    refs.feedback.classList.remove("is-visible");
    refs.stage.classList.remove("is-wrong");
    stopComboGauge();
    renderCombo();
    renderGame();
    startTimer();
    audio.ensure();
    audio.startMusic();
    refs.stage.focus({ preventScroll: true });
  }

  function handleDirection(direction) {
    if (!playing || locked || !direction) {
      return;
    }

    const result = submitDirection(game, direction, { now: performance.now() });

    if (result.ignored) {
      if (result.timedOut) {
        renderHud();
        showTimeUpFeedback();
        endGame("time");
      }

      return;
    }

    if (result.correct) {
      locked = true;
      renderHud();
      refs.feedback.textContent = "";
      refs.feedback.classList.remove("is-visible");
      renderCombo();
      startComboGauge();
      audio.playFlip(result.streak);
      flyPaper(result.previousPaper.direction).then(() => {
        if (!playing || game.isGameOver) {
          return;
        }

        renderGame();
        locked = false;
      });
      return;
    }

    renderHud();
    renderCombo();
    stopComboGauge();
    showMistakeFeedback();
    audio.playWrong();

    if (game.isGameOver) {
      endGame("mistake");
    }
  }

  function flyPaper(direction) {
    refs.activePaper.classList.remove("fly-up", "fly-right", "fly-left", "fly-down");
    refs.activePaper.classList.add(`fly-${direction}`);

    return new Promise((resolve) => {
      window.setTimeout(() => {
        refs.activePaper.classList.remove("fly-up", "fly-right", "fly-left", "fly-down");
        resolve();
      }, ANIMATION_MS);
    });
  }

  function showMistakeFeedback() {
    refs.stage.classList.add("is-wrong");
    refs.feedback.textContent = `${game.mistakes}/${game.maxMistakes}`;
    refs.feedback.classList.add("is-visible");

    window.setTimeout(() => {
      refs.stage.classList.remove("is-wrong");

      if (!game.isGameOver) {
        refs.feedback.textContent = "";
        refs.feedback.classList.remove("is-visible");
      }
    }, 420);
  }

  function showTimeUpFeedback() {
    refs.feedback.textContent = "TIME UP";
    refs.feedback.classList.add("is-visible");
  }

  function endGame(reason = "mistake") {
    if (ending) {
      return;
    }

    ending = true;
    playing = false;
    locked = true;
    stopTimer();
    audio.playGameOver();
    audio.stopMusic();

    if (game.score > bestScore) {
      bestScore = game.score;
      writeBestScore(bestScore);
    }

    renderHud();
    renderCombo();
    stopComboGauge();
    refs.gameOverTitle.textContent = reason === "time" ? "시간 종료" : "게임오버";
    refs.finalCleared.textContent = String(game.clearedCount);
    refs.finalScore.textContent = String(game.score);
    refs.finalBest.textContent = String(bestScore);
    refs.finalMaxCombo.textContent = String(game.maxStreak);

    window.setTimeout(() => {
      refs.gameOverScreen.hidden = false;
      refs.restartButton.focus({ preventScroll: true });
    }, 320);
  }

  function renderGame() {
    const paper = game.currentPaper;
    refs.activePaper.dataset.paper = paper.id;
    refs.activePaper.setAttribute("aria-label", `${paper.label} 색종이`);
    refs.paperArrow.textContent = paper.arrow;
    refs.previewPapers.forEach((previewPaper, index) => {
      const upcomingPaper = game.upcomingPapers[index];

      if (upcomingPaper) {
        previewPaper.dataset.paper = upcomingPaper.id;
      }
    });
    renderHud();
    renderCombo();
  }

  function renderHud() {
    refs.timeValue.textContent = formatTime(getRemainingTime(game, performance.now()));
    refs.clearedValue.textContent = String(game.clearedCount);
    refs.scoreValue.textContent = String(game.score);
    refs.bestValue.textContent = String(Math.max(bestScore, game.score));
    refs.maxComboValue.textContent = String(game.maxStreak);

    Array.from(refs.mistakePips.children).forEach((pip, index) => {
      pip.classList.toggle("is-lost", index < game.mistakes);
    });
  }

  function renderCombo() {
    if (game.streak < 2 || game.isGameOver) {
      refs.comboBadge.hidden = true;
      refs.comboBadge.textContent = "";
      refs.comboBadge.classList.remove("is-pop");
      return;
    }

    refs.comboBadge.hidden = false;
    refs.comboBadge.textContent = `x${game.streak} COMBO`;
    refs.comboBadge.classList.remove("is-pop");
    void refs.comboBadge.offsetWidth;
    refs.comboBadge.classList.add("is-pop");
  }

  function startComboGauge() {
    window.cancelAnimationFrame(comboGaugeFrame);
    refs.comboGauge.hidden = false;
    refs.comboGaugeFill.style.transform = "scaleX(1)";

    const tick = () => {
      if (!playing || game.isGameOver || game.lastCorrectAt === null) {
        stopComboGauge();
        return;
      }

      const activeWindowMs = game.currentComboWindowMs || game.comboWindowMs;
      const expiresAt = game.lastCorrectAt + activeWindowMs;
      const remaining = Math.max(0, expiresAt - performance.now());
      const ratio = remaining / activeWindowMs;
      refs.comboGaugeFill.style.transform = `scaleX(${ratio})`;

      if (ratio <= 0) {
        refs.comboGauge.hidden = true;
        refs.comboBadge.hidden = true;
        refs.comboBadge.textContent = "";
        refs.comboBadge.classList.remove("is-pop");
        comboGaugeFrame = 0;
        return;
      }

      comboGaugeFrame = window.requestAnimationFrame(tick);
    };

    comboGaugeFrame = window.requestAnimationFrame(tick);
  }

  function stopComboGauge() {
    window.cancelAnimationFrame(comboGaugeFrame);
    comboGaugeFrame = 0;
    refs.comboGauge.hidden = true;
    refs.comboGaugeFill.style.transform = "scaleX(0)";
  }

  function startTimer() {
    window.cancelAnimationFrame(timerFrame);

    const tick = () => {
      if (!playing || ending) {
        timerFrame = 0;
        return;
      }

      const now = performance.now();

      if (expireGameIfTimeUp(game, now)) {
        renderHud();
        renderCombo();
        stopComboGauge();
        showTimeUpFeedback();
        endGame("time");
        timerFrame = 0;
        return;
      }

      renderHud();
      timerFrame = window.requestAnimationFrame(tick);
    };

    timerFrame = window.requestAnimationFrame(tick);
  }

  function stopTimer() {
    window.cancelAnimationFrame(timerFrame);
    timerFrame = 0;
  }

  function formatTime(remainingMs) {
    return (Math.ceil(remainingMs / 100) / 10).toFixed(1);
  }

  function toggleMute() {
    const muted = audio.toggleMute();
    refs.muteButton.classList.toggle("is-muted", muted);
    refs.muteButton.setAttribute("aria-pressed", String(muted));
    refs.muteButton.setAttribute("aria-label", muted ? "소리 켜기" : "소리 끄기");
  }

  function pulseDirection(direction) {
    const button = document.querySelector(`[data-direction="${direction}"]`);
    if (button) {
      pulseButton(button);
    }
  }

  function pulseButton(button) {
    button.classList.add("is-pressed");
    window.setTimeout(() => button.classList.remove("is-pressed"), 110);
  }

  function readBestScore() {
    try {
      return Number(window.localStorage.getItem(BEST_SCORE_KEY)) || 0;
    } catch (error) {
      return 0;
    }
  }

  function writeBestScore(score) {
    try {
      window.localStorage.setItem(BEST_SCORE_KEY, String(score));
    } catch (error) {
      // Scores are nice to keep, but the game should still run without storage.
    }
  }

  function createAudioController() {
    let context = null;
    let masterGain = null;
    let musicTimer = null;
    let muted = false;
    let noteIndex = 0;
    const musicNotes = [220, 277.18, 329.63, 415.3, 329.63, 277.18];

    function ensure() {
      if (!context) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) {
          return;
        }

        context = new AudioContextClass();
        masterGain = context.createGain();
        masterGain.gain.value = muted ? 0 : 0.58;
        masterGain.connect(context.destination);
      }

      if (context.state === "suspended") {
        context.resume();
      }
    }

    function playTone(frequency, duration, type = "sine", volume = 0.12, delay = 0) {
      if (!context || !masterGain || muted) {
        return;
      }

      const startAt = context.currentTime + delay;
      const oscillator = context.createOscillator();
      const gain = context.createGain();

      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, startAt);
      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
      oscillator.connect(gain);
      gain.connect(masterGain);
      oscillator.start(startAt);
      oscillator.stop(startAt + duration + 0.02);
    }

    function playMusicNote() {
      if (muted || !context) {
        return;
      }

      const note = musicNotes[noteIndex % musicNotes.length];
      noteIndex += 1;
      playTone(note, 0.2, "triangle", 0.12);
      playTone(note * 2, 0.12, "sine", 0.07, 0.05);
    }

    return {
      ensure,
      startMusic() {
        ensure();
        window.clearInterval(musicTimer);
        playMusicNote();
        musicTimer = window.setInterval(playMusicNote, 360);
      },
      stopMusic() {
        window.clearInterval(musicTimer);
        musicTimer = null;
      },
      playFlip(streak = 1) {
        ensure();
        const lift = Math.min(Math.max(streak - 1, 0), 10);
        const pitch = 1 + lift * 0.075;
        const volume = Math.min(0.14 + lift * 0.012, 0.24);

        playTone(500 * pitch, 0.07, "triangle", volume);
        playTone(760 * pitch, 0.09, "triangle", volume * 0.88, 0.04);

        if (streak >= 4) {
          playTone(1120 * pitch, 0.08, "sine", volume * 0.52, 0.085);
        }
      },
      playWrong() {
        ensure();
        playTone(150, 0.16, "sawtooth", 0.08);
        playTone(98, 0.18, "square", 0.05, 0.08);
      },
      playGameOver() {
        ensure();
        playTone(220, 0.15, "triangle", 0.09);
        playTone(164.81, 0.2, "triangle", 0.08, 0.12);
        playTone(130.81, 0.28, "triangle", 0.07, 0.28);
      },
      toggleMute() {
        muted = !muted;

        if (masterGain && context) {
          masterGain.gain.setTargetAtTime(muted ? 0 : 0.58, context.currentTime, 0.02);
        }

        return muted;
      },
    };
  }
})();