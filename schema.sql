CREATE TABLE bsky_urls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL,
  url TEXT NOT NULL,
  author TEXT,
  text TEXT,
  createdAt TEXT
);

CREATE INDEX bsky_urls_url_idx ON bsky_urls (url);
CREATE INDEX bsky_urls_author_idx ON bsky_urls (author);
CREATE INDEX bsky_urls_createdAt_idx ON bsky_urls (createdAt);
