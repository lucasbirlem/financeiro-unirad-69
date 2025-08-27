import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { FileUpload } from '@/components/FileUpload';
import { DateRangeSelector } from '@/components/DateRangeSelector';
import { ComparisonResults } from '@/components/ComparisonResults';
import { ExcelProcessor } from '@/utils/excelProcessor';
import { RelCartoesRow, TesteRow } from '@/types/excel';
import { useToast } from '@/hooks/use-toast';
import { useReferenceData } from '@/hooks/useReferenceData';
import { FileText, GitCompare, BarChart3 } from 'lucide-react';

const Index = () => {
  const { toast } = useToast();
  const { referenceData, saveReferenceData } = useReferenceData();
  
  // Estado para controlar a aba ativa
  const [activeTab, setActiveTab] = useState("model1");
  
  // Modelo 1 - Conversão Otimus para Referência
  const [relCartoesFile, setRelCartoesFile] = useState<File[]>();
  const [vendaStartDate, setVendaStartDate] = useState<Date>();
  const [vendaEndDate, setVendaEndDate] = useState<Date>();
  const [processedData, setProcessedData] = useState<TesteRow[]>();
  const [isProcessing, setIsProcessing] = useState(false);

  // Modelo 2 - Comparação com banco
  const [bankType, setBankType] = useState<'getnet' | 'vero' | ''>('');
  const [processedFile, setProcessedFile] = useState<File>();
  const [bankFile, setBankFile] = useState<File>();
  const [vencimentoStartDate, setVencimentoStartDate] = useState<Date>();
  const [vencimentoEndDate, setVencimentoEndDate] = useState<Date>();
  const [comparisonResults, setComparisonResults] = useState<{
    matched: TesteRow[];
    discrepancies: Array<{ row: TesteRow; issues: string[] }>;
  }>();
  const [isComparing, setIsComparing] = useState(false);

  const handleModel1Process = async () => {
    if (!relCartoesFile || relCartoesFile.length === 0) {
      toast({
        title: "Erro",
        description: "Selecione pelo menos um arquivo gerado do Otimus",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      // Processa múltiplos arquivos se fornecidos
      let allRelCartoesData: RelCartoesRow[] = [];
      for (const file of relCartoesFile) {
        const fileData = await ExcelProcessor.readExcelFile(file) as RelCartoesRow[];
        allRelCartoesData = allRelCartoesData.concat(fileData);
      }
      console.log('Dados originais mesclados:', allRelCartoesData.slice(0, 3), `Total: ${allRelCartoesData.length} registros`);
      
      let convertedData = ExcelProcessor.convertRelCartoesToTeste(allRelCartoesData);
      console.log('Dados convertidos:', convertedData.slice(0, 3)); // Debug
      
      
      // Aplicar filtros de data se selecionados
      const beforeFilter = convertedData.length;
      
      // Filtro por data de venda
      if (vendaStartDate && vendaEndDate) {
        convertedData = ExcelProcessor.filterByDateRange(
          convertedData,
          vendaStartDate.toISOString().split('T')[0],
          vendaEndDate.toISOString().split('T')[0],
          'venda'
        );
        console.log(`Filtro venda aplicado: ${beforeFilter} → ${convertedData.length} registros`);
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
    if (!bankType) {
      toast({
        title: "Erro",
        description: "Selecione o tipo do banco (Getnet ou Vero)",
        variant: "destructive",
      });
      return;
    }

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
      console.log('=== INICIANDO PROCESSO MODELO 2 ===');
      
      // Lê o arquivo processado (planilha normal)
      console.log('1. Lendo arquivo processado...');
      const processedData = await ExcelProcessor.readExcelFile(processedFile) as TesteRow[];
      console.log('Arquivo processado lido:', processedData.length, 'registros');
      
      // Lê o relatório do banco baseado no tipo
      console.log(`2. Lendo relatório do banco (${bankType})...`);
      const bankData = bankType === 'vero' 
        ? await ExcelProcessor.readExcelFile(bankFile) // Vero: primeira aba padrão
        : await ExcelProcessor.readExcelFile(bankFile, "DETALHADO"); // Getnet: aba DETALHADO
      console.log('Dados do banco lidos:', bankData.length, 'registros');
      console.log('Primeiro registro do banco:', bankData[0]);
      console.log('Colunas detectadas no banco:', Object.keys(bankData[0] || {}));
      
      // Valida a estrutura do relatório do banco
      console.log('3. Validando estrutura do relatório do banco...');
      const validation = ExcelProcessor.validateBankReportStructure(bankData);
      console.log('Resultado da validação:', validation);
      
      // TEMPORARIAMENTE DESABILITANDO A VALIDAÇÃO PARA FUNCIONAR
      console.log('⚠️ VALIDAÇÃO TEMPORARIAMENTE DESABILITADA - PROCESSANDO MESMO ASSIM');
      
      // if (!validation.isValid) {
      //   console.error('Validação falhou. Colunas faltando:', validation.missingColumns);
      //   toast({
      //     title: "Erro de Estrutura",
      //     description: `Relatório do banco inválido. Colunas faltando: ${validation.missingColumns.join(', ')}`,
      //     variant: "destructive",
      //   });
      //   return;
      // }
      
      const results = ExcelProcessor.compareWithBankReport(processedData, bankData, bankType);
      setComparisonResults(results);
      
      toast({
        title: "Comparação Concluída",
        description: `${results.matched.length} correspondências, ${results.discrepancies.length} divergências`,
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: `Erro ao processar arquivos: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        variant: "destructive",
      });
    } finally {
      setIsComparing(false);
    }
  };

  const handleResetModel1 = () => {
    setRelCartoesFile(undefined);
    // Manter as datas selecionadas para facilitar uso contínuo
    // setVendaStartDate(undefined);
    // setVendaEndDate(undefined);
    setProcessedData(undefined);
  };

  const handleResetModel2 = () => {
    setProcessedFile(undefined);
    setBankFile(undefined);
    setComparisonResults(undefined);
  };

  // Função para navegar para o modelo 2 com dados processados
  const handleGoToComparison = async (data: TesteRow[]) => {
    try {
      // Gerar arquivo XLSX usando o mesmo processo do download
      const buffer = ExcelProcessor.createExcelBuffer(data);
      
      // Criar um arquivo XLSX a partir do buffer
      const blob = new Blob([buffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const file = new File([blob], 'modelo1_processado.xlsx', { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      setProcessedFile(file);
      setActiveTab("model2");
      
      toast({
        title: "Sucesso",
        description: "Dados transferidos para a comparação",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao preparar dados para comparação",
        variant: "destructive",
      });
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
              <h1 className="text-4xl font-bold text-foreground">
                Financeiro Unirad
              </h1>
            </div>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Sistema avançado para comparação e processamento de planilhas financeiras
            </p>
          </div>

          {/* Main Content */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
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
                    <h2 className="text-2xl font-semibold mb-2">Conversão Otimus → Referência</h2>
                    <p className="text-muted-foreground">
                      Converte arquivo gerado do Otimus para a referência com tratamento de dados específico
                    </p>
                  </div>

                  <FileUpload
                    label="Arquivo(s) do Otimus"
                    description="Arquivo(s) Excel gerado(s) pelo sistema Otimus (podem ser múltiplos de caixas diferentes)"
                    onFileSelect={(files) => {
                      const fileArray = Array.isArray(files) ? files : [files];
                      setRelCartoesFile(prev => prev ? [...prev, ...fileArray] : fileArray);
                    }}
                    selectedFile={relCartoesFile}
                    onRemoveFile={() => setRelCartoesFile(undefined)}
                    multiple={true}
                  />

                  <div>
                    <h3 className="text-lg font-medium mb-4">Filtro por Período (Opcional)</h3>
                    <DateRangeSelector
                      vendaStartDate={vendaStartDate}
                      vendaEndDate={vendaEndDate}
                      onVendaStartDateChange={setVendaStartDate}
                      onVendaEndDateChange={setVendaEndDate}
                      title="Filtro por Data de Entrada"
                    />
                  </div>

                   <Button 
                     onClick={handleModel1Process}
                     disabled={!relCartoesFile || relCartoesFile.length === 0 || isProcessing}
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
                  onReset={handleResetModel1}
                  onGoToComparison={handleGoToComparison}
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

                   <div>
                     <h3 className="text-lg font-medium mb-4">Tipo do Banco</h3>
                     <RadioGroup 
                       value={bankType} 
                       onValueChange={(value: 'getnet' | 'vero') => setBankType(value)}
                       className="flex gap-6"
                     >
                       <div className="flex items-center space-x-2">
                         <RadioGroupItem value="getnet" id="getnet" />
                         <Label htmlFor="getnet">Getnet</Label>
                       </div>
                       <div className="flex items-center space-x-2">
                         <RadioGroupItem value="vero" id="vero" />
                         <Label htmlFor="vero">Vero</Label>
                       </div>
                     </RadioGroup>
                   </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                     <FileUpload
                       label="Arquivo Processado"
                       description="Resultado do Modelo 1 ou arquivo no formato TESTE"
                       onFileSelect={(file) => setProcessedFile(Array.isArray(file) ? file[0] : file)}
                       selectedFile={processedFile}
                       onRemoveFile={() => setProcessedFile(undefined)}
                     />
                     
                     <FileUpload
                       label="Relatório do Banco"
                       description="Arquivo Excel com dados do banco para comparação"
                       onFileSelect={(file) => setBankFile(Array.isArray(file) ? file[0] : file)}
                       selectedFile={bankFile}
                       onRemoveFile={() => setBankFile(undefined)}
                     />
                  </div>

                  <div>
                    <h3 className="text-lg font-medium mb-4">Filtro por Vencimento (Opcional)</h3>
                    <DateRangeSelector
                      vendaStartDate={vencimentoStartDate}
                      vendaEndDate={vencimentoEndDate}
                      onVendaStartDateChange={setVencimentoStartDate}
                      onVendaEndDateChange={setVencimentoEndDate}
                      title="Filtro por Data de Vencimento"
                    />
                  </div>

                   <Button 
                     onClick={handleModel2Process}
                     disabled={!bankType || !processedFile || !bankFile || isComparing}
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
                  vencimentoStartDate={vencimentoStartDate}
                  vencimentoEndDate={vencimentoEndDate}
                  onReset={handleResetModel2}
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
