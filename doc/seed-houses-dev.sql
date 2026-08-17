-- Test data for the houses pages. fg_dev ONLY. NEVER fg_prod.
--
-- How to run it, and how to undo it:
--
--   cd ../fulguro-server
--   ssh -i app/src/main/resources/id_ed25519 root@<ssh.host> 'mysql --database=fg_dev' < ../go-ladder-for-discord-website/doc/seed-houses-dev.sql
--
-- The host is `ssh.host` in fulguro-server's config.properties (gitignored). root has passwordless local MySQL on
-- that box, so no database credentials are needed — and fg_dev and fg_prod live on the **same server**, which is why
-- --database=fg_dev is not optional and why nothing here may be run without it.
--
-- Undo, when you are done — leaving this behind would put fake houses in front of whoever looks next:
--
--   DELETE FROM house_points      WHERE gold_id LIKE 'TEST_H_%';
--   DELETE FROM house_members     WHERE discord_id LIKE '9000000000000000%';
--   DELETE FROM discord_user_info WHERE discord_id LIKE '9000000000000000%';
--
-- Every player here is synthetic: ids in the 9000000000000000xx range, which no Discord snowflake occupies, and
-- invented names. fg_dev is a snapshot of fg_prod and is not anonymised, so seeding with real members would put real
-- Discord ids and names into everything this session prints. Nothing real is read or written.
--
-- Season is '2025-2026': in August 2026 the calendar is in VACATION and seasonName() still answers the season that
-- has just ended, which is what /gold/api/houses counts points over.
--
-- Shapes exercised, one per case the page has to get right:
--   * FILS_DU_FROID    3 members, a clear leader, and one member on zero points who must still appear
--   * NEXUS_ALPHA      2 members tied on 20 -> competition ranks 1, 1 inside the house
--   * LUNAIRES_AETHER  2 members, house total tied with Nexus Alpha at 40 -> no numbered podium is possible
--   * SABRE_SILENCIEUX points in the register but NO member: a player who has since left. Total > 0, leader null.

START TRANSACTION;

INSERT INTO discord_user_info (discord_id, discord_name, discord_avatar, updated, error, left_server_since) VALUES
  ('900000000000000001', 'Test Boreale',    'https://cdn.discordapp.com/embed/avatars/0.png', NOW(), 0, NULL),
  ('900000000000000002', 'Test Givre',      'https://cdn.discordapp.com/embed/avatars/1.png', NOW(), 0, NULL),
  ('900000000000000003', 'Test Frimas',     'https://cdn.discordapp.com/embed/avatars/2.png', NOW(), 0, NULL),
  ('900000000000000004', 'Test Quartz',     'https://cdn.discordapp.com/embed/avatars/3.png', NOW(), 0, NULL),
  ('900000000000000005', 'Test Obsidienne', 'https://cdn.discordapp.com/embed/avatars/4.png', NOW(), 0, NULL),
  ('900000000000000006', 'Test Croissant',  'https://cdn.discordapp.com/embed/avatars/0.png', NOW(), 0, NULL),
  ('900000000000000007', 'Test Nebuleuse',  'https://cdn.discordapp.com/embed/avatars/1.png', NOW(), 0, NULL),
  ('900000000000000008', 'Test Ronin',      'https://cdn.discordapp.com/embed/avatars/2.png', NOW(), 0, NULL),
  -- Deliberately left out of doc/seed-league-dev.sql: this is the "in a house, not in the league" profile, the one
  -- state the league join button is for. Ronin above is the other end — in neither.
  ('900000000000000009', 'Test Aspirant',   'https://cdn.discordapp.com/embed/avatars/3.png', NOW(), 0, NULL);

-- Test Ronin is deliberately absent: their points stay in the register, their membership does not.
INSERT INTO house_members (discord_id, house_id, joined, pending_action) VALUES
  ('900000000000000001', 1, '2025-09-01 08:00:00', NULL),
  ('900000000000000002', 1, '2025-09-01 08:00:00', NULL),
  ('900000000000000003', 1, '2025-10-15 08:00:00', NULL),
  ('900000000000000004', 2, '2025-09-01 08:00:00', NULL),
  ('900000000000000005', 2, '2025-09-01 08:00:00', NULL),
  ('900000000000000006', 4, '2025-09-01 08:00:00', NULL),
  ('900000000000000007', 4, '2025-09-01 08:00:00', NULL),
  ('900000000000000009', 3, '2025-09-01 08:00:00', NULL);

