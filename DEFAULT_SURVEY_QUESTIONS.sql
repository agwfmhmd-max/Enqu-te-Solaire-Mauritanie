-- Questions du sondage Solar PAYG Mauritanie 2027 — à exécuter une seule fois.
-- أسئلة استبيان Solar PAYG موريتانيا 2027 — شغّل الملف مرة واحدة في Supabase.
--
-- Ce script est sûr et rejouable :
--   • il ne supprime et ne modifie aucune donnée existante (ancien sondage compris) ;
--   • il crée le sondage « solar-payg-mauritanie-2027 » seulement s’il n’existe pas déjà ;
--   • les questions et options déjà présentes sont ignorées et restent modifiables depuis l’espace admin.

-- 0) Création du sondage (si absent)
insert into public.surveys (slug, title_ar, title_fr, active)
select 'solar-payg-mauritanie-2027', 'دراسة جدوى لشركة تمويل الطاقة الشمسية بالدفع المسبق (PAYG) في موريتانيا', 'Étude de faisabilité d’une entreprise de financement PAYG de l’énergie solaire en Mauritanie', true
where not exists (select 1 from public.surveys where slug = 'solar-payg-mauritanie-2027');

-- 1) Questions
insert into public.survey_questions
  (survey_id, question_ar, question_fr, question_type, required, active, sort_order)
select
  s.id, seed.question_ar, seed.question_fr, seed.question_type, seed.required, true,
  coalesce((select max(existing.sort_order) from public.survey_questions existing where existing.survey_id = s.id), 0) + seed.sort_order
from public.surveys s
cross join (values
  ('كم عمرك؟', 'Quel âge avez-vous ?', 'number', true, 1),
  ('ما هو توصيفك الأقرب؟', 'Quel est votre profil principal ?', 'single_choice', true, 2),
  ('في أي ولاية تقيم؟', 'Dans quelle wilaya résidez-vous ?', 'single_choice', true, 3),
  ('ما هو مصدر الكهرباء الرئيسي لديك حاليًا؟', 'Quelle est votre principale source d’électricité actuellement ?', 'single_choice', true, 4),
  ('كم تنفق شهريًا على الطاقة (إنارة، شحن، وقود المولد)؟', 'Combien dépensez-vous par mois pour l’énergie (éclairage, recharge, carburant du groupe) ?', 'single_choice', true, 5),
  ('ما الاستخدامات التي ترغب في تشغيلها بالطاقة الشمسية؟', 'Quels usages souhaiteriez-vous alimenter avec l’énergie solaire ?', 'multiple_choice', true, 6),
  ('هل تعرف مفهوم الدفع المسبق حسب الاستهلاك (PAYG) للطاقة الشمسية؟', 'Connaissez-vous le principe du paiement à l’usage (PAYG) pour l’énergie solaire ?', 'single_choice', true, 7),
  ('هل أنت مستعد لاقتناء نظام شمسي بالدفع بالتقسيط (PAYG)؟', 'Seriez-vous prêt à acquérir un kit solaire en paiement échelonné PAYG ?', 'single_choice', true, 8),
  ('أي نظام شمسي يناسب احتياجك أكثر؟', 'Quel kit solaire correspondrait le mieux à vos besoins ?', 'single_choice', true, 9),
  ('ما تكرار الدفع الذي تفضله؟', 'Quelle fréquence de paiement préférez-vous ?', 'single_choice', true, 10),
  ('ما مدة التمويل الأنسب لك؟', 'Quelle durée de financement vous conviendrait le mieux ?', 'single_choice', true, 11),
  ('ما الدفعة المقدمة التي تستطيع تسديدها؟', 'Quel acompte initial pourriez-vous verser ?', 'single_choice', true, 12),
  ('ما هي المحافظ الرقمية التي تستخدمها؟', 'Quels portefeuilles de paiement mobile utilisez-vous ?', 'multiple_choice', true, 13),
  ('هل تقبل الإغلاق الآلي عن بُعد للجهاز عند تأخر السداد؟', 'Accepteriez-vous le verrouillage automatique à distance de l’équipement en cas de retard de paiement ?', 'single_choice', true, 14),
  ('هل يهمك التأمين الأصغر المدمج ضد السرقة والعواصف الرملية والأعطال؟', 'La micro-assurance intégrée (vol, tempêtes de sable, casse) vous intéresse-t-elle ?', 'single_choice', true, 15),
  ('ما أبرز العوائق أمام اقتناء نظام شمسي بالتقسيط؟', 'Quels sont les principaux freins à l’achat d’un kit solaire en paiement échelonné ?', 'multiple_choice', true, 16),
  ('ما العامل الأهم عند اختيار مزود الطاقة الشمسية؟', 'Quel facteur est le plus important dans le choix d’un fournisseur solaire ?', 'single_choice', true, 17),
  ('ما اقتراحك أو ملاحظتك حول تمويل الطاقة الشمسية بالدفع المسبق؟', 'Quelle est votre suggestion concernant le financement solaire PAYG ?', 'text', false, 18)
) as seed(question_ar, question_fr, question_type, required, sort_order)
where s.slug = 'solar-payg-mauritanie-2027'
  and s.active = true
  and not exists (
    select 1 from public.survey_questions existing
    where existing.survey_id = s.id
      and lower(trim(existing.question_fr)) = lower(trim(seed.question_fr))
  );

