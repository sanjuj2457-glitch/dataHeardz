// enhancements/enhancements.js
// Self-contained module for the Wellness Journey.

(function () {
    "use strict";

    var STORAGE_KEY = "dhz_journey_state_v1";

    function onReady(fn) {
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", fn);
        } else {
            fn();
        }
    }

    onReady(function () {
        var root = document.getElementById("dhz-journey");
        if (!root) return;

        var shell = root.querySelector(".dhz-j-shell");
        var moodsWrap = root.querySelector("#dhz-j-moods");
        var goalsWrap = root.querySelector("#dhz-j-goals");
        var stepsList = root.querySelector("#dhz-j-steps");
        var progressFill = root.querySelector("#dhz-j-progress-fill");
        var progressText = root.querySelector("#dhz-j-progress-text");
        var scoreEl = root.querySelector("#dhz-j-score-value");
        var tipText = root.querySelector("#dhz-j-tip-text");
        var tipNext = root.querySelector("#dhz-j-tip-next");
        var seedCore = root.querySelector("#dhz-j-seed-core");

        var productTag = root.querySelector("#dhz-j-product-tag");
        var productTitle = root.querySelector("#dhz-j-product-title");
        var productCopy = root.querySelector("#dhz-j-product-copy");
        var productLink = root.querySelector("#dhz-j-product-link");

        var constellation = root.querySelector(".dhz-j-constellation");

        if (!shell || !moodsWrap || !goalsWrap || !stepsList) {
            return;
        }

        // --- Data ---

        var tips = [
            "Drink a full glass of water in the next 30 minutes to kick-start your energy.",
            "Move your body for 3–5 minutes every hour: stretch, walk, or do a few squats.",
            "Pick one 45-minute block today to silence every non-essential notification.",
            "Swap one ultra-processed snack for nuts, fruit, or a simple yogurt.",
            "Get indirect sunlight in your eyes within the first hour after waking to support your rhythm.",
            "Write down one thing you're grateful for before bed to help your brain unwind.",
            "Take six slow breaths, in through the nose and out through the mouth, to calm your system quickly."
        ];

        var products = {
            energy: {
                tag: "Energy",
                title: "Clean Energy Kit",
                copy: "Steady, clean daily energy so you can show up sharper without a harsh caffeine crash.",
                href: "dataheardz-life.html#clean-energy"
            },
            focus: {
                tag: "Focus",
                title: "Focus & Clarity Stack",
                copy: "Supports sharper focus and better deep-work sessions for demanding days.",
                href: "dataheardz-life.html#focus-clarity"
            },
            sleep: {
                tag: "Sleep",
                title: "Deep Sleep Ritual",
                copy: "Helps you wind down and support deeper, more restorative sleep.",
                href: "dataheardz-life.html#sleep-ritual"
            },
            immune: {
                tag: "Immune",
                title: "Immune Defense Pack",
                copy: "Built to support your immune system through busy and stressful seasons.",
                href: "dataheardz-life.html#immune-defense"
            },
            mixed: {
                tag: "Balanced",
                title: "Daily Foundations Bundle",
                copy: "A simple, balanced base stack for people resetting their wellness routine.",
                href: "dataheardz-life.html#foundations"
            }
        };

        var stepTemplates = {
            energy: [
                "Walk for 5–8 minutes after your next meal.",
                "Drink a full glass of water instead of another coffee.",
                "Do 10 slow bodyweight squats or push-ups."
            ],
            focus: [
                "Set one 25-minute focus block with your phone in another room.",
                "Write down the top three tasks you must complete today.",
                "Close all browser tabs that are not part of your main task."
            ],
            sleep: [
                "Pick a screen-off time 30 minutes earlier than usual tonight.",
                "Do a 3-minute stretch before getting into bed.",
                "Dim your lights 1 hour before sleep if you can."
            ],
            immune: [
                "Add one serving of colorful vegetables to your next meal.",
                "Take a 10-minute walk outside or near a window.",
                "Wash your hands intentionally before your next snack or meal."
            ]
        };

        // --- State ---

        var state = loadState();
        applyStateToUI();

        // --- Reveal animation (for widget + content cards) ---

        var revealItems = root.querySelectorAll(".dhz-j-reveal, .dhz-content-reveal");
        if (revealItems.length) {
            var observer = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        entry.target.classList.add("is-visible");
                        observer.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.25 });

            revealItems.forEach(function (el) {
                observer.observe(el);
            });
        }

        // --- Events ---

        moodsWrap.addEventListener("click", function (e) {
            var btn = e.target.closest(".dhz-j-mood-btn");
            if (!btn) return;
            var mood = btn.getAttribute("data-mood");
            if (!mood) return;

            state.mood = mood;
            saveState();
            updateMoodUI();
            updateScore();
        });

        goalsWrap.addEventListener("click", function (e) {
            var pill = e.target.closest(".dhz-j-goal-pill");
            if (!pill) return;
            var goal = pill.getAttribute("data-goal");
            if (!goal) return;

            if (!state.goals) state.goals = [];

            var idx = state.goals.indexOf(goal);
            if (idx === -1) {
                state.goals.push(goal);
                pill.classList.add("is-selected");
            } else {
                state.goals.splice(idx, 1);
                pill.classList.remove("is-selected");
            }

            // Ensure at least one goal
            if (state.goals.length === 0) {
                state.goals.push("energy");
                var energyPill = goalsWrap.querySelector('[data-goal="energy"]');
                if (energyPill) energyPill.classList.add("is-selected");
            }

            state.completed = [];
            saveState();
            buildSteps();
            updateProgress();
            updateSeed();
            updateProductSuggestion();
            updateConstellation();
        });

        stepsList.addEventListener("change", function (e) {
            var cb = e.target;
            if (cb.tagName !== "INPUT" || cb.type !== "checkbox") return;
            var index = parseInt(cb.getAttribute("data-index"), 10);
            if (isNaN(index)) return;

            var completed = state.completed || [];
            var pos = completed.indexOf(index);

            if (cb.checked) {
                if (pos === -1) completed.push(index);
                cb.closest(".dhz-j-step").classList.add("dhz-j-step--done");
            } else {
                if (pos !== -1) completed.splice(pos, 1);
                cb.closest(".dhz-j-step").classList.remove("dhz-j-step--done");
            }

            state.completed = completed;
            saveState();
            updateProgress();
            updateSeed();
            updateScore();
        });

        if (tipNext) {
            tipNext.addEventListener("click", function () {
                var nextIndex = (state.tipIndex || 0) + 1;
                if (nextIndex >= tips.length) nextIndex = 0;
                state.tipIndex = nextIndex;
                saveState();
                renderTip();
            });
        }

        // --- Functions ---

        function loadState() {
            var todayKey = getTodayKey();
            try {
                var raw = localStorage.getItem(STORAGE_KEY);
                if (!raw) {
                    return {
                        mood: "low",
                        goals: ["energy"],
                        completed: [],
                        day: todayKey,
                        tipIndex: 0
                    };
                }
                var parsed = JSON.parse(raw);
                if (!parsed || parsed.day !== todayKey) {
                    return {
                        mood: parsed && parsed.mood ? parsed.mood : "low",
                        goals: parsed && parsed.goals && parsed.goals.length ? parsed.goals : ["energy"],
                        completed: [],
                        day: todayKey,
                        tipIndex: parsed && typeof parsed.tipIndex === "number" ? parsed.tipIndex : 0
                    };
                }
                if (!parsed.goals || !parsed.goals.length) {
                    parsed.goals = ["energy"];
                }
                if (!Array.isArray(parsed.completed)) {
                    parsed.completed = [];
                }
                return parsed;
            } catch (e) {
                return {
                    mood: "low",
                    goals: ["energy"],
                    completed: [],
                    day: todayKey,
                    tipIndex: 0
                };
            }
        }

        function saveState() {
            state.day = getTodayKey();
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
            } catch (e) {
                // ignore
            }
        }

        function getTodayKey() {
            var d = new Date();
            return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
        }

        function applyStateToUI() {
            updateMoodUI();
            restoreGoalsSelection();
            buildSteps();
            updateProgress();
            updateSeed();
            updateScore();
            updateProductSuggestion();
            updateConstellation();
            renderTip();
        }

        function updateMoodUI() {
            var moodBtns = moodsWrap.querySelectorAll(".dhz-j-mood-btn");
            moodBtns.forEach(function (btn) {
                var m = btn.getAttribute("data-mood");
                btn.classList.toggle("is-active", m === state.mood);
            });
            shell.setAttribute("data-mood", state.mood);
        }

        function restoreGoalsSelection() {
            var pills = goalsWrap.querySelectorAll(".dhz-j-goal-pill");
            pills.forEach(function (pill) {
                var g = pill.getAttribute("data-goal");
                pill.classList.toggle("is-selected", state.goals.indexOf(g) !== -1);
            });
        }

        function buildSteps() {
            stepsList.innerHTML = "";

            var chosen = buildStepListFromGoals(state.goals);
            state.totalSteps = chosen.length;

            chosen.forEach(function (text, index) {
                var li = document.createElement("li");
                li.className = "dhz-j-step";

                var isDone = state.completed.indexOf(index) !== -1;
                if (isDone) {
                    li.classList.add("dhz-j-step--done");
                }

                li.innerHTML =
                    '<input type="checkbox" ' +
                    (isDone ? "checked" : "") +
                    ' data-index="' + index + '">' +
                    '<div class="dhz-j-step-main">' + text + "</div>";

                stepsList.appendChild(li);
            });
        }

        function buildStepListFromGoals(goals) {
            if (!goals || !goals.length) goals = ["energy"];

            var combined = [];
            goals.forEach(function (g) {
                var arr = stepTemplates[g];
                if (arr) {
                    arr.forEach(function (step) {
                        combined.push({ goal: g, text: step });
                    });
                }
            });

            if (!combined.length) {
                return [
                    "Take a 5-minute walk and drink a glass of water.",
                    "Decide on one main task for today and write it down.",
                    "Turn your phone to do-not-disturb for 25 minutes."
                ];
            }

            combined.sort(function () {
                return Math.random() - 0.5;
            });

            var uniqueTexts = [];
            var selected = [];
            for (var i = 0; i < combined.length && selected.length < 3; i++) {
                if (uniqueTexts.indexOf(combined[i].text) === -1) {
                    uniqueTexts.push(combined[i].text);
                    selected.push(combined[i].text);
                }
            }

            return selected;
        }

        function updateProgress() {
            var done = (state.completed || []).length;
            var total = state.totalSteps || 3;
            if (done > total) done = total;
            var pct = total ? (done / total) * 100 : 0;

            if (progressFill) {
                progressFill.style.width = pct + "%";
            }
            if (progressText) {
                progressText.textContent = done + " of " + total + " done";
            }
        }

        function updateSeed() {
            if (!seedCore) return;
            var done = (state.completed || []).length;
            var total = state.totalSteps || 3;
            var fraction = total ? done / total : 0;
            var scale = 0.6 + fraction * 0.6; // grows from 0.6 to 1.2
            seedCore.style.transform = "scale(" + scale.toFixed(2) + ")";
        }

        function updateScore() {
            if (!scoreEl) return;

            var base;
            if (state.mood === "low") base = 55;
            else if (state.mood === "ok") base = 72;
            else base = 86;

            var done = (state.completed || []).length;
            var total = state.totalSteps || 3;
            var bonus = total ? Math.round((done / total) * 10) : 0;
            var finalScore = Math.max(40, Math.min(99, base + bonus));

            animateNumber(scoreEl, finalScore);
        }

        function animateNumber(el, target) {
            var start = parseInt(el.textContent || "0", 10);
            if (isNaN(start)) start = 0;
            var startTime = null;
            var duration = 700;

            function step(ts) {
                if (!startTime) startTime = ts;
                var progress = Math.min((ts - startTime) / duration, 1);
                var value = Math.round(start + (target - start) * progress);
                el.textContent = value;
                if (progress < 1) {
                    window.requestAnimationFrame(step);
                }
            }

            window.requestAnimationFrame(step);
        }

        function updateProductSuggestion() {
            var goals = state.goals || ["energy"];
            var key;

            if (goals.length === 1) {
                key = goals[0];
            } else if (goals.indexOf("energy") !== -1 && goals.indexOf("focus") !== -1) {
                key = "focus";
            } else if (goals.indexOf("sleep") !== -1 && goals.indexOf("immune") !== -1) {
                key = "immune";
            } else {
                key = "mixed";
            }

            var prod = products[key] || products.mixed;

            if (productTag) productTag.textContent = prod.tag;
            if (productTitle) productTitle.textContent = prod.title;
            if (productCopy) productCopy.textContent = prod.copy;
            if (productLink) productLink.setAttribute("href", prod.href);
        }

        function updateConstellation() {
            if (!constellation) return;
            var goals = state.goals || ["energy"];

            var classes = ["energy", "focus", "sleep", "immune"].map(function (g) {
                return "dhz-j-constellation--" + g;
            });
            classes.forEach(function (cl) {
                constellation.classList.remove(cl);
            });

            goals.forEach(function (g) {
                constellation.classList.add("dhz-j-constellation--" + g);
            });
        }

        function renderTip() {
            if (!tipText) return;
            var index = state.tipIndex || 0;
            if (index < 0 || index >= tips.length) index = 0;
            tipText.textContent = tips[index];
        }
    });
})();
