import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileUpload } from '@/components/FileUpload';
import { DateRangeSelector } from '@/components/DateRangeSelector';
import { ComparisonResults } from '@/components/ComparisonResults';
import { ExcelProcessor } from '@/utils/excelProcessor';
import { RelCartoesRow, TesteRow } from '@/types/excel';
import { useToast } from '@/hooks/use-toast';
import { FileText, GitCompare, BarChart3 } from 'lucide-react';

const Index = () => {
  const { toast } = useToast();
  
  // Modelo 1 - Conversão RelCartões para TESTE
  const [relCartoesFile, setRelCartoesFile] = useState<File>();
  const [testeFile, setTesteFile] = useState<File>();
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [processedData, setProcessedData] = useState<TesteRow[]>();
  const [isProcessing, setIsProcessing] = useState(false);

  // Modelo 2 - Comparação com banco
  const [processedFile, setProcessedFile] = useState<File>();
  const [bankFile, setBankFile] = useState<File>();
  const [comparisonResults, setComparisonResults] = useState<{
    matched: TesteRow[];
    discrepancies: Array<{ row: TesteRow; issues: string[] }>;
  }>();
  const [isComparing, setIsComparing] = useState(false);

  const handleModel1Process = async () => {
    if (!relCartoesFile) {
      toast({
        title: "Erro",
        description: "Selecione o arquivo RelCartõesDisponíveis",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const relCartoesData = await ExcelProcessor.readExcelFile(relCartoesFile) as RelCartoesRow[];
      let convertedData = ExcelProcessor.convertRelCartoesToTeste(relCartoesData);
      
      // Aplicar filtro de data se selecionado
      if (startDate && endDate) {
        convertedData = ExcelProcessor.filterByDateRange(
          convertedData,
          startDate.toISOString().split('T')[0],
          endDate.toISOString().split('T')[0]
        );
      }

      setProcessedData(convertedData);
      toast({
        title: "Sucesso",
        description: `${convertedData.length} registros processados com sucesso`,
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao processar arquivo: " + (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleModel2Process = async () => {
    if (!processedFile || !bankFile) {
      toast({
        title: "Erro",
        description: "Selecione ambos os arquivos para comparação",
        variant: "destructive",
      });
      return;
    }

    setIsComparing(true);
    try {
      const processedData = await ExcelProcessor.readExcelFile(processedFile) as TesteRow[];
      const bankData = await ExcelProcessor.readExcelFile(bankFile) as TesteRow[];
      
      const results = ExcelProcessor.compareWithBankReport(processedData, bankData);
      setComparisonResults(results);
      
      toast({
        title: "Comparação Concluída",
        description: `${results.matched.length} correspondências, ${results.discrepancies.length} divergências`,
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao comparar arquivos: " + (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsComparing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="p-3 rounded-full bg-primary/10">
                <BarChart3 className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Pivot Compare Pro
              </h1>
            </div>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Sistema avançado para comparação e processamento de planilhas financeiras
            </p>
          </div>

          {/* Main Content */}
          <Tabs defaultValue="model1" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 bg-card shadow-elegant">
              <TabsTrigger value="model1" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Modelo 1 - Conversão
              </TabsTrigger>
              <TabsTrigger value="model2" className="flex items-center gap-2">
                <GitCompare className="h-4 w-4" />
                Modelo 2 - Comparação
              </TabsTrigger>
            </TabsList>

            {/* Modelo 1 */}
            <TabsContent value="model1" className="space-y-6">
              <Card className="p-6 shadow-elegant">
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-semibold mb-2">Conversão RelCartões → TESTE</h2>
                    <p className="text-muted-foreground">
                      Converte arquivo RelCartõesDisponíveis para o formato TESTE com tratamento de dados específico
                    </p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <FileUpload
                      label="RelCartõesDisponíveis"
                      description="Arquivo Excel com dados dos cartões disponíveis"
                      onFileSelect={setRelCartoesFile}
                      selectedFile={relCartoesFile}
                      onRemoveFile={() => setRelCartoesFile(undefined)}
                    />
                    
                    <FileUpload
                      label="Arquivo TESTE (Referência)"
                      description="Arquivo de referência com formato desejado (opcional)"
                      onFileSelect={setTesteFile}
                      selectedFile={testeFile}
                      onRemoveFile={() => setTesteFile(undefined)}
                    />
                  </div>

                  <div>
                    <h3 className="text-lg font-medium mb-4">Filtro por Período (Opcional)</h3>
                    <DateRangeSelector
                      startDate={startDate}
                      endDate={endDate}
                      onStartDateChange={setStartDate}
                      onEndDateChange={setEndDate}
                    />
                  </div>

                  <Button 
                    onClick={handleModel1Process}
                    disabled={!relCartoesFile || isProcessing}
                    className="w-full"
                    size="lg"
                  >
                    {isProcessing ? "Processando..." : "Processar Conversão"}
                  </Button>
                </div>
              </Card>

              {processedData && (
                <ComparisonResults 
                  processedData={processedData}
                  mode="model1"
                />
              )}
            </TabsContent>

            {/* Modelo 2 */}
            <TabsContent value="model2" className="space-y-6">
              <Card className="p-6 shadow-elegant">
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-semibold mb-2">Comparação com Relatório do Banco</h2>
                    <p className="text-muted-foreground">
                      Compara arquivo processado com relatório do banco e destaca divergências
                    </p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <FileUpload
                      label="Arquivo Processado"
                      description="Resultado do Modelo 1 ou arquivo no formato TESTE"
                      onFileSelect={setProcessedFile}
                      selectedFile={processedFile}
                      onRemoveFile={() => setProcessedFile(undefined)}
                    />
                    
                    <FileUpload
                      label="Relatório do Banco"
                      description="Arquivo Excel com dados do banco para comparação"
                      onFileSelect={setBankFile}
                      selectedFile={bankFile}
                      onRemoveFile={() => setBankFile(undefined)}
                    />
                  </div>

                  <Button 
                    onClick={handleModel2Process}
                    disabled={!processedFile || !bankFile || isComparing}
                    className="w-full"
                    size="lg"
                  >
                    {isComparing ? "Comparando..." : "Executar Comparação"}
                  </Button>
                </div>
              </Card>

              {comparisonResults && (
                <ComparisonResults 
                  results={comparisonResults}
                  mode="model2"
                />
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Index;