-- 2) Options de réponse (uniquement pour les questions de ce sondage qui n’en ont pas encore)
insert into public.survey_options (question_id, label_ar, label_fr, value, sort_order)
select q.id, seed.label_ar, seed.label_fr, seed.value, seed.sort_order
from public.survey_questions q
join public.surveys s on s.id = q.survey_id and s.slug = 'solar-payg-mauritanie-2027'
join (values
  ('Quel est votre profil principal ?', 'أسرة في منطقة ريفية', 'Ménage en zone rurale', 'menage_rural', 1),
  ('Quel est votre profil principal ?', 'أسرة في منطقة حضرية أو شبه حضرية', 'Ménage en zone urbaine ou périurbaine', 'menage_urbain', 2),
  ('Quel est votre profil principal ?', 'صاحب متجر أو تاجر صغير', 'Commerçant ou boutiquier', 'commercant', 3),
  ('Quel est votre profil principal ?', 'مربي مواشي أو مزارع', 'Éleveur ou agriculteur', 'eleveur_agriculteur', 4),
  ('Quel est votre profil principal ?', 'نشاط آخر', 'Autre profil', 'autre', 5),
  ('Dans quelle wilaya résidez-vous ?', 'أدرار', 'Adrar', 'adrar', 1),
  ('Dans quelle wilaya résidez-vous ?', 'لعصابة', 'Assaba', 'assaba', 2),
  ('Dans quelle wilaya résidez-vous ?', 'لبراكنة', 'Brakna', 'brakna', 3),
  ('Dans quelle wilaya résidez-vous ?', 'داخلت نواذيبو', 'Dakhlet Nouadhibou', 'nouadhibou', 4),
  ('Dans quelle wilaya résidez-vous ?', 'كوركول', 'Gorgol', 'gorgol', 5),
  ('Dans quelle wilaya résidez-vous ?', 'كيدي ماغا', 'Guidimaka', 'guidimaka', 6),
  ('Dans quelle wilaya résidez-vous ?', 'الحوض الشرقي', 'Hodh Ech Chargui', 'hodh_chargui', 7),
  ('Dans quelle wilaya résidez-vous ?', 'الحوض الغربي', 'Hodh El Gharbi', 'hodh_gharbi', 8),
  ('Dans quelle wilaya résidez-vous ?', 'إنشيري', 'Inchiri', 'inchiri', 9),
  ('Dans quelle wilaya résidez-vous ?', 'نواكشوط الغربية', 'Nouakchott Ouest', 'nouakchott_ouest', 10),
  ('Dans quelle wilaya résidez-vous ?', 'نواكشوط الشمالية', 'Nouakchott Nord', 'nouakchott_nord', 11),
  ('Dans quelle wilaya résidez-vous ?', 'نواكشوط الجنوبية', 'Nouakchott Sud', 'nouakchott_sud', 12),
  ('Dans quelle wilaya résidez-vous ?', 'تكانت', 'Tagant', 'tagant', 13),
  ('Dans quelle wilaya résidez-vous ?', 'تيرس زمور', 'Tiris Zemmour', 'tiris_zemmour', 14),
  ('Dans quelle wilaya résidez-vous ?', 'ترارزة', 'Trarza', 'trarza', 15),
  ('Quelle est votre principale source d’électricité actuellement ?', 'شبكة الكهرباء العمومية بشكل منتظم', 'Réseau public, accès régulier', 'reseau_regulier', 1),
  ('Quelle est votre principale source d’électricité actuellement ?', 'شبكة الكهرباء مع انقطاعات متكررة', 'Réseau public, coupures fréquentes', 'reseau_intermittent', 2),
  ('Quelle est votre principale source d’électricité actuellement ?', 'مولد كهربائي', 'Groupe électrogène', 'groupe', 3),
  ('Quelle est votre principale source d’électricité actuellement ?', 'نظام شمسي قائم', 'Système solaire existant', 'solaire_existant', 4),
  ('Quelle est votre principale source d’électricité actuellement ?', 'لا يوجد وصول للكهرباء', 'Aucun accès à l’électricité', 'aucun', 5),
  ('Combien dépensez-vous par mois pour l’énergie (éclairage, recharge, carburant du groupe) ?', 'أقل من 5,000 أوقية', 'Moins de 5 000 MRU', 'lt_5000', 1),
  ('Combien dépensez-vous par mois pour l’énergie (éclairage, recharge, carburant du groupe) ?', 'بين 5,000 و15,000 أوقية', 'Entre 5 000 et 15 000 MRU', '5000_15000', 2),
  ('Combien dépensez-vous par mois pour l’énergie (éclairage, recharge, carburant du groupe) ?', 'بين 15,000 و30,000 أوقية', 'Entre 15 000 et 30 000 MRU', '15000_30000', 3),
  ('Combien dépensez-vous par mois pour l’énergie (éclairage, recharge, carburant du groupe) ?', 'أكثر من 30,000 أوقية', 'Plus de 30 000 MRU', 'gt_30000', 4),
  ('Quels usages souhaiteriez-vous alimenter avec l’énergie solaire ?', 'الإنارة وشحن الهواتف', 'Éclairage et recharge de téléphones', 'eclairage_charge', 1),
  ('Quels usages souhaiteriez-vous alimenter avec l’énergie solaire ?', 'التلفزيون', 'Télévision', 'television', 2),
  ('Quels usages souhaiteriez-vous alimenter avec l’énergie solaire ?', 'المروحة', 'Ventilateur', 'ventilateur', 3),
  ('Quels usages souhaiteriez-vous alimenter avec l’énergie solaire ?', 'المجمد أو الثلاجة للمتجر', 'Congélateur ou réfrigérateur de commerce', 'congelateur', 4),
  ('Quels usages souhaiteriez-vous alimenter avec l’énergie solaire ?', 'معدات إنتاجية (مضخة، ورشة)', 'Équipement productif (pompe, atelier)', 'productif', 5),
  ('Connaissez-vous le principe du paiement à l’usage (PAYG) pour l’énergie solaire ?', 'نعم وأعرف فكرته', 'Oui, j’en connais le principe', 'oui_connu', 1),
  ('Connaissez-vous le principe du paiement à l’usage (PAYG) pour l’énergie solaire ?', 'سمعت عنه فقط', 'J’en ai seulement entendu parler', 'entendu', 2),
  ('Connaissez-vous le principe du paiement à l’usage (PAYG) pour l’énergie solaire ?', 'لا', 'Non', 'non', 3),
  ('Seriez-vous prêt à acquérir un kit solaire en paiement échelonné PAYG ?', 'نعم', 'Oui', 'oui', 1),
  ('Seriez-vous prêt à acquérir un kit solaire en paiement échelonné PAYG ?', 'ربما', 'Peut-être', 'peut_etre', 2),
  ('Seriez-vous prêt à acquérir un kit solaire en paiement échelonné PAYG ?', 'لا', 'Non', 'non', 3),
  ('Quel kit solaire correspondrait le mieux à vos besoins ?', 'نظام الإنارة والشحن (حوالي 80,000 أوقية)', 'Kit éclairage et chargeur (environ 80 000 MRU)', 'kit_eclairage', 1),
  ('Quel kit solaire correspondrait le mieux à vos besoins ?', 'النظام العائلي (حوالي 180,000 أوقية)', 'Kit confort familial (environ 180 000 MRU)', 'kit_familial', 2),
  ('Quel kit solaire correspondrait le mieux à vos besoins ?', 'النظام الإنتاجي أو التجاري (حوالي 350,000 أوقية)', 'Kit productif ou commercial (environ 350 000 MRU)', 'kit_productif', 3),
  ('Quel kit solaire correspondrait le mieux à vos besoins ?', 'لا يهمني أي نظام شمسي', 'Aucun kit ne m’intéresse', 'aucun', 4),
  ('Quelle fréquence de paiement préférez-vous ?', 'يومي', 'Quotidienne', 'quotidienne', 1),
  ('Quelle fréquence de paiement préférez-vous ?', 'أسبوعي', 'Hebdomadaire', 'hebdomadaire', 2),
  ('Quelle fréquence de paiement préférez-vous ?', 'شهري', 'Mensuelle', 'mensuelle', 3),
  ('Quelle fréquence de paiement préférez-vous ?', 'حسب مواسم الدخل', 'Selon mes revenus saisonniers', 'saisonniere', 4),
  ('Quelle durée de financement vous conviendrait le mieux ?', '6 أشهر', '6 mois', '6_mois', 1),
  ('Quelle durée de financement vous conviendrait le mieux ?', '12 شهرًا', '12 mois', '12_mois', 2),
  ('Quelle durée de financement vous conviendrait le mieux ?', '18 شهرًا', '18 mois', '18_mois', 3),
  ('Quelle durée de financement vous conviendrait le mieux ?', '24 شهرًا', '24 mois', '24_mois', 4),
  ('Quel acompte initial pourriez-vous verser ?', 'أقل من 10%', 'Moins de 10 %', 'lt_10', 1),
  ('Quel acompte initial pourriez-vous verser ?', 'حوالي 10%', 'Environ 10 %', 'acompte_10', 2),
  ('Quel acompte initial pourriez-vous verser ?', 'حوالي 20%', 'Environ 20 %', 'acompte_20', 3),
  ('Quel acompte initial pourriez-vous verser ?', '30% أو أكثر', '30 % ou plus', 'gte_30', 4),
  ('Quels portefeuilles de paiement mobile utilisez-vous ?', 'Bankily', 'Bankily', 'bankily', 1),
  ('Quels portefeuilles de paiement mobile utilisez-vous ?', 'Masrivi', 'Masrivi', 'masrivi', 2),
  ('Quels portefeuilles de paiement mobile utilisez-vous ?', 'Sedad', 'Sedad', 'sedad', 3),
  ('Quels portefeuilles de paiement mobile utilisez-vous ?', 'Click', 'Click', 'click', 4),
  ('Quels portefeuilles de paiement mobile utilisez-vous ?', 'لا أستخدم أي محفظة (الدفع نقدًا)', 'Aucun, je paie en espèces', 'especes', 5),
  ('Accepteriez-vous le verrouillage automatique à distance de l’équipement en cas de retard de paiement ?', 'نعم', 'Oui', 'oui', 1),
  ('Accepteriez-vous le verrouillage automatique à distance de l’équipement en cas de retard de paiement ?', 'نعم مع مهلة سماح', 'Oui, avec un délai de grâce', 'oui_delai', 2),
  ('Accepteriez-vous le verrouillage automatique à distance de l’équipement en cas de retard de paiement ?', 'لا', 'Non', 'non', 3),
  ('La micro-assurance intégrée (vol, tempêtes de sable, casse) vous intéresse-t-elle ?', 'نعم', 'Oui', 'oui', 1),
  ('La micro-assurance intégrée (vol, tempêtes de sable, casse) vous intéresse-t-elle ?', 'نعم إذا بقي القسط منخفضًا', 'Oui, si la prime reste faible', 'oui_si_prix', 2),
  ('La micro-assurance intégrée (vol, tempêtes de sable, casse) vous intéresse-t-elle ?', 'لا', 'Non', 'non', 3),
  ('Quels sont les principaux freins à l’achat d’un kit solaire en paiement échelonné ?', 'التكلفة الأولية', 'Coût initial', 'cout_initial', 1),
  ('Quels sont les principaux freins à l’achat d’un kit solaire en paiement échelonné ?', 'ضعف الثقة في الشركة الموردة', 'Manque de confiance envers le fournisseur', 'confiance', 2),
  ('Quels sont les principaux freins à l’achat d’un kit solaire en paiement échelonné ?', 'ضعف تغطية الشبكة', 'Couverture réseau insuffisante', 'reseau', 3),
  ('Quels sont les principaux freins à l’achat d’un kit solaire en paiement échelonné ?', 'قلة المعرفة بالخدمة', 'Méconnaissance du service', 'meconnaissance', 4),
  ('Quels sont les principaux freins à l’achat d’un kit solaire en paiement échelonné ?', 'الخوف من الإغلاق عن بُعد', 'Crainte du verrouillage à distance', 'verrouillage', 5),
  ('Quels sont les principaux freins à l’achat d’un kit solaire en paiement échelonné ?', 'غياب الصيانة المحلية', 'Absence de service après-vente local', 'sav', 6),
  ('Quel facteur est le plus important dans le choix d’un fournisseur solaire ?', 'السعر', 'Le prix', 'prix', 1),
  ('Quel facteur est le plus important dans le choix d’un fournisseur solaire ?', 'جودة الجهاز وضمانه', 'La qualité et la garantie', 'qualite', 2),
  ('Quel facteur est le plus important dans le choix d’un fournisseur solaire ?', 'الصيانة المحلية بعد البيع', 'Le service après-vente local', 'sav', 3),
  ('Quel facteur est le plus important dans le choix d’un fournisseur solaire ?', 'مرونة الدفع', 'La flexibilité de paiement', 'flexibilite', 4)
) as seed(question_fr, label_ar, label_fr, value, sort_order)
  on lower(trim(q.question_fr)) = lower(trim(seed.question_fr))
where q.question_type in ('single_choice', 'multiple_choice')
  and not exists (
    select 1 from public.survey_options existing
    where existing.question_id = q.id
  );
