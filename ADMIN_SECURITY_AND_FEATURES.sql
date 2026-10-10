-- =====================================================================
-- ADMIN_SECURITY_AND_FEATURES.sql
-- À exécuter UNE FOIS dans Supabase > SQL Editor (rejouable sans risque).
--
-- Ce script ajoute, sans supprimer ni modifier aucune donnée existante :
--   1) le journal d'activité des responsables (table admin_activity_log),
--      lisible UNIQUEMENT par le responsable principal MDA ;
--   2) l'enregistrement des 5 responsables dans la table public.admins ;
--   3) la modification d'une réponse déjà envoyée (2 fonctions RPC).
--
-- AVANT D'EXÉCUTER : créez les utilisateurs dans
--   Supabase > Authentication > Users > Add user
--   (e-mail + mot de passe, cochez « Auto Confirm User »).
-- Le mot de passe de chaque responsable est celui défini là-bas.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0) Colonne updated_at : date de la dernière modification d'une réponse
-- ---------------------------------------------------------------------
do $$
begin
  if to_regclass('public.survey_responses') is not null then
    alter table public.survey_responses add column if not exists updated_at timestamptz;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 1) Journal d'activité des responsables
-- ---------------------------------------------------------------------
create table if not exists public.admin_activity_log (
  id          uuid primary key default gen_random_uuid(),
  admin_id    uuid not null,
  admin_name  text not null,
  admin_email text,
  action      text not null,
  target      text,
  details     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists admin_activity_log_created_idx on public.admin_activity_log (created_at desc);
create index if not exists admin_activity_log_admin_idx   on public.admin_activity_log (admin_name);

alter table public.admin_activity_log enable row level security;

drop policy if exists "admin_activity_insert_own" on public.admin_activity_log;
create policy "admin_activity_insert_own"
on public.admin_activity_log for insert
to authenticated
with check (
  admin_id = auth.uid()
  and exists (select 1 from public.admins a where a.id = auth.uid())
);

-- Lecture réservée au responsable principal (MDA). L'e-mail doit être identique
-- à MAIN_ADMIN_EMAIL dans src/lib/adminProfiles.js.
drop policy if exists "admin_activity_select_main" on public.admin_activity_log;
create policy "admin_activity_select_main"
on public.admin_activity_log for select
to authenticated
using (
  lower(coalesce(auth.jwt() ->> 'email', '')) = 'agwfmhmd@gmail.com'
  and exists (select 1 from public.admins a where a.id = auth.uid())
);

-- Aucune politique update / delete : personne ne peut modifier ni effacer le journal.
revoke all on public.admin_activity_log from anon;
grant select, insert on public.admin_activity_log to authenticated;

-- ---------------------------------------------------------------------
-- 2) Enregistrer les 5 responsables dans public.admins
--    (uniquement ceux dont le compte existe déjà dans Authentication)
-- ---------------------------------------------------------------------
do $$
begin
  insert into public.admins (id)
  select u.id
  from auth.users u
  where lower(u.email) in (
    'agwfmhmd@gmail.com',
    'elhousseinainina58@gmail.com',
    'mahmoudneine594@gmail.com',
    'encadrement@gmail.com',
    'toutoukhatri443@gmail.com'
  )
  and not exists (select 1 from public.admins a where a.id = u.id);
exception when others then
  raise notice 'Insertion dans public.admins impossible automatiquement (%). Ajoutez les identifiants manuellement : insert into public.admins (id) values (''<uuid de l utilisateur>'');', sqlerrm;
end $$;

-- ---------------------------------------------------------------------
-- 3) Modification d'une réponse déjà envoyée
--    Le répondant est reconnu par son respondent_id (UUID aléatoire stocké
--    dans son navigateur) : lui seul peut relire / modifier sa réponse.
-- ---------------------------------------------------------------------
create or replace function public.get_my_survey_answers(p_survey_id text, p_respondent_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_response_id public.survey_responses.id%type;
begin
  if p_respondent_id is null or length(p_respondent_id) < 8 then
    return '[]'::jsonb;
  end if;

  select r.id into v_response_id
  from public.survey_responses r
  where r.survey_id::text = p_survey_id
    and r.respondent_id::text = p_respondent_id
  order by r.created_at asc
  limit 1;

  if v_response_id is null then
    return '[]'::jsonb;
  end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'question_id',  a.question_id,
      'answer_value', a.answer_value,
      'answer_text',  a.answer_text
    ))
    from public.survey_answers a
    where a.response_id = v_response_id
  ), '[]'::jsonb);
end;
$$;

create or replace function public.update_survey_response(
  p_survey_id text,
  p_respondent_id text,
  p_question_ids text[],
  p_answers jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_response_id public.survey_responses.id%type;
begin
  if p_respondent_id is null or length(p_respondent_id) < 8 then
    raise exception 'INVALID_RESPONDENT';
  end if;
  if p_answers is null or jsonb_typeof(p_answers) <> 'array' then
    raise exception 'INVALID_ANSWERS';
  end if;

  select r.id into v_response_id
  from public.survey_responses r
  join public.surveys s on s.id = r.survey_id
  where r.survey_id::text = p_survey_id
    and r.respondent_id::text = p_respondent_id
    and s.active
  order by r.created_at asc
  limit 1;

  if v_response_id is null then
    raise exception 'RESPONSE_NOT_FOUND';
  end if;

  -- Remplace uniquement les réponses des questions affichées dans le formulaire.
  delete from public.survey_answers a
  where a.response_id = v_response_id
    and a.question_id::text = any (coalesce(p_question_ids, array[]::text[]));

  insert into public.survey_answers (response_id, question_id, answer_value, answer_text)
  select v_response_id, x.question_id, x.answer_value, x.answer_text
  from jsonb_populate_recordset(null::public.survey_answers, p_answers) x
  where x.question_id is not null
    and x.question_id::text = any (coalesce(p_question_ids, array[]::text[]))
    and exists (
      select 1 from public.survey_questions q
      where q.id = x.question_id and q.survey_id::text = p_survey_id
    );

  update public.survey_responses set updated_at = now() where id = v_response_id;
  return true;
end;
$$;

revoke all on function public.get_my_survey_answers(text, text) from public;
revoke all on function public.update_survey_response(text, text, text[], jsonb) from public;
grant execute on function public.get_my_survey_answers(text, text) to anon, authenticated;
grant execute on function public.update_survey_response(text, text, text[], jsonb) to anon, authenticated;
