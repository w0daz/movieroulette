const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'movieroulette.db');

function initDb() {
  const db = new Database(DB_PATH);

  db.exec(`
    PRAGMA journal_mode=WAL;

    CREATE TABLE IF NOT EXISTS genres (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS movies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      year INTEGER NOT NULL,
      description TEXT NOT NULL,
      director TEXT NOT NULL,
      upvotes INTEGER DEFAULT 0,
      downvotes INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS movie_genres (
      movie_id INTEGER NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
      genre_id INTEGER NOT NULL REFERENCES genres(id) ON DELETE CASCADE,
      PRIMARY KEY (movie_id, genre_id)
    );
  `);

  // Seed genres
  const genres = ['Action', 'Comedy', 'Drama', 'Horror', 'Sci-Fi', 'Thriller', 'Romance', 'Animation'];
  const insertGenre = db.prepare('INSERT OR IGNORE INTO genres (name) VALUES (?)');
  for (const g of genres) insertGenre.run(g);

  // Seed movies
  const movies = [
    { title: 'Inception', year: 2010, director: 'Christopher Nolan', description: 'A thief who steals corporate secrets through dream-sharing technology is given a chance to have his criminal history erased.', genres: ['Action', 'Sci-Fi', 'Thriller'] },
    { title: 'The Dark Knight', year: 2008, director: 'Christopher Nolan', description: 'Batman faces the Joker, a criminal mastermind who plunges Gotham into anarchy.', genres: ['Action', 'Thriller', 'Drama'] },
    { title: 'Interstellar', year: 2014, director: 'Christopher Nolan', description: 'A team of explorers travel through a wormhole in space in an attempt to ensure humanity\'s survival.', genres: ['Sci-Fi', 'Drama'] },
    { title: 'Get Out', year: 2017, director: 'Jordan Peele', description: 'A young African-American visits his white girlfriend\'s family estate, where unsettling secrets emerge.', genres: ['Horror', 'Thriller'] },
    { title: 'Parasite', year: 2019, director: 'Bong Joon-ho', description: 'A poor family schemes to become employed by a wealthy family, leading to unexpected and dark consequences.', genres: ['Drama', 'Thriller'] },
    { title: 'The Grand Budapest Hotel', year: 2014, director: 'Wes Anderson', description: 'A legendary concierge and his young protégé become embroiled in the theft of a priceless painting.', genres: ['Comedy', 'Drama'] },
    { title: 'Hereditary', year: 2018, director: 'Ari Aster', description: 'After the family matriarch passes away, a grieving family is haunted by increasingly disturbing occurrences.', genres: ['Horror', 'Drama'] },
    { title: 'Knives Out', year: 2019, director: 'Rian Johnson', description: 'A detective investigates the death of a crime novelist at his estate surrounded by his dysfunctional family.', genres: ['Comedy', 'Thriller', 'Drama'] },
    { title: 'La La Land', year: 2016, director: 'Damien Chazelle', description: 'A jazz musician and an aspiring actress fall in love while pursuing their dreams in Los Angeles.', genres: ['Romance', 'Drama'] },
    { title: 'Mad Max: Fury Road', year: 2015, director: 'George Miller', description: 'In a post-apocalyptic wasteland, Max teams with a rebel warrior to flee a warlord and his army.', genres: ['Action', 'Sci-Fi'] },
    { title: 'Superbad', year: 2007, director: 'Greg Mottola', description: 'Two co-dependent high school seniors attempt to score alcohol for a party before graduation.', genres: ['Comedy'] },
    { title: 'Arrival', year: 2016, director: 'Denis Villeneuve', description: 'A linguist works with the military to communicate with alien lifeforms after twelve mysterious spacecraft appear.', genres: ['Sci-Fi', 'Drama', 'Thriller'] },
    { title: 'Spider-Man: Into the Spider-Verse', year: 2018, director: 'Bob Persichetti', description: 'Teen Miles Morales becomes Spider-Man and teams up with alternate versions of the hero from other dimensions.', genres: ['Animation', 'Action'] },
    { title: 'The Shape of Water', year: 2017, director: 'Guillermo del Toro', description: 'A mute janitor at a government lab falls in love with an amphibious creature being held captive.', genres: ['Romance', 'Drama', 'Sci-Fi'] },
    { title: 'A Quiet Place', year: 2018, director: 'John Krasinski', description: 'A family struggles to survive in a post-apocalyptic world inhabited by blind monsters with an acute sense of hearing.', genres: ['Horror', 'Sci-Fi', 'Thriller'] },
    { title: 'Everything Everywhere All at Once', year: 2022, director: 'Daniel Kwan', description: 'A middle-aged Chinese immigrant discovers she can access the skills of parallel universe versions of herself.', genres: ['Action', 'Comedy', 'Sci-Fi'] },
    { title: 'The Notebook', year: 2004, director: 'Nick Cassavetes', description: 'A poor yet passionate young man falls in love with a rich girl, but their love is put to the test.', genres: ['Romance', 'Drama'] },
    { title: 'Spirited Away', year: 2001, director: 'Hayao Miyazaki', description: 'A young girl wanders into a world ruled by gods, witches, and spirits, and her parents are turned into pigs.', genres: ['Animation', 'Drama'] },
    { title: 'Dune', year: 2021, director: 'Denis Villeneuve', description: 'A noble family becomes embroiled in a war for control over the galaxy\'s most valuable asset.', genres: ['Sci-Fi', 'Action', 'Drama'] },
    { title: 'The Truman Show', year: 1998, director: 'Peter Weir', description: 'An insurance salesman discovers his entire life is actually a reality TV show.', genres: ['Comedy', 'Drama', 'Sci-Fi'] },
  ];

  const insertMovie = db.prepare(`
    INSERT OR IGNORE INTO movies (title, year, director, description) VALUES (?, ?, ?, ?)
  `);
  const linkGenre = db.prepare(`
    INSERT OR IGNORE INTO movie_genres (movie_id, genre_id)
    SELECT ?, id FROM genres WHERE name = ?
  `);
  const findMovie = db.prepare('SELECT id FROM movies WHERE title = ?');

  for (const m of movies) {
    insertMovie.run(m.title, m.year, m.director, m.description);
    const row = findMovie.get(m.title);
    if (row) {
      for (const g of m.genres) linkGenre.run(row.id, g);
    }
  }

  return db;
}

module.exports = { initDb };
