-- PRD-422: email is optional for every user, managers/directors included.
-- managers_email_unique stays — Postgres treats NULLs as distinct.
alter table managers
  alter column email drop not null;
