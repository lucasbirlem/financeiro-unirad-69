import * as XLSX from 'xlsx';
import { RelCartoesRow, TesteRow, BankReportRow } from '@/types/excel';

export class ExcelProcessor {
  static readExcelFile(file: File): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
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
    return bankData.map(row => {
      // Mapeia as colunas do relatório do banco para o formato TesteRow
      const autorizacao = row['AUTORIZACAO'] || row['AUTORIZAÇÃO'] || '';
      const dataVenda = row['DATA DA VENDA'] || '';
      const dataVencimento = row['DATA DE VENCIMENTO'] || '';
      const bandeiraModalidade = row['BANDEIRA / MODALIDADE'] || '';
      const parcelas = row['PARCELAS'] || 0;
      const valorVenda = row['VALOR DA VENDA'] || 0;
      const valorParcela = row['VALOR DA PARCELA'] || 0;
      const descontos = row['DESCONTOS'] || 0;

      // Separa BANDEIRA e MODALIDADE (TIPO)
      const [bandeira = '', tipo = ''] = bandeiraModalidade.split(' ');

      return {
        AUTORIZADOR: autorizacao,
        VENDA: dataVenda,
        VENCIMENTO: dataVencimento,
        TIPO: tipo.toUpperCase(),
        PARC: parseInt(parcelas.toString()) || 0,
        QTDADE: 1,
        BANDEIRA: bandeira.toUpperCase(),
        BRUTO: parseFloat(valorVenda.toString()) || 0,
        LIQUIDO: parseFloat(valorParcela.toString()) || 0,
        DESCONTO: parseFloat(descontos.toString()) || 0
      };
    });
  }

  static compareWithBankReport(processedData: TesteRow[], bankData: any[]): {
    matched: TesteRow[];
    discrepancies: Array<{ row: TesteRow; issues: string[] }>;
  } {
    const matched: TesteRow[] = [];
    const discrepancies: Array<{ row: TesteRow; issues: string[] }> = [];

    // Processa os dados do banco
    const processedBankData = this.processBankReport(bankData);

    processedData.forEach(processedRow => {
      // Busca correspondência pelos campos específicos
      const bankMatch = processedBankData.find(bankRow => {
        return (
          this.normalizeString(bankRow.AUTORIZADOR) === this.normalizeString(processedRow.AUTORIZADOR) &&
          this.normalizeDate(bankRow.VENDA) === this.normalizeDate(processedRow.VENDA) &&
          this.normalizeDate(bankRow.VENCIMENTO) === this.normalizeDate(processedRow.VENCIMENTO) &&
          this.normalizeString(bankRow.BANDEIRA) === this.normalizeString(processedRow.BANDEIRA) &&
          bankRow.PARC === processedRow.PARC &&
          bankRow.BRUTO === processedRow.BRUTO
        );
      });

      if (bankMatch) {
        // Se todos os campos obrigatórios forem iguais, verifica se TIPO também bate
        if (this.normalizeString(bankMatch.TIPO) === this.normalizeString(processedRow.TIPO)) {
          // Atualiza LIQUIDO e DESCONTO com os valores do banco
          const updatedRow = {
            ...processedRow,
            LIQUIDO: bankMatch.LIQUIDO,
            DESCONTO: bankMatch.DESCONTO
          };
          matched.push(updatedRow);
        } else {
          // TIPO não confere
          discrepancies.push({
            row: processedRow,
            issues: [`TIPO/MODALIDADE divergente: ${processedRow.TIPO} vs ${bankMatch.TIPO}`]
          });
        }
      } else {
        discrepancies.push({ 
          row: processedRow, 
          issues: ['Transação não encontrada no relatório do banco ou dados não conferem'] 
        });
      }
    });

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
      let normalizedDate = date.toString();
      
      // Se já está no formato DD/MM/YYYY, mantém
      if (normalizedDate.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
        return normalizedDate;
      }
      
      // Se está no formato YYYY-MM-DD, converte
      if (normalizedDate.match(/^\d{4}-\d{2}-\d{2}/)) {
        const [year, month, day] = normalizedDate.split('-');
        return `${day}/${month}/${year}`;
      }
      
      // Outros formatos podem ser adicionados aqui
      return normalizedDate;
    } catch (error) {
      return date.toString();
    }
  }

  static exportToExcel(data: TesteRow[], filename: string, highlightDiscrepancies?: Array<{ row: TesteRow; issues: string[] }>): void {
    const ws = XLSX.utils.json_to_sheet(data);
    
    // Se há discrepâncias, destaque em vermelho
    if (highlightDiscrepancies) {
      highlightDiscrepancies.forEach((discrepancy, index) => {
        const rowIndex = data.findIndex(row => 
          row.AUTORIZADOR === discrepancy.row.AUTORIZADOR &&
          row.VENCIMENTO === discrepancy.row.VENCIMENTO
        ) + 1; // +1 porque a primeira linha é o cabeçalho
        
        // Adiciona estilo vermelho para a linha inteira
        const cellAddresses = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
        cellAddresses.forEach(col => {
          const cellAddress = `${col}${rowIndex + 1}`;
          if (!ws[cellAddress]) ws[cellAddress] = { v: '', s: {} };
          ws[cellAddress].s = {
            fill: {
              bgColor: { indexed: 64 },
              fgColor: { rgb: "FFFF0000" }
            }
          };
        });
      });
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Dados');
    XLSX.writeFile(wb, filename);
  }
}