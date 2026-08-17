-- Fills out the league so its pages can be looked at with realistic volume. fg_dev ONLY. NEVER fg_prod.
--
-- Run after doc/seed-houses-dev.sql and doc/seed-league-dev.sql:
--
--   cd ../fulguro-server
--   ssh -i app/src/main/resources/id_ed25519 root@<ssh.host> 'mysql --database=fg_dev' < ../go-ladder-for-discord-website/doc/seed-league-states-dev.sql
--
-- ---------------------------------------------------------------------------------------------------------------
-- ⚠ What this file can and cannot do
--
-- `period` and `currentSession` are computed from the **clock**, never from the database. No amount of seeding makes
-- a session current in August. The three states are reached like this:
--
--   Intersaison            period VACATION, currentSession null   — the real date, June to August. Nothing to set.
--   Trou de Noël           period SEASON,   currentSession null   — set house.period.override=SEASON in the server's
--                                                                   config.properties and restart. It moves the
--                                                                   period only, so an August date stays outside
--                                                                   every session window: the exact shape of the
--                                                                   second half of December, which is not a session.
--                                                                   The one difference is cosmetic — the banner
--                                                                   names the season the clock is in (2025-2026)
--                                                                   rather than the one a December would (2026-2027).
--   Session en cours       period SEASON,   currentSession N      — needs league.session.override=N.
--
-- ⚠⚠ **Do not set league.session.override on this database.** Its own documentation says why: on its first tick, at
-- any hour, the service settles every unsettled session whose end has passed, and `markUnplayed` is irreversible —
-- it would close session 4's open matches, which is precisely the state this file exists to create. It also draws,
-- and a draw creates **permanent** OGS matches on the `FulguroGo` league that dev shares with production.
--
-- What is below therefore prepares the *contents* of a running session. The session page (/league/session/4) shows
-- it in full today; only the "session en cours" block on /league needs the clock.
-- ---------------------------------------------------------------------------------------------------------------
--
-- Real members are used here, as allowed: they are picked by query rather than by id, so no Discord id from this
-- non-anonymised database is written into this repository. They are recognisable by their `joined` stamp,
-- 2025-09-08, which is what the rollback keys on.
--
-- Undo:
--
--   DELETE FROM league_matches    WHERE league_match_id LIKE 'TEST_L_4_R%';
--   UPDATE league_matches SET result = NULL WHERE league_match_id = 'TEST_L_4_1';
--   DELETE FROM house_points      WHERE gold_id LIKE 'TEST_R_%';
--   DELETE FROM league_players    WHERE discord_id IN (SELECT discord_id FROM league_members WHERE joined = '2025-09-08 08:00:00');
--   DELETE FROM league_members    WHERE joined = '2025-09-08 08:00:00';
--   DELETE FROM house_members     WHERE joined = '2025-09-08 08:00:00';

START TRANSACTION;

-- ---------------------------------------------------------------------------------------------------------------
-- Sixteen real members, four per house
--
-- MySQL 5.7 has no window functions, hence the counter variable. Spread 1,2,3,4,1,2,… so the four houses fill
-- evenly, and ordered by id so a re-run picks the same people.
-- ---------------------------------------------------------------------------------------------------------------

SET @house := 0;
INSERT INTO house_members (discord_id, house_id, joined, pending_action)
SELECT t.discord_id, 1 + (@house := @house + 1) MOD 4, '2025-09-08 08:00:00', NULL
FROM (
  SELECT DISTINCT d.discord_id
    FROM discord_user_info d
    JOIN gold_ratings g ON g.discord_id = d.discord_id
   WHERE d.left_server_since IS NULL
     AND d.discord_id NOT LIKE '9000000000000000%'
     AND d.discord_id NOT IN (SELECT discord_id FROM house_members)
   ORDER BY d.discord_id
   LIMIT 16
) t;

-- One scoring row each. `victory` varies with a hash of the id so a house ranking has more than one total in it —
-- otherwise every member ties on the same figure and the whole table comes back rank 1.
INSERT INTO house_points
  (gold_id, discord_id, house_id, season, played, gold_opponent, rival_house, long_game, victory, even_game, ranked, scored_at)
