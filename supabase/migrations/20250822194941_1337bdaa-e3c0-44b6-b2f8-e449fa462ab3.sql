-- Create table to store reference file data
CREATE TABLE public.reference_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.reference_data ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (since this is a single reference file for the app)
CREATE POLICY "Allow all operations on reference_data" 
ON public.reference_data 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_reference_data_updated_at
    BEFORE UPDATE ON public.reference_data
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();