import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TesteRow } from '@/types/excel';

export const useReferenceData = () => {
  const [referenceData, setReferenceData] = useState<TesteRow[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadReferenceData = async () => {
    try {
      const { data, error } = await supabase
        .from('reference_data')
        .select('data')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Erro ao carregar dados de referência:', error);
        return;
      }

      if (data) {
        setReferenceData(data.data as TesteRow[]);
      }
    } catch (error) {
      console.error('Erro ao carregar dados de referência:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveReferenceData = async (data: TesteRow[]) => {
    try {
      // Delete existing reference data
      await supabase
        .from('reference_data')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      // Insert new reference data
      const { error } = await supabase
        .from('reference_data')
        .insert({ data: data as any });

      if (error) {
        console.error('Erro ao salvar dados de referência:', error);
        throw error;
      }

      setReferenceData(data);
    } catch (error) {
      console.error('Erro ao salvar dados de referência:', error);
      throw error;
    }
  };

  useEffect(() => {
    loadReferenceData();
  }, []);

  return {
    referenceData,
    isLoading,
    saveReferenceData,
    refreshReferenceData: loadReferenceData
  };
};