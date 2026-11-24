-- Rename card ids for the Starhold (space colony) theme. Stored games keep
-- card ids in Game.config (the kingdom list) and in GameAction.payload (cardId,
-- and response.cards / response.cardId for decisions). Rewriting them keeps
-- existing games replayable. Ids only ever appear as quoted JSON string values,
-- and none of the old ids match any JSON key or other value, so a text replace
-- of the quoted id is exact.

CREATE FUNCTION pg_temp.starhold_ids(t text) RETURNS text
LANGUAGE sql IMMUTABLE AS $$
  SELECT replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(t, '"penny"', '"ore"'), '"crown"', '"alloy"'), '"ingot"', '"fusion-cell"'), '"farm"', '"habitat"'), '"town"', '"biodome"'), '"capital"', '"arcology"'), '"blight"', '"malware"'), '"cellar"', '"overclock"'), '"chapel"', '"reclaimer"'), '"moat"', '"perimeter-shield"'), '"harbinger"', '"survey-drone"'), '"merchant"', '"fabricator"'), '"vassal"', '"emp-burst"'), '"village"', '"mining-rig"'), '"workshop"', '"supply-drop"'), '"militia"', '"matter-converter"'), '"moneylender"', '"infiltrator"')
$$;

UPDATE "Game" SET "config" = pg_temp.starhold_ids("config"::text)::jsonb;
UPDATE "GameAction" SET "payload" = pg_temp.starhold_ids("payload"::text)::jsonb;
