import * as XLSX from 'xlsx';
import { RelCartoesRow, TesteRow, BankReportRow } from '@/types/excel';

export class ExcelProcessor {
  static readExcelFile(file: File, sheetName?: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          
          // Determina qual aba usar
          let targetSheetName = sheetName;
          if (!targetSheetName) {
            targetSheetName = workbook.SheetNames[0];
          } else {
            // Verifica se a aba especificada existe
            const sheetExists = workbook.SheetNames.some(name => 
              name.toLowerCase().trim() === targetSheetName!.toLowerCase().trim()
            );
            if (!sheetExists) {
              throw new Error(`Aba "${targetSheetName}" não encontrada. Abas disponíveis: ${workbook.SheetNames.join(', ')}`);
            }
            // Encontra o nome exato da aba (case-insensitive)
            targetSheetName = workbook.SheetNames.find(name => 
              name.toLowerCase().trim() === targetSheetName!.toLowerCase().trim()
            ) || targetSheetName;
          }
          
          const worksheet = workbook.Sheets[targetSheetName];
          let jsonData: any[];
          
          // Para aba DETALHADO, tenta diferentes estratégias de leitura
          if (targetSheetName && targetSheetName.toLowerCase().includes('detalhado')) {
            console.log('Lendo aba DETALHADO com estratégia especial...');
            
            // Estratégia 1: Lê com cabeçalho na linha 1
            let rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            console.log('Dados brutos (primeiras 5 linhas):', rawData.slice(0, 5));
            
            // Procura pela linha que contém os cabeçalhos reais
            let headerRowIndex = -1;
            for (let i = 0; i < Math.min(10, rawData.length); i++) {
              const row = rawData[i] as any[];
              if (row && row.some(cell => 
                cell && typeof cell === 'string' && 
                (cell.includes('AUTORIZAÇÃO') || cell.includes('DATA DA VENDA') || cell.includes('BANDEIRA'))
              )) {
                headerRowIndex = i;
                console.log(`Encontrou cabeçalhos na linha ${i + 1}:`, row);
                break;
              }
            }
            
            if (headerRowIndex >= 0) {
              // Re-lê usando a linha correta como cabeçalho
              const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
              range.s.r = headerRowIndex; // Começa da linha do cabeçalho
              const newRef = XLSX.utils.encode_range(range);
              const newWorksheet = { ...worksheet, '!ref': newRef };
              
              jsonData = XLSX.utils.sheet_to_json(newWorksheet);
              console.log(`Dados re-processados com cabeçalho correto (${jsonData.length} registros)`);
              console.log('Primeiro registro:', jsonData[0]);
            } else {
              // Fallback: usar json normal
              jsonData = XLSX.utils.sheet_to_json(worksheet);
            }
          } else {
            // Para outras abas, leitura normal
            jsonData = XLSX.utils.sheet_to_json(worksheet);
          }
          
          console.log(`Arquivo lido da aba "${targetSheetName}" com ${jsonData.length} registros`);
          resolve(jsonData);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
      reader.readAsArrayBuffer(file);
    });
  }

  static convertRelCartoesToTeste(relCartoes: RelCartoesRow[]): TesteRow[] {
    return relCartoes.map(row => {
      // Mapeia as colunas conforme a estrutura real do arquivo
      // Baseado nos logs, as colunas estão em __EMPTY, __EMPTY_1, etc.
      const agenda = (row as any)['Relatório de Cartões'] || '';
      const tipo = (row as any)['__EMPTY'] || '';
      const entrada = (row as any)['__EMPTY_1'] || '';
      const bandeira = (row as any)['__EMPTY_2'] || '';
      const autorizador = (row as any)['__EMPTY_3'] || '';
      const detalhes = (row as any)['__EMPTY_4'] || '';
      const valorStr = (row as any)['__EMPTY_5'] || '0';
      const parcelaStr = (row as any)['__EMPTY_6'] || '0';
      const vencimento = (row as any)['__EMPTY_7'] || '';
      const cliente = (row as any)['__EMPTY_8'] || '';

      // Limpa e converte valores numéricos
      const valor = parseFloat(valorStr.toString().replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
      const parcela = parseInt(parcelaStr.toString().replace(/[^\d]/g, '')) || 0;

      return {
        AUTORIZADOR: autorizador,
        VENDA: entrada, // VENDA vem da coluna Entrada
        VENCIMENTO: '', // Mantém a coluna mas sempre vazia conforme solicitado
        TIPO: tipo.includes('DÉBITO') || tipo.includes('CRÉDITO') ? 
              (tipo.includes('DÉBITO') ? 'DÉBITO' : 'CRÉDITO') : 
              (tipo.includes('Cartão de Crédito') ? 'CRÉDITO' : 
               tipo.includes('Cartão de Débito') ? 'DÉBITO' : ''), // Trata "Cartão de Crédito" como CRÉDITO e "Cartão de Débito" como DÉBITO
        PARC: parcela,
        QTDADE: 1, // Assumindo quantidade 1 por linha
        BANDEIRA: bandeira,
        BRUTO: valor,
        LÍQUIDO: 0, // Inicialmente zerado conforme solicitado
        DESCONTO: 0 // Inicialmente zerado conforme solicitado
      };
    });
  }

  static filterByDateRange(data: TesteRow[], startDate: string, endDate: string, filterType: 'venda' | 'vencimento' = 'venda'): TesteRow[] {
    if (!startDate || !endDate) return data;
    
    console.log('=== DEBUG FILTRO DE DATAS ===');
    console.log('Data inicial recebida:', startDate);
    console.log('Data final recebida:', endDate);
    
    // Converte as datas de entrada (formato YYYY-MM-DD) para Date
    // Parse manual para evitar problemas de timezone
    const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
    const [endYear, endMonth, endDay] = endDate.split('-').map(Number);
    
    const start = new Date(startYear, startMonth - 1, startDay, 0, 0, 0, 0);
    const end = new Date(endYear, endMonth - 1, endDay, 23, 59, 59, 999);
    
    console.log('Data inicial processada:', start.toISOString(), 'Local:', start.toLocaleDateString('pt-BR'));
    console.log('Data final processada:', end.toISOString(), 'Local:', end.toLocaleDateString('pt-BR'));
    
    const filteredData = data.filter((row, index) => {
      // Para o modelo 2, usa a data VENDA (que vem da coluna ENTRADA do Otimus)
      // Para outros casos, usa o campo especificado no filterType
      const dateField = filterType === 'venda' ? row.VENDA : row.VENCIMENTO;
      if (!dateField) return false;
      
      // Parse manual da data do registro para evitar problemas de timezone
      let rowDate: Date;
      try {
        if (dateField.includes('/')) {
          const [day, month, year] = dateField.split('/').map(Number);
          // Cria a data com horário meio-dia para evitar problemas de timezone
          rowDate = new Date(year, month - 1, day, 12, 0, 0, 0);
        } else if (dateField.includes('-')) {
          const [year, month, day] = dateField.split('-').map(Number);
          rowDate = new Date(year, month - 1, day, 12, 0, 0, 0);
        } else {
          // Tenta interpretar como timestamp ou outros formatos
          rowDate = new Date(dateField);
          // Se deu certo, define horário meio-dia
          if (!isNaN(rowDate.getTime())) {
            rowDate.setHours(12, 0, 0, 0);
          }
        }
        
        // Verifica se a data é válida
        if (isNaN(rowDate.getTime())) {
          console.warn('Data inválida:', dateField);
          return false;
        }
        
        const isInRange = rowDate >= start && rowDate <= end;
        
        // Debug detalhado para entender o problema
        if (index < 10 || isInRange) {
          console.log(`Registro ${index}: Data original="${dateField}", Data parseada="${rowDate.toISOString()}", Local="${rowDate.toLocaleDateString('pt-BR')}", Incluído=${isInRange}`);
          console.log(`  Comparação: ${rowDate.getTime()} >= ${start.getTime()} && ${rowDate.getTime()} <= ${end.getTime()}`);
        }
        
        return isInRange;
      } catch (error) {
        console.warn('Erro ao parsear data:', dateField, error);
        return false;
      }
    });
    
    console.log(`=== RESULTADO FILTRO ===`);
    console.log(`Dados originais: ${data.length}, Dados filtrados: ${filteredData.length}`);
    
    return filteredData;
  }

  static processBankReport(bankData: any[]): TesteRow[] {
    console.log('Processando relatório do banco com', bankData.length, 'registros');
    
    // FILTRAR APENAS TRANSAÇÕES VÁLIDAS (não "Saldo Anterior", etc.)
    const validTransactions = bankData.filter((row, index) => {
      const autorizacao = row['AUTORIZAÇÃO'] || '';
      const tipoLancamento = row['TIPO DE LANÇAMENTO'] || '';
      const valorVenda = row['VALOR DA VENDA'] || 0;
      
      const isValid = autorizacao && 
                     autorizacao !== '-' && 
                     !tipoLancamento.includes('Saldo') &&
                     valorVenda && 
                     valorVenda !== '-' &&
                     parseFloat(valorVenda.toString()) > 0;
      
      if (index < 5) {
        console.log(`Linha ${index + 1}: ${isValid ? 'VÁLIDA' : 'INVÁLIDA'} - Auth: "${autorizacao}", Tipo: "${tipoLancamento}"`);
      }
      
      return isValid;
    });
    
    console.log(`Filtradas ${validTransactions.length} transações válidas de ${bankData.length} registros`);
    
    return validTransactions.map((row, index) => {
      const autorizacao = row['AUTORIZAÇÃO'] || '';
      const dataVenda = row['DATA DA VENDA'] || '';
      const dataVencimento = row['DATA DE VENCIMENTO'] || '';
      const bandeiraModalidade = row['BANDEIRA / MODALIDADE'] || '';
      const parcelas = row['PARCELAS'] || '';
      const valorVenda = row['VALOR DA VENDA'] || 0;
      const valorLiquidoParcela = row['VALOR LIQUIDO DA PARCELA'] || 0;
      const descontos = row['DESCONTOS'] || 0;

      // TRATAR PARCELAS "1 de 1" → pegar apenas o primeiro número
      let parcelaNumber = 1;
      if (parcelas && parcelas !== '-') {
        const parcelaStr = parcelas.toString().trim();
        if (parcelaStr.includes(' de ')) {
          parcelaNumber = parseInt(parcelaStr.split(' de ')[0]) || 1;
        } else {
          parcelaNumber = parseInt(parcelaStr) || 1;
        }
      }

      // Separar BANDEIRA e TIPO
      const bandeiraModalidadeLimpa = bandeiraModalidade.toString().trim();
      const palavras = bandeiraModalidadeLimpa.split(/\s+/);
      const bandeira = palavras[0] || '';
      const tipo = palavras.slice(1).join(' ') || '';

      // NORMALIZAR DATAS EXCEL (números) para DD/MM/YYYY
      const dataEntrada = row['ENTRADA'] || '';
      const entradaNormalizada = this.convertExcelDate(dataEntrada);
      const vendaNormalizada = this.convertExcelDate(dataVenda);
      const vencimentoNormalizado = this.convertExcelDate(dataVencimento);

      const processedRow = {
        AUTORIZADOR: autorizacao.toString().trim(),
        VENDA: entradaNormalizada || vendaNormalizada, // Prioriza ENTRADA, fallback para DATA DA VENDA
        VENCIMENTO: vencimentoNormalizado,
        TIPO: tipo.toUpperCase().trim(),
        PARC: parcelaNumber,
        QTDADE: 1,
        BANDEIRA: bandeira.toUpperCase().trim(),
        BRUTO: this.parseMonetaryValue(valorVenda),
        LÍQUIDO: this.parseMonetaryValue(valorLiquidoParcela), // Nome correto com acento
        DESCONTO: this.parseMonetaryValue(descontos)
      };

      if (index < 3) {
        console.log(`Banco processado ${index + 1}:`, processedRow);
      }

      return processedRow;
    })
  }

  static compareWithBankReport(processedData: TesteRow[], bankData: any[]): {
    matched: TesteRow[];
    discrepancies: Array<{ row: TesteRow; issues: string[] }>;
  } {
    const matched: TesteRow[] = [];
    const discrepancies: Array<{ row: TesteRow; issues: string[] }> = [];

    // Processa os dados do banco
    const processedBankData = this.processBankReport(bankData);
    
    console.log(`Comparando ${processedData.length} registros processados com ${processedBankData.length} registros do banco`);

    processedData.forEach((processedRow, index) => {
      const issues: string[] = [];
      
      // Busca correspondência pelos 6 campos obrigatórios (excluindo VENCIMENTO)
      const bankMatch = processedBankData.find(bankRow => {
        const autorizadorMatch = this.normalizeString(bankRow.AUTORIZADOR) === this.normalizeString(processedRow.AUTORIZADOR);
        const vendaMatch = this.normalizeDate(bankRow.VENDA) === this.normalizeDate(processedRow.VENDA);
        const bandeiraMatch = this.normalizeString(bankRow.BANDEIRA) === this.normalizeString(processedRow.BANDEIRA);
        const tipoMatch = this.normalizeString(bankRow.TIPO) === this.normalizeString(processedRow.TIPO);
        const parcMatch = bankRow.PARC === processedRow.PARC;
        const brutoMatch = Math.abs((bankRow.BRUTO || 0) - (processedRow.BRUTO || 0)) < 0.01; // Tolerância para valores monetários
        
        return autorizadorMatch && vendaMatch && bandeiraMatch && tipoMatch && parcMatch && brutoMatch;
      });

      if (bankMatch) {
        // Campos coincidentes - atualiza VENCIMENTO, LÍQUIDO e DESCONTO
        const updatedRow = {
          ...processedRow,
          VENCIMENTO: bankMatch.VENCIMENTO,
          LÍQUIDO: bankMatch.LÍQUIDO,
          DESCONTO: bankMatch.DESCONTO
        };
        matched.push(updatedRow);
        
        if (index < 3) {
          console.log(`Match encontrado para linha ${index + 1}:`, {
            autorizador: processedRow.AUTORIZADOR,
            vencimento: bankMatch.VENCIMENTO,
            liquido: bankMatch.LÍQUIDO,
            desconto: bankMatch.DESCONTO
          });
        }
      } else {
        // Verifica quais campos não conferem para diagnóstico detalhado
        const potentialMatches = processedBankData.filter(bankRow => 
          this.normalizeString(bankRow.AUTORIZADOR) === this.normalizeString(processedRow.AUTORIZADOR)
        );
        
        if (potentialMatches.length === 0) {
          issues.push(`AUTORIZADOR "${processedRow.AUTORIZADOR}" não encontrado no banco`);
        } else {
          potentialMatches.forEach(bankRow => {
            if (this.normalizeDate(bankRow.VENDA) !== this.normalizeDate(processedRow.VENDA)) {
              issues.push(`DATA DA VENDA divergente: ${processedRow.VENDA} vs ${bankRow.VENDA}`);
            }
            if (this.normalizeString(bankRow.BANDEIRA) !== this.normalizeString(processedRow.BANDEIRA)) {
              issues.push(`BANDEIRA divergente: ${processedRow.BANDEIRA} vs ${bankRow.BANDEIRA}`);
            }
            if (this.normalizeString(bankRow.TIPO) !== this.normalizeString(processedRow.TIPO)) {
              issues.push(`TIPO divergente: ${processedRow.TIPO} vs ${bankRow.TIPO}`);
            }
            if (bankRow.PARC !== processedRow.PARC) {
              issues.push(`PARCELAS divergente: ${processedRow.PARC} vs ${bankRow.PARC}`);
            }
            if (Math.abs((bankRow.BRUTO || 0) - (processedRow.BRUTO || 0)) >= 0.01) {
              issues.push(`VALOR DA VENDA divergente: ${processedRow.BRUTO} vs ${bankRow.BRUTO}`);
            }
          });
        }
        
        if (issues.length === 0) {
          issues.push('Registro não encontrado no relatório do banco');
        }
        
        discrepancies.push({ 
          row: processedRow, 
          issues: [...new Set(issues)] // Remove duplicatas
        });
      }
    });

    console.log(`Resultado da comparação: ${matched.length} matched, ${discrepancies.length} discrepancies`);
    return { matched, discrepancies };
  }

  // Função auxiliar para normalizar strings (case-insensitive)
  static normalizeString(str?: string): string {
    return (str || '').toString().trim().toLowerCase();
  }

  // Função auxiliar para normalizar datas
  static normalizeDate(date?: string): string {
    if (!date) return '';
    
    // Converte para formato padrão DD/MM/YYYY
    try {
      let normalizedDate = date.toString().trim();
      
      // Se já está no formato DD/MM/YYYY, mantém
      if (normalizedDate.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
        return normalizedDate;
      }
      
      // Se está no formato YYYY-MM-DD, converte
      if (normalizedDate.match(/^\d{4}-\d{2}-\d{2}/)) {
        const [year, month, day] = normalizedDate.split('-');
        return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
      }
      
      // Se está no formato DD/MM/YY, converte para DD/MM/YYYY
      if (normalizedDate.match(/^\d{1,2}\/\d{1,2}\/\d{2}$/)) {
        const [day, month, year] = normalizedDate.split('/');
        const fullYear = parseInt(year) < 50 ? `20${year}` : `19${year}`; // Assume século 21 para anos < 50
        return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${fullYear}`;
      }
      
      // Se está no formato DD/MM/YYYY mas com espaços ou formatação diferente
      if (normalizedDate.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
        const [day, month, year] = normalizedDate.split('/');
        return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
      }
      
      return normalizedDate;
    } catch (error) {
      console.warn('Erro ao normalizar data:', date, error);
      return date.toString();
    }
  }

  // Função auxiliar para parsear números
  static parseNumber(value: any): number {
    if (typeof value === 'number') return value;
    if (!value) return 0;
    
    const cleaned = value.toString().replace(/[^\d]/g, '');
    return parseInt(cleaned) || 0;
  }

  // Função auxiliar para parsear valores monetários
  static parseMonetaryValue(value: any): number {
    if (typeof value === 'number') return value;
    if (!value) return 0;
    
    // Remove caracteres não numéricos exceto vírgula e ponto
    const cleaned = value.toString().replace(/[^\d.,]/g, '');
    
    // Se tem vírgula e ponto, assume que vírgula é separador de milhares
    if (cleaned.includes(',') && cleaned.includes('.')) {
      const lastComma = cleaned.lastIndexOf(',');
      const lastDot = cleaned.lastIndexOf('.');
      
      if (lastDot > lastComma) {
        // Formato: 1,234.56
        return parseFloat(cleaned.replace(/,/g, '')) || 0;
      } else {
        // Formato: 1.234,56
        return parseFloat(cleaned.replace(/\./g, '').replace(',', '.')) || 0;
      }
    }
    
    // Se tem apenas vírgula, trata como separador decimal
    if (cleaned.includes(',') && !cleaned.includes('.')) {
      return parseFloat(cleaned.replace(',', '.')) || 0;
    }
    
    // Se tem apenas ponto, trata como separador decimal
    return parseFloat(cleaned) || 0;
  }

  // Função para converter datas do Excel (números) para formato DD/MM/YYYY
  static convertExcelDate(excelDate: any): string {
    if (!excelDate || excelDate === '-') return '';
    
    // Se já é string no formato correto, retorna
    if (typeof excelDate === 'string' && excelDate.includes('/')) {
      return this.normalizeDate(excelDate);
    }
    
    // Se é número (formato Excel)
    if (typeof excelDate === 'number') {
      // Excel conta a partir de 1900-01-01 (mas tem bug em 1900 que o Excel considera ano bissexto)
      const excelStartDate = new Date(1900, 0, 1);
      const actualDate = new Date(excelStartDate.getTime() + (excelDate - 2) * 24 * 60 * 60 * 1000);
      
      const day = actualDate.getDate().toString().padStart(2, '0');
      const month = (actualDate.getMonth() + 1).toString().padStart(2, '0');
      const year = actualDate.getFullYear().toString();
      
      return `${day}/${month}/${year}`;
    }
    
    // Fallback: tenta normalizar como string
    return this.normalizeDate(excelDate.toString());
  }

  // Função para validar estrutura de arquivo do banco
  static validateBankReportStructure(data: any[]): { isValid: boolean; missingColumns: string[] } {
    if (!data || data.length === 0) {
      return { isValid: false, missingColumns: ['Arquivo vazio'] };
    }

    const firstRow = data[0];
    const availableColumns = Object.keys(firstRow);
    
    console.log('=== VALIDAÇÃO ESTRUTURA BANCO ===');
    console.log('Colunas disponíveis:', availableColumns);
    
    // Mapeamento flexível das colunas necessárias
    const requiredMappings = {
      'AUTORIZAÇÃO': ['AUTORIZAÇÃO', 'AUTORIZACAO', 'AUTORIZAÇÃO', 'AUTH', 'CODIGO AUTH'],
      'DATA DA VENDA': ['DATA DA VENDA', 'DATA VENDA', 'DT VENDA', 'VENDA'],
      'DATA DE VENCIMENTO': ['DATA DE VENCIMENTO', 'DATA VENCIMENTO', 'DT VENCIMENTO', 'VENCIMENTO'],
      'BANDEIRA / MODALIDADE': ['BANDEIRA / MODALIDADE', 'BANDEIRA/MODALIDADE', 'BANDEIRA MODALIDADE', 'BANDEIRA'],
      'PARCELAS': ['PARCELAS', 'PARCELA', 'QTD PARCELAS', 'QTDE PARCELAS'],
      'VALOR DA VENDA': ['VALOR DA VENDA', 'VALOR VENDA', 'VLR VENDA', 'VALOR BRUTO'],
      'VALOR DA PARCELA': ['VALOR DA PARCELA', 'VALOR PARCELA', 'VLR PARCELA', 'VALOR LÍQUIDO', 'VALOR LIQUIDADO'],
      'DESCONTOS': ['DESCONTOS', 'DESCONTO', 'VLR DESCONTO', 'VALOR DESCONTO']
    };

    const foundColumns: { [key: string]: string } = {};
    const missingColumns: string[] = [];

    // Para cada coluna necessária, tenta encontrar uma correspondência
    Object.entries(requiredMappings).forEach(([required, variations]) => {
      let found = false;
      
      // Tenta encontrar correspondência exata primeiro
      for (const variation of variations) {
        const exactMatch = availableColumns.find(col => 
          col.trim().toUpperCase() === variation.trim().toUpperCase()
        );
        if (exactMatch) {
          foundColumns[required] = exactMatch;
          found = true;
          console.log(`✓ ${required} → ${exactMatch}`);
          break;
        }
      }
      
      // Se não encontrou correspondência exata, tenta busca por palavras-chave
      if (!found) {
        for (const variation of variations) {
          const keywordMatch = availableColumns.find(col => {
            const colNormalized = col.trim().toUpperCase();
            const variationWords = variation.trim().toUpperCase().split(/\s+/);
            return variationWords.every(word => colNormalized.includes(word));
          });
          
          if (keywordMatch) {
            foundColumns[required] = keywordMatch;
            found = true;
            console.log(`✓ ${required} → ${keywordMatch} (por palavra-chave)`);
            break;
          }
        }
      }
      
      if (!found) {
        missingColumns.push(required);
        console.log(`✗ ${required} - não encontrada`);
      }
    });

    console.log('Colunas encontradas:', Object.keys(foundColumns));
    console.log('Colunas faltando:', missingColumns);

    return {
      isValid: missingColumns.length === 0,
      missingColumns
    };
  }

  static exportToExcel(data: TesteRow[], filename: string, highlightDiscrepancies?: Array<{ row: TesteRow; issues: string[] }>): void {
    try {
      // Cria worksheet com os dados
      const ws = XLSX.utils.json_to_sheet(data);
      
      // Cria diferentes planilhas para dados processados e discrepâncias
      if (highlightDiscrepancies && highlightDiscrepancies.length > 0) {
        console.log(`Separando ${data.length - highlightDiscrepancies.length} dados processados e ${highlightDiscrepancies.length} discrepâncias`);
        
        // Filtra apenas os dados que não têm discrepâncias (100% preenchidos)
        const discrepancyRowIds = new Set(highlightDiscrepancies.map(d => 
          `${d.row.AUTORIZADOR}-${d.row.VENDA}-${d.row.BRUTO}`
        ));
        
        const matchedData = data.filter(row => 
          !discrepancyRowIds.has(`${row.AUTORIZADOR}-${row.VENDA}-${row.BRUTO}`)
        );
        
        const discrepancyData = highlightDiscrepancies.map(d => ({
          AUTORIZADOR: d.row.AUTORIZADOR,
          VENDA: d.row.VENDA,
          VENCIMENTO: d.row.VENCIMENTO,
          BANDEIRA: d.row.BANDEIRA,
          TIPO: d.row.TIPO,
          PARCELAS: d.row.PARC,
          VALOR_BRUTO: d.row.BRUTO,
          PROBLEMAS: d.issues.join('; ')
        }));
        
        // Cria planilha apenas com dados 100% corretos
        const matchedWs = XLSX.utils.json_to_sheet(matchedData);
        const discrepancyWs = XLSX.utils.json_to_sheet(discrepancyData);
        
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, matchedWs, 'Dados Processados');
        XLSX.utils.book_append_sheet(wb, discrepancyWs, 'Discrepâncias');
        
        XLSX.writeFile(wb, filename);
      } else {
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Dados Processados');
        XLSX.writeFile(wb, filename);
      }
      
      console.log(`Arquivo ${filename} exportado com sucesso`);
    } catch (error) {
      console.error('Erro ao exportar Excel:', error);
      throw new Error('Erro ao exportar arquivo Excel');
    }
  }

  static createExcelBuffer(data: TesteRow[]): ArrayBuffer {
    try {
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Dados Processados');
      
      // Retorna o buffer ao invés de baixar o arquivo
      return XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    } catch (error) {
      console.error('Erro ao criar buffer Excel:', error);
      throw new Error('Erro ao criar arquivo Excel');
    }
  }
}