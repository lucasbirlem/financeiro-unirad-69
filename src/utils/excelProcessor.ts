import * as XLSX from 'xlsx';
import { RelCartoesRow, TesteRow } from '@/types/excel';

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
    return relCartoes.map(row => ({
      AUTORIZADOR: row.Autorizador || '',
      VENDA: row.Entrada || '', // VENDA vem da coluna Entrada
      VENCIMENTO: row.Vencimento || '',
      TIPO: row.Tipo === 'DÉBITO' || row.Tipo === 'CRÉDITO' ? row.Tipo : '', // Apenas DÉBITO ou CRÉDITO
      PARC: row.Parcela || 0,
      QTDADE: 1, // Assumindo quantidade 1 por linha
      BANDEIRA: row.Bandeira || '',
      BRUTO: row.Valor || 0,
      LIQUIDO: 0, // Inicialmente zerado conforme solicitado
      DESCONTO: 0 // Inicialmente zerado conforme solicitado
    }));
  }

  static filterByDateRange(data: TesteRow[], startDate: string, endDate: string): TesteRow[] {
    if (!startDate || !endDate) return data;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return data.filter(row => {
      if (!row.VENDA) return false;
      
      // Tenta diferentes formatos de data na coluna VENDA
      let rowDate: Date;
      try {
        if (row.VENDA.includes('/')) {
          const [day, month, year] = row.VENDA.split('/');
          rowDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        } else if (row.VENDA.includes('-')) {
          rowDate = new Date(row.VENDA);
        } else {
          // Tenta interpretar como timestamp ou outros formatos
          rowDate = new Date(row.VENDA);
        }
        
        return rowDate >= start && rowDate <= end;
      } catch (error) {
        console.warn('Erro ao parsear data:', row.VENDA);
        return false;
      }
    });
  }

  static compareWithBankReport(processedData: TesteRow[], bankData: TesteRow[]): {
    matched: TesteRow[];
    discrepancies: Array<{ row: TesteRow; issues: string[] }>;
  } {
    const matched: TesteRow[] = [];
    const discrepancies: Array<{ row: TesteRow; issues: string[] }> = [];

    processedData.forEach(processedRow => {
      const bankMatch = bankData.find(bankRow => 
        bankRow.AUTORIZADOR === processedRow.AUTORIZADOR &&
        bankRow.VENCIMENTO === processedRow.VENCIMENTO &&
        bankRow.BANDEIRA === processedRow.BANDEIRA
      );

      if (bankMatch) {
        const issues: string[] = [];
        
        if (bankMatch.BRUTO !== processedRow.BRUTO) {
          issues.push(`Valor BRUTO divergente: ${processedRow.BRUTO} vs ${bankMatch.BRUTO}`);
        }
        
        if (bankMatch.TIPO !== processedRow.TIPO) {
          issues.push(`TIPO divergente: ${processedRow.TIPO} vs ${bankMatch.TIPO}`);
        }

        if (issues.length > 0) {
          discrepancies.push({ row: processedRow, issues });
        } else {
          matched.push(processedRow);
        }
      } else {
        discrepancies.push({ 
          row: processedRow, 
          issues: ['Transação não encontrada no relatório do banco'] 
        });
      }
    });

    return { matched, discrepancies };
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