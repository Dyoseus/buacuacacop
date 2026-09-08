const SYMBOLS = [
  { id: "bau", label: "Bầu", emoji: "🍈" },
  { id: "cua", label: "Cua", emoji: "🦀" },
  { id: "tom", label: "Tôm", emoji: "🦐" },
  { id: "ca", label: "Cá", emoji: "🐟" },
  { id: "ga", label: "Gà", emoji: "🐓" },
  { id: "cop", label: "Cọp", emoji: "🐯" },
];

const TEAM_COLORS = ["#5AC8FA", "#4E9C6D", "#E4738C", "#F2A65A", "#9B8AFB", "#5CD6C0", "#E4B33D", "#EF6461"];

function randSymbol() {
  return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)].id;
}
function symbolById(id) {
  return SYMBOLS.find((s) => s.id === id);
}
function fmt(n) {
  return (n < 0 ? "-$" : "$") + Math.abs(n);
}
function escapeHTML(str) {
  const d = document.createElement("div");
  d.textContent = str == null ? "" : str;
  return d.innerHTML;
}
function computePayout(teamBets, diceFinal) {
  let net = 0;
  const details = [];
  SYMBOLS.forEach((sym) => {
    const bet = (teamBets && teamBets[sym.id]) || 0;
    if (bet <= 0) return;
    const count = diceFinal.filter((d) => d === sym.id).length;
    const change = count > 0 ? bet * count : -bet;
    net += change;
    details.push({ symbol: sym, bet, count, change });
  });
  return { net, details };
}

const app = document.getElementById("app");

let config = { teamCount: 5, startBalance: 500, names: ["", "", "", "", "", "", "", ""] };
let state = { phase: "setup" };
let bets = {}; // teamId -> { symId: amount }
let activeTeamId = null;
let spinTimer = null;

function render() {
  if (state.phase === "betting") renderBetting();
  else if (state.phase === "rolling") renderRolling();
  else if (state.phase === "result") renderResult();
  else if (state.phase === "final") renderFinal();
  else renderSetup();
}

function header(extra) {
  return `
    <div class="shell">
      <h1 class="title">Bầu Cua Cá Cọp</h1>
      <div class="subtitle">VSA Game Night</div>
      ${extra || ""}
  `;
}

function leaderboardHTML() {
  const sorted = [...state.teams].sort((a, b) => b.balance - a.balance);
  return `<div class="round-badge">Round ${state.round}</div>
    <div class="leaderboard">
      ${sorted
        .map(
          (t, i) => `
        <div class="lb-card">
          <div class="lb-rank">#${i + 1}</div>
          <div class="lb-name">${escapeHTML(t.name)}</div>
          <div class="lb-balance">${fmt(t.balance)}</div>
        </div>`
        )
        .join("")}
    </div>`;
}

/* ---------------- Setup ---------------- */

function renderSetup() {
  app.innerHTML =
    header() +
    `
      <div class="panel">
        <label>Number of teams</label>
        <div class="pill-group" id="teamCountPills">
          ${[2, 3, 4, 5, 6, 7, 8]
            .map((n) => `<button class="pill ${config.teamCount === n ? "active" : ""}" data-count="${n}">${n}</button>`)
            .join("")}
        </div>
        <div style="margin-top:18px;">
          <label>Starting balance per team</label>
          <input type="number" id="startBalance" style="width:120px" value="${config.startBalance}">
        </div>
        <div style="margin-top:18px;">
          <label>Team names (optional — defaults to "Team 1", "Team 2"...)</label>
          <div class="name-grid" id="nameGrid">
            ${Array.from({ length: config.teamCount })
              .map((_, i) => `<input type="text" data-name-idx="${i}" placeholder="Team ${i + 1}" value="${escapeHTML(config.names[i] || "")}">`)
              .join("")}
          </div>
        </div>
        <div class="actions">
          <button class="btn" id="startGameBtn">Start game</button>
        </div>
      </div>
    </div>`;

  document.querySelectorAll("#teamCountPills .pill").forEach((btn) => {
    btn.addEventListener("click", () => {
      config.teamCount = Number(btn.dataset.count);
      renderSetup();
    });
  });
  document.getElementById("startBalance").addEventListener("input", (e) => {
    config.startBalance = Math.max(0, Number(e.target.value) || 0);
  });
  document.querySelectorAll("[data-name-idx]").forEach((inp) => {
    inp.addEventListener("input", (e) => {
      config.names[Number(e.target.dataset.nameIdx)] = e.target.value;
    });
  });
  document.getElementById("startGameBtn").addEventListener("click", startGame);
}

