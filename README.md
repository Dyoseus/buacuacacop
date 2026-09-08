# Bầu Cua Cá Cọp — VSA Game Night

A single-page, no-build static site. One page runs the whole thing: setup,
betting on a visual mat, rolling the dice, and the final winner.

- `index.html` — the page
- `style.css` — the festive board theme
- `app.js` — all the game logic

## How it plays

1. **Setup** — pick number of teams (2–8), starting balance (defaults to
   $500), optional team names.
2. **Betting** — switch between teams with the pills at the top, then type
   bet amounts right on the mat tiles (Bầu, Cua, Tôm, Cá, Gà, Cọp). Every
   team's placed bets show up as small colored chips on the tiles, so it
   reads like everyone's money is sitting on the board at once.
3. **Roll** — three dice spin in the bowl above the mat, then land.
   Winning tiles glow gold with a "×N" badge for how many dice hit them.
4. **Payouts** — each team wins bet × (dice showing that symbol), or loses
   the bet if none hit. Leaderboard updates instantly.
5. Repeat for as many rounds as you want, then "End game" to reveal the
   winner.

Everything runs in the browser — no backend, no login, no data leaves the
page.

## Deploying to GitHub Pages

1. Create a new GitHub repo.
2. Add these three files to the repo root and push:
   ```
   git init
   git add .
   git commit -m "Bau Cua Ca Cop game night board"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<repo-name>.git
   git push -u origin main
   ```
3. In the repo, go to **Settings → Pages**.
4. Under **Build and deployment**, set **Source** to "Deploy from a
   branch", branch `main`, folder `/ (root)`, then **Save**.
5. Your site goes live at `https://<your-username>.github.io/<repo-name>/`
   within a minute or two.

No build step, no dependencies — just open `index.html` locally to test,
or push it straight to Pages.
