alter table managers
  add column if not exists reminder_preference text not null default 'never'
  check (reminder_preference in ('never', 'daily', 'weekly'));
