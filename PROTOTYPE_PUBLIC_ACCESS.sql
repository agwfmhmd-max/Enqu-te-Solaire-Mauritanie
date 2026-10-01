-- يتيح لملف prototype (index.html) قراءة النتائج المجمعة للاستبيان الجديد.
-- Permet au prototype (index.html) de lire les résultats agrégés du sondage.
--
-- Sûr et rejouable :
--   • ne supprime ni ne modifie aucune donnée ;
--   • n’expose que des vues agrégées (aucune donnée personnelle, aucun respondent_id) ;
--   • les tables team_members, surveys et survey_questions sont déjà lisibles publiquement
--     (c’est ce qu’utilise l’application du sondage), rien à ajouter pour elles.

do $$
begin
  if to_regclass('public.public_survey_results') is not null then
    grant select on public.public_survey_results to anon, authenticated;
  end if;
  if to_regclass('public.public_survey_participant_counts') is not null then
    grant select on public.public_survey_participant_counts to anon, authenticated;
  end if;
end $$;
