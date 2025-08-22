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
  LIQUIDO?: number;
  DESCONTO?: number;
}

export interface ComparisonResult {
  matched: TesteRow[];
  unmatched: TesteRow[];
  differences: Array<{
    row: TesteRow;
    differences: string[];
  }>;
}