-- GrantAssist Moldova: Seed Data
-- 3 sample Moldovan grants with realistic data and application fields

-- =============================================================================
-- GRANTS
-- =============================================================================

-- 1. AIPA - Agricultural equipment grant
INSERT INTO public.grants (
  id, name, provider_agency, description, max_funding, currency, deadline,
  status, source_type, eligibility_rules, scoring_rubric, required_documents,
  created_at
) VALUES (
  'a1111111-1111-1111-1111-111111111111',
  'Subventii pentru mecanizarea agriculturii',
  'AIPA (Agentia de Interventie si Plati pentru Agricultura)',
  'Programul de subventionare a achizitiei de utilaje si echipamente agricole pentru fermieri si intreprinderi agricole din Republica Moldova. Acoperire pana la 50% din costul echipamentului.',
  500000,
  'MDL',
  '2026-06-30T23:59:59Z',
  'active',
  'manual',
  '[
    {"rule": "Compania trebuie sa fie inregistrata in Republica Moldova", "field": "location", "operator": "equals", "value": "Moldova"},
    {"rule": "Domeniul de activitate trebuie sa fie agricultura", "field": "industry", "operator": "contains", "value": "agricol"},
    {"rule": "Compania trebuie sa aiba cel putin 1 an de activitate", "field": "company_age", "operator": "gte", "value": 1}
  ]'::jsonb,
  '{
    "criteria": [
      {"name": "Relevanta proiectului", "weight": 30, "description": "Cat de bine se aliniaza proiectul cu obiectivele programului de dezvoltare agricola"},
      {"name": "Capacitatea de implementare", "weight": 25, "description": "Experienta echipei si resursele disponibile pentru implementarea proiectului"},
      {"name": "Impactul economic", "weight": 25, "description": "Numarul de locuri de munca create si cresterea productivitatii estimate"},
      {"name": "Sustenabilitate", "weight": 20, "description": "Viabilitatea proiectului pe termen lung dupa finalizarea finantarii"}
    ]
  }'::jsonb,
  '[
    "Certificat de inregistrare a companiei",
    "Plan de afaceri detaliat",
    "Deviz estimativ pentru echipamente",
    "Extras din registrul bunurilor imobile",
    "Situatii financiare pe ultimii 2 ani"
  ]'::jsonb,
  now()
);

-- 2. ODA - Digital transformation grant
INSERT INTO public.grants (
  id, name, provider_agency, description, max_funding, currency, deadline,
  status, source_type, eligibility_rules, scoring_rubric, required_documents,
  created_at
) VALUES (
  'b2222222-2222-2222-2222-222222222222',
  'Granturi pentru transformare digitala a IMM-urilor',
  'ODA (Organizatia pentru Dezvoltarea Antreprenoriatului)',
  'Program de sprijin financiar pentru digitalizarea proceselor de afaceri ale intreprinderilor mici si mijlocii. Include achizitia de software, echipamente IT si instruirea personalului.',
  300000,
  'MDL',
  '2026-08-15T23:59:59Z',
  'active',
  'online_form',
  '[
    {"rule": "Compania trebuie sa fie IMM (sub 250 angajati)", "field": "company_size", "operator": "lte", "value": 250},
    {"rule": "Compania trebuie sa fie inregistrata in Moldova", "field": "location", "operator": "equals", "value": "Moldova"},
    {"rule": "Forma juridica: SRL, SA sau II", "field": "legal_form", "operator": "in", "value": ["SRL", "SA", "II"]}
  ]'::jsonb,
  '{
    "criteria": [
      {"name": "Nivelul de inovatie digitala", "weight": 35, "description": "Gradul de noutate al solutiei digitale propuse si impactul asupra eficientei operationale"},
      {"name": "Plan de implementare", "weight": 25, "description": "Claritatea etapelor, termenelor si resurselor alocate pentru implementare"},
      {"name": "Cofinantare proprie", "weight": 20, "description": "Procentul de cofinantare din resurse proprii (minim 30%)"},
      {"name": "Impact social", "weight": 20, "description": "Crearea de locuri de munca si dezvoltarea competentelor digitale ale angajatilor"}
    ]
  }'::jsonb,
  '[
    "Cerere de finantare completata",
    "Plan de afaceri cu componenta digitala",
    "Oferte de pret de la furnizori de solutii IT",
    "Declaratie pe proprie raspundere privind cofinantarea",
    "Certificat de inregistrare si extras IDNO"
  ]'::jsonb,
  now()
);

