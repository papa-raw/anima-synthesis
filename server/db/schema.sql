CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  pokemon TEXT NOT NULL,
  element TEXT NOT NULL,
  bioregion_id TEXT NOT NULL,
  bioregion_name TEXT,
  wallet_address TEXT NOT NULL DEFAULT '',
  token_address TEXT,
  token_symbol TEXT,
  beezie_token_id TEXT,
  status TEXT DEFAULT 'wild',
  captured_by TEXT,
  captured_at DATETIME,
  eth_balance REAL DEFAULT 0,
  weth_earned_total REAL DEFAULT 0,
  daily_cost_usd REAL DEFAULT 0.50,
  runway_days REAL DEFAULT 0,
  last_heartbeat DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS capture_proofs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id TEXT NOT NULL,
  catcher_wallet TEXT NOT NULL,
  matching_card_token_id TEXT NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  accuracy REAL,
  bioregion_verified TEXT NOT NULL,
  astral_proof_hash TEXT,
  status TEXT DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

CREATE TABLE IF NOT EXISTS agent_heartbeats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id TEXT NOT NULL,
  eth_balance REAL,
  weth_claimable REAL,
  token_price REAL,
  holder_count INTEGER,
  runway_days REAL,
  action TEXT,
  tx_hash TEXT,
  ipfs_cid TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

CREATE INDEX IF NOT EXISTS idx_heartbeats_agent ON agent_heartbeats(agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_capture_agent ON capture_proofs(agent_id);