function startGame() {
  const teams = Array.from({ length: config.teamCount }, (_, i) => ({
    id: "team" + i,
    name: (config.names[i] || "").trim() || "Team " + (i + 1),
    balance: config.startBalance,
    color: TEAM_COLORS[i % TEAM_COLORS.length],
  }));
  state = { phase: "betting", round: 1, teams, dice: null, lastResult: null };
  bets = {};
  activeTeamId = teams[0].id;
  render();
}

/* ---------------- Betting / the board ---------------- */

function totalBet(teamId) {
  const tb = bets[teamId] || {};
  return SYMBOLS.reduce((s, sym) => s + (tb[sym.id] || 0), 0);
}

function chipsForSymbol(symId) {
  return state.teams
    .filter((t) => (bets[t.id] || {})[symId] > 0)
    .map((t) => ({ team: t, amount: bets[t.id][symId] }));
}

function teamSwitchHTML() {
  return `<div class="team-switch">
    ${state.teams
      .map(
        (t) => `
      <button class="team-pill ${t.id === activeTeamId ? "active" : ""}" style="--team-color:${t.color}" data-team="${t.id}">
        <span class="dot"></span>${escapeHTML(t.name)} · ${fmt(t.balance - totalBet(t.id))} left
      </button>`
      )
      .join("")}
  </div>`;
}

function bowlHTML() {
  if (state.phase === "rolling") {
    return `<div class="bowl-row">${[0, 1, 2].map(() => `<div class="die spin">🍈</div>`).join("")}</div>`;
  }
  if (state.phase === "result" && state.dice) {
    return `<div class="bowl-row">${state.dice.map((d) => `<div class="die">${symbolById(d).emoji}</div>`).join("")}</div>`;
  }
  return `<div class="bowl-row">${[0, 1, 2].map(() => `<div class="die empty">?</div>`).join("")}</div>`;
}

function matHTML(opts) {
  const editable = !!opts.editable;
  const hitCounts = opts.hitCounts || null; // {symId: count}
  return `<div class="mat"><div class="mat-grid">
    ${SYMBOLS.map((s) => {
      const chips = chipsForSymbol(s.id);
      const hit = hitCounts && hitCounts[s.id] > 0;
      const activeBet = (bets[activeTeamId] && bets[activeTeamId][s.id]) || 0;
      return `<div class="mat-tile ${hit ? "hit" : ""}" data-sym="${s.id}">
        <div class="mat-emoji">${s.emoji}</div>
        <div class="mat-label">${s.label}</div>
        ${hit ? `<div class="mat-hit-badge">×${hitCounts[s.id]}</div>` : ""}
        ${
          editable
            ? `<input type="text" inputmode="numeric" pattern="[0-9]*" class="mat-input" data-sym="${s.id}" value="${activeBet}">`
            : ""
        }
        <div class="mat-chips">
          ${chips
            .map(
              (c) =>
                `<span class="mat-chip" style="--chip-color:${c.team.color}"><span class="chip-dot"></span>${escapeHTML(c.team.name)}: ${fmt(c.amount)}</span>`
            )
            .join("")}
        </div>
      </div>`;
    }).join("")}
  </div></div>`;
}

function canRoll() {
  return state.teams.every((t) => totalBet(t.id) <= t.balance) && state.teams.some((t) => totalBet(t.id) > 0);
}

function renderBetting() {
  const activeTeam = state.teams.find((t) => t.id === activeTeamId);
  app.innerHTML =
    header(leaderboardHTML()) +
    `
      <div class="panel">
        <h3 style="font-size:1.05rem;color:var(--gold-bright);">Round ${state.round} — place your bets</h3>
        ${teamSwitchHTML()}
        ${bowlHTML()}
        ${matHTML({ editable: true })}
        <div class="active-team-bar">
          <span>Betting as <strong>${escapeHTML(activeTeam.name)}</strong> — total bet ${fmt(totalBet(activeTeamId))}, ${
      totalBet(activeTeamId) > activeTeam.balance
        ? `<span style="color:var(--red)">over by ${fmt(totalBet(activeTeamId) - activeTeam.balance)}</span>`
        : `${fmt(activeTeam.balance - totalBet(activeTeamId))} left`
    }</span>
          <button class="btn small secondary" id="clearBetsBtn">Clear this team's bets</button>
        </div>
        <div class="actions">
          <button class="btn" id="rollBtn" ${canRoll() ? "" : "disabled"}>Roll the dice</button>
          <button class="btn secondary" id="endBtn">End game now</button>
        </div>
      </div>
    </div>`;

  document.querySelectorAll(".team-pill").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeTeamId = btn.dataset.team;
      renderBetting();
    });
  });
  document.querySelectorAll(".mat-input").forEach((inp) => {
    inp.addEventListener("input", (e) => {
      const symId = e.target.dataset.sym;
      const digitsOnly = e.target.value.replace(/[^0-9]/g, "");
      const v = Math.max(0, Number(digitsOnly) || 0);
      bets[activeTeamId] = { ...(bets[activeTeamId] || {}), [symId]: v };
      renderBetting();
      // restore focus/cursor to the end of the field being edited
      const again = document.querySelector(`.mat-input[data-sym="${symId}"]`);
      if (again) {
        again.focus();
        const pos = String(v).length;
        try {
          again.setSelectionRange(pos, pos);
        } catch (err) {
          /* some input types don't support this; safe to ignore */
        }
      }
    });
  });
  document.getElementById("clearBetsBtn").addEventListener("click", () => {
    bets[activeTeamId] = {};
    renderBetting();
  });
  document.getElementById("rollBtn").addEventListener("click", rollDice);
  document.getElementById("endBtn").addEventListener("click", endGame);
}