-- 3. EU4Moldova - Green energy grant (draft status)
INSERT INTO public.grants (
  id, name, provider_agency, description, max_funding, currency, deadline,
  status, source_type, eligibility_rules, scoring_rubric, required_documents,
  created_at
) VALUES (
  'c3333333-3333-3333-3333-333333333333',
  'Energie verde pentru afaceri sustenabile',
  'EU4Moldova / PNUD',
  'Program finantat de Uniunea Europeana pentru tranzitia la energie regenerabila a intreprinderilor moldovenesti. Subventii pentru panouri solare, pompe de caldura si sisteme de eficienta energetica.',
  750000,
  'MDL',
  '2026-09-01T23:59:59Z',
  'draft',
  'uploaded_template',
  '[
    {"rule": "Compania trebuie sa fie inregistrata in Moldova", "field": "location", "operator": "equals", "value": "Moldova"},
    {"rule": "Compania trebuie sa aiba cifra de afaceri peste 500000 MDL", "field": "revenue", "operator": "gte", "value": 500000}
  ]'::jsonb,
  '{
    "criteria": [
      {"name": "Reducerea emisiilor de CO2", "weight": 30, "description": "Estimarea reducerii emisiilor de gaze cu efect de sera ca urmare a implementarii proiectului"},
      {"name": "Fezabilitate tehnica", "weight": 25, "description": "Evaluarea tehnica a solutiei propuse si experienta furnizorului de echipamente"},
      {"name": "Raportul cost-beneficiu", "weight": 25, "description": "Eficienta investitiei in raport cu economia de energie estimata pe 10 ani"},
      {"name": "Replicabilitate", "weight": 20, "description": "Potentialul proiectului de a servi ca model pentru alte intreprinderi din sector"}
    ]
  }'::jsonb,
  '[
    "Cerere de finantare (formular EU4Moldova)",
    "Audit energetic al cladirii/facilitatii",
    "Plan de investitii detaliat",
    "Oferte de la furnizori acreditati",
    "Situatii financiare pe ultimii 3 ani",
    "Certificat de conformitate cu normele de mediu"
  ]'::jsonb,
  now()
);

-- =============================================================================
-- GRANT APPLICATION FIELDS
-- =============================================================================

-- Fields for AIPA grant (4 fields)
INSERT INTO public.grant_application_fields (grant_id, field_order, field_label, field_type, is_required, character_limit, helper_text)
VALUES
  ('a1111111-1111-1111-1111-111111111111', 1, 'Descrierea activitatii companiei', 'textarea', true, 2000, 'Descrieti pe scurt activitatea principala a companiei, experienta in domeniul agricol si resursele disponibile.'),
  ('a1111111-1111-1111-1111-111111111111', 2, 'Obiectivele proiectului', 'textarea', true, 3000, 'Enumerati obiectivele specifice ale proiectului de mecanizare si cum acestea contribuie la cresterea productivitatii.'),
  ('a1111111-1111-1111-1111-111111111111', 3, 'Bugetul estimat si justificarea costurilor', 'textarea', true, 2500, 'Prezentati bugetul detaliat pe categorii de cheltuieli si justificati fiecare cost propus.'),
  ('a1111111-1111-1111-1111-111111111111', 4, 'Impactul estimat asupra comunitatii locale', 'textarea', true, 1500, 'Descrieti impactul proiectului asupra comunitatii: locuri de munca, productie locala, dezvoltare rurala.');

-- Fields for ODA grant (3 fields)
INSERT INTO public.grant_application_fields (grant_id, field_order, field_label, field_type, is_required, character_limit, helper_text)
VALUES
  ('b2222222-2222-2222-2222-222222222222', 1, 'Descrierea solutiei digitale propuse', 'textarea', true, 3000, 'Descrieti solutia digitala pe care doriti sa o implementati, functionalitatile principale si furnizorul ales.'),
  ('b2222222-2222-2222-2222-222222222222', 2, 'Planul de implementare si termenele', 'textarea', true, 2500, 'Prezentati etapele de implementare, termenele pentru fiecare etapa si echipa responsabila.'),
  ('b2222222-2222-2222-2222-222222222222', 3, 'Rezultatele asteptate si indicatorii de performanta', 'textarea', true, 2000, 'Enumerati rezultatele masurabile asteptate: cresterea eficientei, reducerea costurilor, numar de angajati instruiti.');

-- Fields for EU4Moldova grant (4 fields)
INSERT INTO public.grant_application_fields (grant_id, field_order, field_label, field_type, is_required, character_limit, helper_text)
VALUES
  ('c3333333-3333-3333-3333-333333333333', 1, 'Descrierea situatiei energetice actuale', 'textarea', true, 2000, 'Prezentati consumul energetic actual al companiei, sursele de energie utilizate si costurile anuale.'),
  ('c3333333-3333-3333-3333-333333333333', 2, 'Solutia de energie verde propusa', 'textarea', true, 3000, 'Descrieti echipamentele si tehnologiile propuse, capacitatea estimata si furnizorul ales.'),
  ('c3333333-3333-3333-3333-333333333333', 3, 'Analiza cost-beneficiu pe 10 ani', 'textarea', true, 2500, 'Prezentati calculul economiei de energie, reducerea emisiilor CO2 si termenul de recuperare a investitiei.'),
  ('c3333333-3333-3333-3333-333333333333', 4, 'Planul de mentenanta si sustenabilitate', 'textarea', true, 1500, 'Descrieti cum veti asigura functionarea pe termen lung a echipamentelor si planul de mentenanta.');
