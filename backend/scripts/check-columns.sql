SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'evolution_r2' AND table_name = 'Setting'
ORDER BY ordinal_position;
