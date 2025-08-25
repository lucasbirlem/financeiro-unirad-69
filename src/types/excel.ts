export interface RelCartoesRow {
  Agencia?: string;
  Tipo?: string;
  Entrada?: string;
  Bandeira?: string;
  Autorizador?: string;
  Detalhes?: string;
  Valor?: number;
  Parcela?: number;
  Vencimento?: string;
  Cliente?: string;
}

export interface TesteRow {
  AUTORIZADOR?: string;
  VENDA?: string;
  VENCIMENTO?: string;
  TIPO?: string;
  PARC?: number;
  QTDADE?: number;
  BANDEIRA?: string;
  BRUTO?: number;
  LÍQUIDO?: number;
  DESCONTO?: number;
}

export interface BankReportRow {
  AUTORIZACAO?: string;
  'DATA DA VENDA'?: string;
  'DATA DE VENCIMENTO'?: string;
  'BANDEIRA / MODALIDADE'?: string;
  PARCELAS?: number;
  'VALOR DA VENDA'?: number;
  'VALOR DA PARCELA'?: number;
  DESCONTOS?: number;
}

export interface ComparisonResult {
  matched: TesteRow[];
  unmatched: TesteRow[];
  differences: Array<{
    row: TesteRow;
    differences: string[];
  }>;
}