SELECT CONCAT('TEST_R_', m.discord_id), m.discord_id, m.house_id, '2025-2026',
       1, 2, 2,
       CASE (CONV(RIGHT(MD5(m.discord_id), 2), 16, 10) MOD 2) WHEN 0 THEN 0 ELSE 2 END,
       CASE (CONV(RIGHT(MD5(m.discord_id), 2), 16, 10) MOD 3) WHEN 0 THEN 0 WHEN 1 THEN 2 ELSE 4 END,
       1, 1, '2025-11-05 12:00:00'
  FROM house_members m
 WHERE m.joined = '2025-09-08 08:00:00';

-- The same people join the league. No match of their own yet beyond session 4 below, which is realistic: a member
-- who joined and has not been drawn sits in the standings on zero.
INSERT INTO league_members (season, discord_id, joined, active, left_since)
SELECT '2025-2026', m.discord_id, '2025-09-08 08:00:00', 1, NULL
  FROM house_members m
 WHERE m.joined = '2025-09-08 08:00:00'
   AND m.discord_id NOT IN (SELECT discord_id FROM league_members WHERE season = '2025-2026');

INSERT INTO league_players (discord_id, ogs_registered)
SELECT m.discord_id, '2025-09-08 09:00:00'
  FROM house_members m
 WHERE m.joined = '2025-09-08 08:00:00'
   AND m.discord_id NOT IN (SELECT discord_id FROM league_players);

-- ---------------------------------------------------------------------------------------------------------------
-- Session 4: drawn, running, partly played
--
-- Houses 1 and 3 on one side, 2 and 4 on the other, so any pairing is automatically cross-house — the one rule the
-- draw may never break. The first four are played, the rest are still to come, which is what a session in progress
-- actually looks like: some results, some `null`.
-- ---------------------------------------------------------------------------------------------------------------

DROP TEMPORARY TABLE IF EXISTS pool_black;
DROP TEMPORARY TABLE IF EXISTS pool_white;
CREATE TEMPORARY TABLE pool_black (n INT, discord_id VARCHAR(255), house_id INT);
CREATE TEMPORARY TABLE pool_white (n INT, discord_id VARCHAR(255), house_id INT);

SET @b := 0;
INSERT INTO pool_black
SELECT (@b := @b + 1), x.discord_id, x.house_id
FROM (SELECT discord_id, house_id FROM house_members
       WHERE joined = '2025-09-08 08:00:00' AND house_id IN (1, 3) ORDER BY discord_id) x;

SET @w := 0;
INSERT INTO pool_white
SELECT (@w := @w + 1), y.discord_id, y.house_id
FROM (SELECT discord_id, house_id FROM house_members
       WHERE joined = '2025-09-08 08:00:00' AND house_id IN (2, 4) ORDER BY discord_id) y;

INSERT INTO league_matches
  (season, session, black_discord_id, white_discord_id, black_house_id, white_house_id, pairing_score,
   league_match_id, ogs_match_id, spectator_link, ogs_game_id, gold_id, result, created)
SELECT '2025-2026', 4, b.discord_id, w.discord_id, b.house_id, w.house_id, 100 + b.n,
       CONCAT('TEST_L_4_R', b.n), 9100 + b.n, CONCAT('https://online-go.com/game/9100', b.n),
       CASE WHEN b.n <= 4 THEN 9100 + b.n ELSE NULL END,
       CASE WHEN b.n <= 4 THEN CONCAT('OGS_9100', b.n) ELSE NULL END,
       CASE WHEN b.n <= 2 THEN 'black' WHEN b.n <= 4 THEN 'white' ELSE NULL END,
       '2025-11-01 07:30:00'
  FROM pool_black b
  JOIN pool_white w ON w.n = b.n;

-- One of the two synthetic matches of session 4 is played too, so the pair set up by seed-league-dev.sql shows both
-- states side by side rather than being uniformly pending.
UPDATE league_matches
   SET result = 'black', ogs_game_id = 90000011, gold_id = 'OGS_90000011'
 WHERE league_match_id = 'TEST_L_4_1';

DROP TEMPORARY TABLE pool_black;
DROP TEMPORARY TABLE pool_white;

COMMIT;

SELECT session,
       COUNT(*) AS matchs,
       SUM(result IS NULL) AS a_jouer,
       SUM(result = 'unplayed') AS non_jouees,
       SUM(result IN ('black', 'white')) AS terminees
  FROM league_matches WHERE season = '2025-2026' GROUP BY session ORDER BY session;
