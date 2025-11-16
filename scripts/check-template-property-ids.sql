-- Check the actual property_id values in your templates
SELECT 
    t.id,
    t.template_key,
    t.name,
    t.property_id,
    p.name as property_name,
    t.is_active,
    t.updated_at
FROM email_templates t
LEFT JOIN properties p ON t.property_id = p.id
ORDER BY t.template_key;

-- Check if you have the unique constraint issue
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'email_templates'
  AND (indexname LIKE '%template_key%' OR indexname LIKE '%property%')
ORDER BY indexname;

-- Check for the old unique constraint that prevents property-specific templates
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'email_templates'::regclass
  AND (conname LIKE '%template_key%' OR conname LIKE '%property%');



