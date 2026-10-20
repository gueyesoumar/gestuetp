-- 00339 - Gëstu Vendor (RFC 0020 Lot 1) : valeurs d'enum.
-- Migration DEDIEE : Postgres interdit d'ajouter une valeur d'enum et de l'utiliser
-- dans la meme transaction. Les usages (catalogue, arete, RPC) arrivent en 00340+.

alter type public.relationship_nature add value if not exists 'supplier';
alter type public.org_capability add value if not exists 'vendor';
