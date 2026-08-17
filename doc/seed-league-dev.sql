-- Test data for the league pages. fg_dev ONLY. NEVER fg_prod.
--
-- Requires doc/seed-houses-dev.sql to have been run first: a league member must be a member of a house, and the
-- standings read the crest from there. Same synthetic players, same 9000000000000000xx ids — fg_dev is a snapshot of
-- production and is not anonymised, so nothing real is read or written here either.
--
--   cd ../fulguro-server
--   ssh -i app/src/main/resources/id_ed25519 root@<ssh.host> 'mysql --database=fg_dev' < ../go-ladder-for-discord-website/doc/seed-league-dev.sql
--
-- Undo:
--
--   DELETE FROM league_matches    WHERE league_match_id LIKE 'TEST_L_%';
--   DELETE FROM league_exemptions WHERE discord_id LIKE '9000000000000000%';
--   DELETE FROM league_members    WHERE discord_id LIKE '9000000000000000%';
--   DELETE FROM league_players    WHERE discord_id LIKE '9000000000000000%';
--   DELETE FROM ogs_user_info     WHERE discord_id LIKE '9000000000000000%';
--   DELETE FROM league_sessions   WHERE season = '2025-2026' AND session <= 4;
--
-- What it is shaped to show, one case per thing the pages have to get right:
--
--   * result has THREE states — NULL (session running, not played yet), 'unplayed' (settled without being played,
--     so it will never count) and a real 'black'/'white'. Session 4 holds the first, session 1 the second.
--   * exemptions, with reason ODD: sessions 3 and 4 have five active members, so one is left over each time.
--   * inactive members keep their renown: Test Nebuleuse left after session 2, Test Frimas never played at all.
--     Both stay in the standings with active = 0.
--   * a session drawn but not settled (4), and sessions both drawn and settled (1 to 3).
--   * no pairing ever puts two members of the same house together.

START TRANSACTION;

-- ⚠ A synthetic player needs a fake OGS account or the running server takes them straight back out again.
-- CleanService deactivates any active league member with no `ogs_user_info` row — unlinking OGS means leaving the
-- academy — so without this the whole set turns inactive within a tick and the standings quietly become a list of
-- people who left. `error = 1` marks the row as one OgsService has already failed on, so it stops trying to scrape
-- an id that does not exist.
INSERT INTO ogs_user_info (discord_id, ogs_id, ogs_name, ogs_rank, updated, error) VALUES
  ('900000000000000001', 99000001, 'test-boreale',    '5k', NOW(), 1),
  ('900000000000000002', 99000002, 'test-givre',      '7k', NOW(), 1),
  ('900000000000000003', 99000003, 'test-frimas',     '9k', NOW(), 1),
  ('900000000000000004', 99000004, 'test-quartz',     '3k', NOW(), 1),
  ('900000000000000005', 99000005, 'test-obsidienne', '2k', NOW(), 1),
  ('900000000000000006', 99000006, 'test-croissant',  '1d', NOW(), 1),
  ('900000000000000007', 99000007, 'test-nebuleuse',  '4k', NOW(), 1);

-- Every synthetic house member joins. Nebuleuse and Frimas are inactive: one left mid-season, one never played.
INSERT INTO league_members (season, discord_id, joined, active, left_since) VALUES
  ('2025-2026', '900000000000000001', '2025-09-01 08:00:00', 1, NULL),
  ('2025-2026', '900000000000000002', '2025-09-01 08:00:00', 1, NULL),
  ('2025-2026', '900000000000000003', '2025-09-01 08:00:00', 0, '2025-09-20 08:00:00'),
  ('2025-2026', '900000000000000004', '2025-09-01 08:00:00', 1, NULL),
  ('2025-2026', '900000000000000005', '2025-09-01 08:00:00', 1, NULL),
  ('2025-2026', '900000000000000006', '2025-09-01 08:00:00', 1, NULL),
  ('2025-2026', '900000000000000007', '2025-09-01 08:00:00', 0, '2025-11-01 08:00:00');

INSERT INTO league_players (discord_id, ogs_registered) VALUES
  ('900000000000000001', '2025-09-01 09:00:00'),
  ('900000000000000002', '2025-09-01 09:00:00'),
  ('900000000000000003', '2025-09-01 09:00:00'),
  ('900000000000000004', '2025-09-01 09:00:00'),
  ('900000000000000005', '2025-09-01 09:00:00'),
  ('900000000000000006', '2025-09-01 09:00:00'),
  ('900000000000000007', '2025-09-01 09:00:00');

