# 🎬 MovieRoulette

A movie recommendation service — pick genres, spin the wheel, get a movie suggestion.

## Local Development

```bash
npm install
npm start
```

Then open:
- **App** → http://localhost:3000
- **API Docs** → http://localhost:3000/docs

## Deploy to Render (Free)

1. Push this repo to GitHub
2. Go to https://render.com → New → Web Service
3. Connect your GitHub repo
4. Settings:
   - **Build command:** `npm install`
   - **Start command:** `node server.js`
5. Add a **Disk** (under Advanced):
   - Mount path: `/app/db`
   - Size: 1 GB
6. Deploy!

> The SQLite database auto-creates and seeds on first run.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/genres` | List all genres |
| POST | `/api/genres` | Add a genre |
| GET | `/api/genres/:id/movies` | All movies in a genre |
| GET | `/api/genres/:id/random` | Random movie from a genre |
| GET | `/api/movies/random` | Random movie from all |
| GET | `/api/movies/spin?genre_ids=1,2` | Spin with genre filter |
| GET | `/api/movies/:id` | Get movie by ID |
| POST | `/api/movies` | Add a movie |
| POST | `/api/movies/:id/genres` | Assign movie to genre |
| POST | `/api/movies/:id/vote` | Upvote or downvote |

Full docs at `/docs` (Swagger UI).

## Tech Stack

- **Node.js + Express** — API server
- **better-sqlite3** — embedded SQLite database
- **swagger-ui-express + yamljs** — OpenAPI docs
- **Vanilla HTML/CSS/JS** — frontend (no framework needed)
