-- Migration 00153 (UP) : cloisonnement des écritures Storage client-branding
-- Constat audit sécurité #5 (moyen) : les policies d'écriture du bucket
-- client-branding (00128) n'avaient pour seul prédicat que
-- `bucket_id = 'client-branding'`, sans contrôle de tenant ni de chemin.
-- N'importe quel compte authenticated pouvait donc écrire/écraser/supprimer
-- le logo d'un client d'un AUTRE cabinet via l'API Storage REST (IDOR).
--
-- Convention de chemin : client-logos/<cabinet_clients.id>/<timestamp>_<name>
-- => (storage.foldername(name))[1] = 'client-logos'
--    (storage.foldername(name))[2] = cabinet_clients.id
--
-- On restreint désormais chaque écriture au cabinet propriétaire de la fiche
-- client (cc.cabinet_id = get_my_organization_id()). Pour role=client,
-- get_my_organization_id() renvoie NULL (neutralisé en 00134) => aucune
-- écriture, ce qui est le comportement attendu (ils ne gèrent pas ces logos).
-- La lecture publique (clb_read_public) reste inchangée.

DROP POLICY IF EXISTS "clb_insert_auth" ON storage.objects;
CREATE POLICY "clb_insert_own_cabinet"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'client-branding'
    AND (storage.foldername(name))[1] = 'client-logos'
    AND EXISTS (
      SELECT 1 FROM public.cabinet_clients cc
      WHERE cc.id::text = (storage.foldername(name))[2]
        AND cc.cabinet_id = public.get_my_organization_id()
    )
  );

DROP POLICY IF EXISTS "clb_update_auth" ON storage.objects;
CREATE POLICY "clb_update_own_cabinet"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'client-branding'
    AND (storage.foldername(name))[1] = 'client-logos'
    AND EXISTS (
      SELECT 1 FROM public.cabinet_clients cc
      WHERE cc.id::text = (storage.foldername(name))[2]
        AND cc.cabinet_id = public.get_my_organization_id()
    )
  )
  WITH CHECK (
    bucket_id = 'client-branding'
    AND (storage.foldername(name))[1] = 'client-logos'
    AND EXISTS (
      SELECT 1 FROM public.cabinet_clients cc
      WHERE cc.id::text = (storage.foldername(name))[2]
        AND cc.cabinet_id = public.get_my_organization_id()
    )
  );

DROP POLICY IF EXISTS "clb_delete_auth" ON storage.objects;
CREATE POLICY "clb_delete_own_cabinet"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'client-branding'
    AND (storage.foldername(name))[1] = 'client-logos'
    AND EXISTS (
      SELECT 1 FROM public.cabinet_clients cc
      WHERE cc.id::text = (storage.foldername(name))[2]
        AND cc.cabinet_id = public.get_my_organization_id()
    )
  );
