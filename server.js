const express = require('express');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const { initDb } = require('./db/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Init DB
const db = initDb();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Load OpenAPI spec
const swaggerDocument = YAML.load(path.join(__dirname, 'openapi.yaml'));
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'MovieRoulette API Docs'
}));

// ─── Helper ──────────────────────────────────────────────────────────────────
function enrichMovie(movie) {
  if (!movie) return null;
  const genres = db.prepare(`
    SELECT g.id, g.name FROM genres g
    JOIN movie_genres mg ON mg.genre_id = g.id
    WHERE mg.movie_id = ?
  `).all(movie.id);
  return { ...movie, genres };
}

// ─── Routes ──────────────────────────────────────────────────────────────────

// GET /api/genres — list all genres
app.get('/api/genres', (req, res) => {
  const genres = db.prepare('SELECT * FROM genres ORDER BY name').all();
  res.json(genres);
});

// POST /api/genres — add a new genre
app.post('/api/genres', (req, res) => {
  const { name } = req.body;
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Genre name is required' });
  }
  try {
    const result = db.prepare('INSERT INTO genres (name) VALUES (?)').run(name.trim());
    const genre = db.prepare('SELECT * FROM genres WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(genre);
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'Genre already exists' });
    throw e;
  }
});

// GET /api/movies/random — random movie from all
app.get('/api/movies/random', (req, res) => {
  const movie = db.prepare('SELECT * FROM movies ORDER BY RANDOM() LIMIT 1').get();
  if (!movie) return res.status(404).json({ error: 'No movies found' });
  res.json(enrichMovie(movie));
});

// GET /api/genres/:id/random — random movie from a genre
app.get('/api/genres/:id/random', (req, res) => {
  const genre = db.prepare('SELECT * FROM genres WHERE id = ?').get(req.params.id);
  if (!genre) return res.status(404).json({ error: 'Genre not found' });

  const movie = db.prepare(`
    SELECT m.* FROM movies m
    JOIN movie_genres mg ON mg.movie_id = m.id
    WHERE mg.genre_id = ?
    ORDER BY RANDOM() LIMIT 1
  `).get(req.params.id);

  if (!movie) return res.status(404).json({ error: 'No movies in this genre' });
  res.json(enrichMovie(movie));
});

// GET /api/genres/:id/movies — all movies in a genre
app.get('/api/genres/:id/movies', (req, res) => {
  const genre = db.prepare('SELECT * FROM genres WHERE id = ?').get(req.params.id);
  if (!genre) return res.status(404).json({ error: 'Genre not found' });

  const movies = db.prepare(`
    SELECT m.* FROM movies m
    JOIN movie_genres mg ON mg.movie_id = m.id
    WHERE mg.genre_id = ?
    ORDER BY m.title
  `).all(req.params.id);

  res.json({ genre, movies: movies.map(enrichMovie) });
});

// GET /api/movies/spin — spin with optional genre filter (used by frontend)
app.get('/api/movies/spin', (req, res) => {
  const { genre_ids } = req.query; // comma-separated

  let movie;
  if (genre_ids) {
    const ids = genre_ids.split(',').map(Number).filter(Boolean);
    if (ids.length === 0) return res.status(400).json({ error: 'Invalid genre_ids' });

    const placeholders = ids.map(() => '?').join(',');
    movie = db.prepare(`
      SELECT m.*, COUNT(DISTINCT mg.genre_id) as match_count
      FROM movies m
      JOIN movie_genres mg ON mg.movie_id = m.id
      WHERE mg.genre_id IN (${placeholders})
      GROUP BY m.id
      ORDER BY RANDOM()
      LIMIT 1
    `).get(...ids);
  } else {
    movie = db.prepare('SELECT * FROM movies ORDER BY RANDOM() LIMIT 1').get();
  }

  if (!movie) return res.status(404).json({ error: 'No movies found for selected genres' });
  res.json(enrichMovie(movie));
});

// GET /api/movies/:id — single movie by id
app.get('/api/movies/:id', (req, res) => {
  const movie = db.prepare('SELECT * FROM movies WHERE id = ?').get(req.params.id);
  if (!movie) return res.status(404).json({ error: 'Movie not found' });
  res.json(enrichMovie(movie));
});

// POST /api/movies — add a new movie
app.post('/api/movies', (req, res) => {
  const { title, year, director, description, genre_ids } = req.body;
  if (!title || !year || !director || !description) {
    return res.status(400).json({ error: 'title, year, director, and description are required' });
  }
  const result = db.prepare(
    'INSERT INTO movies (title, year, director, description) VALUES (?, ?, ?, ?)'
  ).run(title, year, director, description);

  const id = result.lastInsertRowid;
  if (Array.isArray(genre_ids)) {
    const link = db.prepare('INSERT OR IGNORE INTO movie_genres (movie_id, genre_id) VALUES (?, ?)');
    for (const gid of genre_ids) link.run(id, gid);
  }

  const movie = db.prepare('SELECT * FROM movies WHERE id = ?').get(id);
  res.status(201).json(enrichMovie(movie));
});

// POST /api/movies/:id/genres — assign existing movie to additional genre
app.post('/api/movies/:id/genres', (req, res) => {
  const movie = db.prepare('SELECT * FROM movies WHERE id = ?').get(req.params.id);
  if (!movie) return res.status(404).json({ error: 'Movie not found' });

  const { genre_id } = req.body;
  if (!genre_id) return res.status(400).json({ error: 'genre_id is required' });

  const genre = db.prepare('SELECT * FROM genres WHERE id = ?').get(genre_id);
  if (!genre) return res.status(404).json({ error: 'Genre not found' });

  try {
    db.prepare('INSERT INTO movie_genres (movie_id, genre_id) VALUES (?, ?)').run(req.params.id, genre_id);
    res.json(enrichMovie(db.prepare('SELECT * FROM movies WHERE id = ?').get(req.params.id)));
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'Movie already in this genre' });
    throw e;
  }
});

// POST /api/movies/:id/vote — upvote or downvote
app.post('/api/movies/:id/vote', (req, res) => {
  const movie = db.prepare('SELECT * FROM movies WHERE id = ?').get(req.params.id);
  if (!movie) return res.status(404).json({ error: 'Movie not found' });

  const { vote } = req.body;
  if (vote !== 'up' && vote !== 'down') {
    return res.status(400).json({ error: 'vote must be "up" or "down"' });
  }

  const col = vote === 'up' ? 'upvotes' : 'downvotes';
  db.prepare(`UPDATE movies SET ${col} = ${col} + 1 WHERE id = ?`).run(req.params.id);
  const updated = db.prepare('SELECT * FROM movies WHERE id = ?').get(req.params.id);
  res.json({ id: updated.id, upvotes: updated.upvotes, downvotes: updated.downvotes });
});

// Fallback to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🎬 MovieRoulette running at http://localhost:${PORT}`);
  console.log(`📖 API docs at http://localhost:${PORT}/docs`);
});