-- played, gold_opponent, rival_house, long_game, victory, even_game, ranked
INSERT INTO house_points
  (gold_id, discord_id, house_id, season, played, gold_opponent, rival_house, long_game, victory, even_game, ranked, scored_at) VALUES
  -- Fils du Froid: Boreale 27, Givre 12, Frimas absent from the register entirely
  ('TEST_H_001', '900000000000000001', 1, '2025-2026', 1, 2, 2, 2, 2, 1, 1, '2025-11-02 12:00:00'),
  ('TEST_H_002', '900000000000000001', 1, '2025-2026', 1, 2, 2, 2, 2, 1, 1, '2025-11-09 12:00:00'),
  ('TEST_H_003', '900000000000000001', 1, '2025-2026', 1, 0, 2, 0, 0, 0, 0, '2025-11-16 12:00:00'),
  ('TEST_H_004', '900000000000000002', 1, '2025-2026', 1, 2, 2, 2, 2, 1, 1, '2025-11-03 12:00:00'),
  ('TEST_H_005', '900000000000000002', 1, '2025-2026', 1, 0, 0, 0, 0, 0, 0, '2025-11-10 12:00:00'),
  -- Nexus Alpha: Quartz 20, Obsidienne 20 -> tied, both rank 1
  ('TEST_H_006', '900000000000000004', 2, '2025-2026', 1, 2, 2, 2, 2, 1, 1, '2025-11-04 12:00:00'),
  ('TEST_H_007', '900000000000000004', 2, '2025-2026', 1, 2, 0, 2, 0, 0, 1, '2025-11-11 12:00:00'),
  ('TEST_H_008', '900000000000000005', 2, '2025-2026', 1, 2, 2, 2, 2, 1, 1, '2025-11-05 12:00:00'),
  ('TEST_H_009', '900000000000000005', 2, '2025-2026', 1, 2, 0, 2, 0, 0, 1, '2025-11-12 12:00:00'),
  -- Lunaires d'Aether: Croissant 25, Nebuleuse 15
  ('TEST_H_010', '900000000000000006', 4, '2025-2026', 1, 2, 2, 2, 2, 1, 1, '2025-11-06 12:00:00'),
  ('TEST_H_011', '900000000000000006', 4, '2025-2026', 1, 2, 2, 2, 2, 0, 1, '2025-11-13 12:00:00'),
  ('TEST_H_012', '900000000000000006', 4, '2025-2026', 1, 0, 0, 0, 0, 0, 0, '2025-11-20 12:00:00'),
  ('TEST_H_013', '900000000000000007', 4, '2025-2026', 1, 2, 2, 2, 2, 1, 1, '2025-11-07 12:00:00'),
  ('TEST_H_014', '900000000000000007', 4, '2025-2026', 1, 0, 0, 0, 0, 0, 1, '2025-11-14 12:00:00'),
  -- Sabre Silencieux: 12 points in the register, and nobody left in the house to own them
  ('TEST_H_015', '900000000000000008', 3, '2025-2026', 1, 2, 2, 2, 2, 1, 1, '2025-11-08 12:00:00'),
  ('TEST_H_016', '900000000000000008', 3, '2025-2026', 1, 0, 0, 0, 0, 0, 0, '2025-11-15 12:00:00'),
  -- And one more for Nexus Alpha, credited to the same departed player, which brings the house to 35 and ties it
  -- with Lunaires d'Aether. That tie is the point of the whole fixture: it is why ApiHouses attaches no rank.
  -- Credited to a non-member on purpose -- adding it to Quartz or Obsidienne would break their 17-all tie inside
  -- the house, and that one is what proves the competition ranks.
  ('TEST_H_017', '900000000000000008', 2, '2025-2026', 1, 0, 0, 0, 0, 0, 0, '2025-10-20 12:00:00'),
  -- Sabre Silencieux gains its one member, so that house stops being the no-member case on the list page.
  ('TEST_H_018', '900000000000000009', 3, '2025-2026', 1, 2, 0, 0, 2, 0, 1, '2025-11-18 12:00:00');

COMMIT;

SELECT h.slug,
       (SELECT COUNT(*) FROM house_members m WHERE m.house_id = h.id) AS members,
       (SELECT COALESCE(SUM(played + gold_opponent + rival_house + long_game + victory + even_game + ranked), 0)
          FROM house_points p WHERE p.house_id = h.id AND p.season = '2025-2026') AS total
  FROM houses h ORDER BY total DESC, members ASC, h.name ASC;
