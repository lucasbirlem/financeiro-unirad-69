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
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
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
        VENCIMENTO: vencimento,
        TIPO: tipo.includes('DÉBITO') || tipo.includes('CRÉDITO') ? 
              (tipo.includes('DÉBITO') ? 'DÉBITO' : 'CRÉDITO') : 
              (tipo.includes('Cartão de Crédito') ? 'CRÉDITO' : 
               tipo.includes('Cartão de Débito') ? 'DÉBITO' : ''), // Trata "Cartão de Crédito" como CRÉDITO e "Cartão de Débito" como DÉBITO
        PARC: parcela,
        QTDADE: 1, // Assumindo quantidade 1 por linha
        BANDEIRA: bandeira,
        BRUTO: valor,
        LIQUIDO: 0, // Inicialmente zerado conforme solicitado
        DESCONTO: 0 // Inicialmente zerado conforme solicitado
      };
    });
  }

  static filterByDateRange(data: TesteRow[], startDate: string, endDate: string, filterType: 'venda' | 'vencimento' = 'venda'): TesteRow[] {
    if (!startDate || !endDate) return data;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return data.filter(row => {
      const dateField = filterType === 'venda' ? row.VENDA : row.VENCIMENTO;
      if (!dateField) return false;
      
      // Tenta diferentes formatos de data
      let rowDate: Date;
      try {
        if (dateField.includes('/')) {
          const [day, month, year] = dateField.split('/');
          rowDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        } else if (dateField.includes('-')) {
          rowDate = new Date(dateField);
        } else {
          // Tenta interpretar como timestamp ou outros formatos
          rowDate = new Date(dateField);
        }
        
        // Incluir a data final também (até 23:59:59 da data final)
        const endOfDay = new Date(end);
        endOfDay.setHours(23, 59, 59, 999);
        return rowDate >= start && rowDate <= endOfDay;
      } catch (error) {
        console.warn('Erro ao parsear data:', dateField);
        return false;
      }
    });
  }

  static processBankReport(bankData: any[]): TesteRow[] {
    console.log('Processando relatório do banco com', bankData.length, 'registros');
    
    return bankData.map((row, index) => {
      // Log da primeira linha para debug
      if (index === 0) {
        console.log('Primeira linha do banco:', Object.keys(row));
      }
      
      // Mapeia as colunas do relatório do banco para o formato TesteRow
      const autorizacao = row['AUTORIZACAO'] || row['AUTORIZAÇÃO'] || '';
      const dataVenda = row['DATA DA VENDA'] || '';
      const dataVencimento = row['DATA DE VENCIMENTO'] || '';
      const bandeiraModalidade = row['BANDEIRA / MODALIDADE'] || '';
      const parcelas = row['PARCELAS'] || 0;
      const valorVenda = row['VALOR DA VENDA'] || 0;
      const valorParcela = row['VALOR DA PARCELA'] || 0;
      const descontos = row['DESCONTOS'] || 0;

      // Validação de dados obrigatórios
      if (!autorizacao || !dataVenda || !dataVencimento || !bandeiraModalidade || !valorVenda) {
        console.warn(`Linha ${index + 1}: dados obrigatórios faltando`, {
          autorizacao: !!autorizacao,
          dataVenda: !!dataVenda,
          dataVencimento: !!dataVencimento,
          bandeiraModalidade: !!bandeiraModalidade,
          valorVenda: !!valorVenda
        });
      }

      // Separa BANDEIRA e MODALIDADE (TIPO) com parsing mais robusto
      const bandeiraModalidadeLimpa = bandeiraModalidade.toString().trim();
      const palavras = bandeiraModalidadeLimpa.split(/\s+/); // Split por qualquer quantidade de espaços
      const bandeira = palavras[0] || '';
      const tipo = palavras.slice(1).join(' ') || ''; // Junta todas as palavras restantes

      // Log para debug da separação
      if (index < 3) {
        console.log(`Linha ${index + 1} - "${bandeiraModalidadeLimpa}" → BANDEIRA: "${bandeira.toUpperCase()}", TIPO: "${tipo.toUpperCase()}"`);
      }

      return {
        AUTORIZADOR: autorizacao.toString().trim(),
        VENDA: this.normalizeDate(dataVenda.toString()),
        VENCIMENTO: this.normalizeDate(dataVencimento.toString()),
        TIPO: tipo.toUpperCase().trim(),
        PARC: this.parseNumber(parcelas),
        QTDADE: 1,
        BANDEIRA: bandeira.toUpperCase().trim(),
        BRUTO: this.parseMonetaryValue(valorVenda),
        LIQUIDO: this.parseMonetaryValue(valorParcela),
        DESCONTO: this.parseMonetaryValue(descontos)
      };
    }).filter(row => row.AUTORIZADOR && row.BANDEIRA); // Filtra registros inválidos
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
      
      // Busca correspondência pelos 7 campos obrigatórios
      const bankMatch = processedBankData.find(bankRow => {
        const autorizadorMatch = this.normalizeString(bankRow.AUTORIZADOR) === this.normalizeString(processedRow.AUTORIZADOR);
        const vendaMatch = this.normalizeDate(bankRow.VENDA) === this.normalizeDate(processedRow.VENDA);
        const vencimentoMatch = this.normalizeDate(bankRow.VENCIMENTO) === this.normalizeDate(processedRow.VENCIMENTO);
        const bandeiraMatch = this.normalizeString(bankRow.BANDEIRA) === this.normalizeString(processedRow.BANDEIRA);
        const tipoMatch = this.normalizeString(bankRow.TIPO) === this.normalizeString(processedRow.TIPO);
        const parcMatch = bankRow.PARC === processedRow.PARC;
        const brutoMatch = Math.abs((bankRow.BRUTO || 0) - (processedRow.BRUTO || 0)) < 0.01; // Tolerância para valores monetários
        
        return autorizadorMatch && vendaMatch && vencimentoMatch && bandeiraMatch && tipoMatch && parcMatch && brutoMatch;
      });

      if (bankMatch) {
        // Todos os 7 campos coincidem - atualiza LIQUIDO e DESCONTO
        const updatedRow = {
          ...processedRow,
          LIQUIDO: bankMatch.LIQUIDO,
          DESCONTO: bankMatch.DESCONTO
        };
        matched.push(updatedRow);
        
        if (index < 3) {
          console.log(`Match encontrado para linha ${index + 1}:`, {
            autorizador: processedRow.AUTORIZADOR,
            liquido: bankMatch.LIQUIDO,
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
            if (this.normalizeDate(bankRow.VENCIMENTO) !== this.normalizeDate(processedRow.VENCIMENTO)) {
              issues.push(`DATA DE VENCIMENTO divergente: ${processedRow.VENCIMENTO} vs ${bankRow.VENCIMENTO}`);
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

  // Função para validar estrutura de arquivo do banco
  static validateBankReportStructure(data: any[]): { isValid: boolean; missingColumns: string[] } {
    if (!data || data.length === 0) {
      return { isValid: false, missingColumns: ['Arquivo vazio'] };
    }

    const requiredColumns = [
      'AUTORIZAÇÃO',
      'DATA DA VENDA', 
      'DATA DE VENCIMENTO',
      'BANDEIRA / MODALIDADE',
      'PARCELAS',
      'VALOR DA VENDA',
      'VALOR DA PARCELA',
      'DESCONTOS'
    ];

    const firstRow = data[0];
    const availableColumns = Object.keys(firstRow);
    const missingColumns = requiredColumns.filter(col => 
      !availableColumns.some(available => 
        available.toLowerCase().trim() === col.toLowerCase().trim()
      )
    );

    return {
      isValid: missingColumns.length === 0,
      missingColumns
    };
  }

  static exportToExcel(data: TesteRow[], filename: string, highlightDiscrepancies?: Array<{ row: TesteRow; issues: string[] }>): void {
    try {
      // Cria worksheet com os dados
      const ws = XLSX.utils.json_to_sheet(data);
      
      // Se há discrepâncias, destaque em vermelho
      if (highlightDiscrepancies && highlightDiscrepancies.length > 0) {
        console.log(`Destacando ${highlightDiscrepancies.length} linhas com discrepâncias`);
        
        highlightDiscrepancies.forEach((discrepancy) => {
          const rowIndex = data.findIndex(row => 
            row.AUTORIZADOR === discrepancy.row.AUTORIZADOR &&
            row.VENCIMENTO === discrepancy.row.VENCIMENTO &&
            row.BRUTO === discrepancy.row.BRUTO
          );
          
          if (rowIndex >= 0) {
            // +2 porque: +1 para cabeçalho + 1 para índice baseado em 1
            const excelRowIndex = rowIndex + 2;
            
            // Adiciona estilo vermelho para as principais colunas
            const cellAddresses = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
            cellAddresses.forEach(col => {
              const cellAddress = `${col}${excelRowIndex}`;
              if (!ws[cellAddress]) {
                ws[cellAddress] = { v: '', t: 's' };
              }
              if (!ws[cellAddress].s) {
                ws[cellAddress].s = {};
              }
              ws[cellAddress].s.fill = {
                patternType: 'solid',
                fgColor: { rgb: 'FFCCCCCC' },
                bgColor: { rgb: 'FFFF0000' }
              };
            });
          }
        });
      }

      // Cria uma segunda planilha com as discrepâncias detalhadas
      if (highlightDiscrepancies && highlightDiscrepancies.length > 0) {
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
        
        const discrepancyWs = XLSX.utils.json_to_sheet(discrepancyData);
        
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Dados Processados');
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
}