function rollDice() {
  const final = [randSymbol(), randSymbol(), randSymbol()];
  const perTeam = {};
  const updatedTeams = state.teams.map((t) => {
    const r = computePayout(bets[t.id], final);
    perTeam[t.id] = r;
    return { ...t, balance: t.balance + r.net };
  });

  state = { ...state, phase: "rolling" };
  render();

  let ticks = 0;
  clearInterval(spinTimer);
  spinTimer = setInterval(() => {
    document.querySelectorAll(".bowl-row .die").forEach((el) => {
      el.textContent = symbolById(randSymbol()).emoji;
    });
    ticks++;
    if (ticks >= 16) {
      clearInterval(spinTimer);
      state = {
        ...state,
        phase: "result",
        dice: final,
        lastResult: { dice: final, perTeam },
        teams: updatedTeams,
      };
      render();
    }
  }, 80);
}

function renderRolling() {
  app.innerHTML =
    header(leaderboardHTML()) +
    `
      <div class="panel">
        ${bowlHTML()}
        ${matHTML({ editable: false })}
      </div>
    </div>`;
}

function renderResult() {
  const r = state.lastResult;
  const hitCounts = {};
  r.dice.forEach((d) => (hitCounts[d] = (hitCounts[d] || 0) + 1));

  app.innerHTML =
    header(leaderboardHTML()) +
    `
      <div class="panel">
        ${bowlHTML()}
        ${matHTML({ editable: false, hitCounts })}
        <div class="result-grid">
          ${state.teams
            .map((t) => {
              const rt = r.perTeam[t.id];
              if (!rt || rt.details.length === 0) return "";
              return `<div class="result-card">
                <div class="result-name">${escapeHTML(t.name)}</div>
                <div class="result-net ${rt.net >= 0 ? "net-pos" : "net-neg"}">${rt.net >= 0 ? "+" : ""}${fmt(rt.net)}</div>
                ${rt.details
                  .map((d) => `<div class="detail-line">${d.symbol.emoji} ${d.symbol.label}: bet ${fmt(d.bet)}, hit ${d.count}×</div>`)
                  .join("")}
              </div>`;
            })
            .join("")}
        </div>
        <div class="actions">
          <button class="btn" id="nextRoundBtn">Next round</button>
          <button class="btn secondary" id="endBtn">End game</button>
        </div>
      </div>
    </div>`;
  document.getElementById("nextRoundBtn").addEventListener("click", nextRound);
  document.getElementById("endBtn").addEventListener("click", endGame);
}

function nextRound() {
  bets = {};
  state = { ...state, phase: "betting", round: state.round + 1 };
  render();
}

function endGame() {
  state = { ...state, phase: "final" };
  render();
}

function renderFinal() {
  const sorted = [...state.teams].sort((a, b) => b.balance - a.balance);
  app.innerHTML =
    header() +
    `
      <div class="panel">
        <div class="winner-card">
          <div class="crown">👑</div>
          <div class="winner-name">${escapeHTML(sorted[0].name)}</div>
          <div class="winner-balance">${fmt(sorted[0].balance)}</div>
        </div>
        <div class="final-list">
          ${sorted.map((t, i) => `<div class="final-row"><span>#${i + 1} ${escapeHTML(t.name)}</span><span>${fmt(t.balance)}</span></div>`).join("")}
        </div>
        <div class="actions">
          <button class="btn" id="newGameBtn">New game</button>
        </div>
      </div>
    </div>`;
  document.getElementById("newGameBtn").addEventListener("click", () => {
    state = { phase: "setup" };
    render();
  });
}

render();
