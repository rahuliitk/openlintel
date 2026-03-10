-- ============================================================================
-- 001_users_auth.sql — Users, Accounts, Sessions
-- ============================================================================

-- User 1: Alice (homeowner)
INSERT INTO users (id, name, email, email_verified, image, role, enabled, preferred_currency, preferred_unit_system, preferred_locale, created_at, updated_at)
VALUES (
  'usr_alice_001',
  'Alice Sharma',
  'alice@example.com',
  NOW() - INTERVAL '30 days',
  NULL,
  'user',
  true,
  'INR',
  'metric',
  'en',
  NOW() - INTERVAL '60 days',
  NOW() - INTERVAL '1 day'
);

-- User 2: Bob (admin)
INSERT INTO users (id, name, email, email_verified, image, role, enabled, preferred_currency, preferred_unit_system, preferred_locale, created_at, updated_at)
VALUES (
  'usr_bob_002',
  'Bob Kumar',
  'bob@example.com',
  NOW() - INTERVAL '90 days',
  NULL,
  'admin',
  true,
  'INR',
  'metric',
  'en',
  NOW() - INTERVAL '90 days',
  NOW() - INTERVAL '2 days'
);

-- OAuth account for Alice (Google)
INSERT INTO accounts (user_id, type, provider, provider_account_id, access_token, token_type, scope)
VALUES (
  'usr_alice_001',
  'oauth',
  'google',
  'google_alice_12345',
  'mock_access_token_alice',
  'Bearer',
  'openid email profile'
);

-- OAuth account for Bob (GitHub)
INSERT INTO accounts (user_id, type, provider, provider_account_id, access_token, token_type, scope)
VALUES (
  'usr_bob_002',
  'oauth',
  'github',
  'github_bob_67890',
  'mock_access_token_bob',
  'Bearer',
  'read:user user:email'
);

-- Active session for Alice
INSERT INTO sessions (session_token, user_id, expires)
VALUES (
  'sess_alice_active_token_001',
  'usr_alice_001',
  NOW() + INTERVAL '30 days'
);

-- Active session for Bob
INSERT INTO sessions (session_token, user_id, expires)
VALUES (
  'sess_bob_active_token_002',
  'usr_bob_002',
  NOW() + INTERVAL '30 days'
);
