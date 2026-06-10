-- Índice de búsqueda full-text en español para el Digesto Legislativo
CREATE INDEX IF NOT EXISTS expediente_fts_idx ON "Expediente"
USING GIN (to_tsvector('spanish', coalesce("caratula", '') || ' ' || coalesce("descripcion", '') || ' ' || coalesce("textoCompleto", '')));
