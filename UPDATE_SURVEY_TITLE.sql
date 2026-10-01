-- Met à jour uniquement les titres du sondage Solar PAYG (aucune question, option ou réponse n’est touchée).
-- يحدّث عنوان استبيان Solar PAYG فقط، دون المساس بالأسئلة أو الخيارات أو الإجابات.
update public.surveys
set title_fr = 'Étude de faisabilité d’une entreprise de financement PAYG de l’énergie solaire en Mauritanie',
    title_ar = 'دراسة جدوى لشركة تمويل الطاقة الشمسية بالدفع المسبق (PAYG) في موريتانيا'
where slug = 'solar-payg-mauritanie-2027';