-- Sessions 1 to 3 are drawn and settled; 4 is drawn and still running, which is what makes its matches' NULL result
-- mean "to be played" rather than "forfeited".
INSERT INTO league_sessions (season, session, drawn, notified, settled) VALUES
  ('2025-2026', 1, '2025-09-15 07:30:00', '2025-09-15 07:35:00', '2025-10-01 07:30:00'),
  ('2025-2026', 2, '2025-10-01 07:30:00', '2025-10-01 07:35:00', '2025-10-15 07:30:00'),
  ('2025-2026', 3, '2025-10-15 07:30:00', '2025-10-15 07:35:00', '2025-11-01 07:30:00'),
  ('2025-2026', 4, '2025-11-01 07:30:00', '2025-11-01 07:35:00', NULL);

-- houses: 1 Fils du Froid, 2 Nexus Alpha, 3 Sabre Silencieux, 4 Lunaires d'Aether.
INSERT INTO league_matches
  (season, session, black_discord_id, white_discord_id, black_house_id, white_house_id, pairing_score,
   league_match_id, ogs_match_id, spectator_link, ogs_game_id, gold_id, result, created) VALUES
  -- Session 1: two real results, and one match nobody played before the settlement closed it.
  ('2025-2026', 1, '900000000000000001', '900000000000000004', 1, 2, 120.5, 'TEST_L_1_1', 9001, 'https://online-go.com/game/90000001', 90000001, 'OGS_90000001', 'black',    '2025-09-15 07:30:00'),
  ('2025-2026', 1, '900000000000000005', '900000000000000006', 2, 4, 210.0, 'TEST_L_1_2', 9002, 'https://online-go.com/game/90000002', 90000002, 'OGS_90000002', 'white',    '2025-09-15 07:30:00'),
  ('2025-2026', 1, '900000000000000002', '900000000000000007', 1, 4, 330.0, 'TEST_L_1_3', 9003, 'https://online-go.com/game/90000003', NULL,     NULL,           'unplayed', '2025-09-15 07:30:00'),
  -- Session 2
  ('2025-2026', 2, '900000000000000006', '900000000000000001', 4, 1, 140.0, 'TEST_L_2_1', 9004, 'https://online-go.com/game/90000004', 90000004, 'OGS_90000004', 'black', '2025-10-01 07:30:00'),
  ('2025-2026', 2, '900000000000000004', '900000000000000007', 2, 4, 260.0, 'TEST_L_2_2', 9005, 'https://online-go.com/game/90000005', 90000005, 'OGS_90000005', 'black', '2025-10-01 07:30:00'),
  ('2025-2026', 2, '900000000000000005', '900000000000000002', 2, 1, 190.0, 'TEST_L_2_3', 9006, 'https://online-go.com/game/90000006', 90000006, 'OGS_90000006', 'white', '2025-10-01 07:30:00'),
  -- Session 3: Nebuleuse has left, so five are drawn and one is left over.
  ('2025-2026', 3, '900000000000000001', '900000000000000005', 1, 2, 130.0, 'TEST_L_3_1', 9007, 'https://online-go.com/game/90000007', 90000007, 'OGS_90000007', 'black', '2025-10-15 07:30:00'),
  ('2025-2026', 3, '900000000000000006', '900000000000000002', 4, 1, 220.0, 'TEST_L_3_2', 9008, 'https://online-go.com/game/90000008', 90000008, 'OGS_90000008', 'white', '2025-10-15 07:30:00'),
  -- Session 4: drawn, still running. NULL result = to be played, not forfeited.
  ('2025-2026', 4, '900000000000000004', '900000000000000001', 2, 1, 150.0, 'TEST_L_4_1', 9009, 'https://online-go.com/game/90000009', NULL, NULL, NULL, '2025-11-01 07:30:00'),
  ('2025-2026', 4, '900000000000000002', '900000000000000006', 1, 4, 240.0, 'TEST_L_4_2', 9010, 'https://online-go.com/game/90000010', NULL, NULL, NULL, '2025-11-01 07:30:00');

-- One player left over each time an odd number is active. An exemption is worth no points; it only keeps the
-- perfect-attendance bonus reachable.
INSERT INTO league_exemptions (season, session, discord_id, reason, created) VALUES
  ('2025-2026', 3, '900000000000000004', 'ODD', '2025-10-15 07:30:00'),
  ('2025-2026', 4, '900000000000000005', 'ODD', '2025-11-01 07:30:00');

COMMIT;

SELECT session,
       (SELECT COUNT(*) FROM league_matches m WHERE m.season = s.season AND m.session = s.session) AS matches,
       (SELECT COUNT(*) FROM league_exemptions e WHERE e.season = s.season AND e.session = s.session) AS exemptions,
       drawn IS NOT NULL AS drawn, settled IS NOT NULL AS settled
  FROM league_sessions s WHERE s.season = '2025-2026' ORDER BY session;
