-- Entity Document CRM — free-text business_type (patch)
--
-- entities.business_type used to be restricted to a fixed list
-- ('vape_shop', 'insurance_ops', 'parlor') via a CHECK constraint. It's
-- now a free-text label the admin types per entity, so the constraint
-- is removed. Existing rows keep whatever value they already have —
-- nothing to migrate there, the old values are still perfectly valid
-- free text.
--
-- Safe to run any number of times. If you're setting this project up
-- fresh, skip this file — schema.sql already has it right.

alter table entities drop constraint if exists entities_business_type_check;
