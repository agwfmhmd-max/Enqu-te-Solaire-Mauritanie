-- Questions complémentaires pour valider la demande et la capacité de paiement.
-- Migration idempotente : n'efface aucune donnée existante.
insert into public.survey_questions (survey_id, question_ar, question_fr, question_type, required, active, sort_order)
select s.id, v.question_ar, v.question_fr, 'single_choice', true, true, v.sort_order
from public.surveys s cross join (values
 ('ما هو نطاق دخلك الشهري؟','Quelle est votre tranche de revenu mensuel ?',19),
 ('ما هو السعر الشهري المقبول بالنسبة لك؟','Quel montant mensuel serait acceptable pour vous ?',20),
 ('ما هو السعر الإجمالي المقبول للنظام؟','Quel prix total serait acceptable pour le système ?',21)
) v(question_ar,question_fr,sort_order)
where s.slug='solar-payg-mauritanie-2027' and not exists (select 1 from public.survey_questions q where q.survey_id=s.id and lower(trim(q.question_fr))=lower(trim(v.question_fr)));
insert into public.survey_options (question_id,label_ar,label_fr,value,sort_order)
select q.id,v.label_ar,v.label_fr,v.value,v.sort_order from public.survey_questions q join (values
 ('Quelle est votre tranche de revenu mensuel ?','أقل من 10,000 أوقية','Moins de 10 000 MRU','lt_10000',1),('Quelle est votre tranche de revenu mensuel ?','بين 10,000 و20,000 أوقية','Entre 10 000 et 20 000 MRU','10000_20000',2),('Quelle est votre tranche de revenu mensuel ?','بين 20,000 و40,000 أوقية','Entre 20 000 et 40 000 MRU','20000_40000',3),('Quelle est votre tranche de revenu mensuel ?','أكثر من 40,000 أوقية','Plus de 40 000 MRU','gt_40000',4),
 ('Quel montant mensuel serait acceptable pour vous ?','أقل من 1 000 أوقية','Moins de 1 000 MRU','lt_1000',1),('Quel montant mensuel serait acceptable pour vous ?','بين 1 000 و2 000 أوقية','Entre 1 000 et 2 000 MRU','1000_2000',2),('Quel montant mensuel serait acceptable pour vous ?','بين 2 000 و4 000 أوقية','Entre 2 000 et 4 000 MRU','2000_4000',3),('Quel montant mensuel serait acceptable pour vous ?','أكثر من 4 000 أوقية','Plus de 4 000 MRU','gt_4000',4),
 ('Quel prix total serait acceptable pour le système ?','أقل من 100 000 MRU','Moins de 100 000 MRU','lt_100000',1),('Quel prix total serait acceptable pour le système ?','بين 100 000 و200 000 MRU','Entre 100 000 et 200 000 MRU','100000_200000',2),('Quel prix total serait acceptable pour le système ?','بين 200 000 و350 000 MRU','Entre 200 000 et 350 000 MRU','200000_350000',3),('Quel prix total serait acceptable pour le système ?','أكثر من 350 000 MRU','Plus de 350 000 MRU','gt_350000',4)
) v(question_fr,label_ar,label_fr,value,sort_order) on lower(trim(q.question_fr))=lower(trim(v.question_fr)) where not exists (select 1 from public.survey_options o where o.question_id=q.id);
