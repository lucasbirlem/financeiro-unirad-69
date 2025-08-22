-- Fix security warning: Set search_path for function
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER update_reference_data_updated_at
    BEFORE UPDATE ON public.reference_data
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();