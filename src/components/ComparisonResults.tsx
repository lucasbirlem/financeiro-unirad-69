import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, CheckCircle, AlertCircle } from 'lucide-react';
import { TesteRow } from '@/types/excel';
import { ExcelProcessor } from '@/utils/excelProcessor';

interface ComparisonResultsProps {
  results?: {
    matched: TesteRow[];
    discrepancies: Array<{ row: TesteRow; issues: string[] }>;
  };
  processedData?: TesteRow[];
  mode: 'model1' | 'model2';
  vencimentoStartDate?: Date;
  vencimentoEndDate?: Date;
  onReset?: () => void;
}

export const ComparisonResults = ({ results, processedData, mode, vencimentoStartDate, vencimentoEndDate, onReset }: ComparisonResultsProps) => {
  const handleDownload = () => {
    if (mode === 'model1' && processedData) {
      ExcelProcessor.exportToExcel(processedData, 'modelo1_processado.xlsx');
    } else if (mode === 'model2' && results) {
      let allData = [...results.matched, ...results.discrepancies.map(d => d.row)];
      
      // Aplicar filtro por vencimento se as datas foram selecionadas
      if (vencimentoStartDate && vencimentoEndDate) {
        allData = ExcelProcessor.filterByDateRange(
          allData,
          vencimentoStartDate.toISOString().split('T')[0],
          vencimentoEndDate.toISOString().split('T')[0],
          'vencimento'
        );
      }
      
      ExcelProcessor.exportToExcel(
        allData, 
        'modelo2_comparacao_banco.xlsx',
        results.discrepancies
      );
    }
    
    // Reset após download
    if (onReset) {
      onReset();
    }
  };

  if (mode === 'model1' && processedData) {
    return (
      <Card className="p-6 shadow-elegant">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Processamento Concluído</h3>
            <Badge variant="default" className="bg-success text-success-foreground">
              {processedData.length} registros processados
            </Badge>
          </div>
          
          <p className="text-muted-foreground">
            Os dados do RelCartõesDisponíveis foram convertidos para o formato TESTE.
            Líquido e Desconto foram zerados conforme solicitado.
          </p>

          <div className="pt-4">
            <Button onClick={handleDownload} className="w-full">
              <Download className="mr-2 h-4 w-4" />
              Baixar Arquivo Processado
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  if (mode === 'model2' && results) {
    return (
      <Card className="p-6 shadow-elegant">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Resultado da Comparação</h3>
            <div className="flex gap-2">
              <Badge variant="default" className="bg-success text-success-foreground">
                <CheckCircle className="mr-1 h-3 w-3" />
                {results.matched.length} correspondentes
              </Badge>
              <Badge variant="destructive">
                <AlertCircle className="mr-1 h-3 w-3" />
                {results.discrepancies.length} divergências
              </Badge>
            </div>
          </div>

          {results.discrepancies.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-destructive">Divergências Encontradas:</h4>
              <div className="max-h-60 overflow-y-auto space-y-2">
                {results.discrepancies.map((discrepancy, index) => (
                  <Card key={index} className="p-3 border-destructive/20 bg-destructive-light">
                    <div className="text-sm">
                      <p className="font-medium">
                        {discrepancy.row.AUTORIZADOR} - {discrepancy.row.BANDEIRA}
                      </p>
                      <ul className="mt-1 text-destructive text-xs space-y-1">
                        {discrepancy.issues.map((issue, i) => (
                          <li key={i}>• {issue}</li>
                        ))}
                      </ul>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          <div className="pt-4">
            <Button onClick={handleDownload} className="w-full">
              <Download className="mr-2 h-4 w-4" />
              Baixar Relatório com Divergências Destacadas
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return null;
};