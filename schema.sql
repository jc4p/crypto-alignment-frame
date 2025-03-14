-- Schema for onchain_analysis_nfts table

CREATE TABLE IF NOT EXISTS onchain_analysis_nfts (
  id SERIAL PRIMARY KEY,
  token_id INTEGER NOT NULL,
  tx_hash VARCHAR(66) NOT NULL,
  wallet_address VARCHAR(42) NOT NULL,
  fid INTEGER,
  username VARCHAR(255),
  x_position DECIMAL(5,2) NOT NULL,
  y_position DECIMAL(5,2) NOT NULL,
  category VARCHAR(255) NOT NULL,
  image_url VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_onchain_analysis_nfts_token_id ON onchain_analysis_nfts(token_id);
CREATE INDEX IF NOT EXISTS idx_onchain_analysis_nfts_fid ON onchain_analysis_nfts(fid);
CREATE INDEX IF NOT EXISTS idx_onchain_analysis_nfts_wallet_address ON onchain_analysis_nfts(wallet_address); 