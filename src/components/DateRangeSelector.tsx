import { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface DateRangeSelectorProps {
  vendaStartDate?: Date;
  vendaEndDate?: Date;
  vencimentoStartDate?: Date;
  vencimentoEndDate?: Date;
  onVendaStartDateChange: (date: Date | undefined) => void;
  onVendaEndDateChange: (date: Date | undefined) => void;
  onVencimentoStartDateChange: (date: Date | undefined) => void;
  onVencimentoEndDateChange: (date: Date | undefined) => void;
}

export const DateRangeSelector = ({
  vendaStartDate,
  vendaEndDate,
  vencimentoStartDate,
  vencimentoEndDate,
  onVendaStartDateChange,
  onVendaEndDateChange,
  onVencimentoStartDateChange,
  onVencimentoEndDateChange
}: DateRangeSelectorProps) => {
  const [vendaStartOpen, setVendaStartOpen] = useState(false);
  const [vendaEndOpen, setVendaEndOpen] = useState(false);
  const [vencimentoStartOpen, setVencimentoStartOpen] = useState(false);
  const [vencimentoEndOpen, setVencimentoEndOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Filtro por Data de Entrada/Venda */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-foreground">Filtro por Data de Entrada/Venda</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Data Inicial (Venda)</label>
            <Popover open={vendaStartOpen} onOpenChange={setVendaStartOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !vendaStartDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {vendaStartDate ? (
                    format(vendaStartDate, "dd/MM/yyyy", { locale: ptBR })
                  ) : (
                    "Selecione a data inicial"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={vendaStartDate}
                  onSelect={(date) => {
                    onVendaStartDateChange(date);
                    setVendaStartOpen(false);
                  }}
                  disabled={(date) =>
                    date > new Date() || (vendaEndDate && date > vendaEndDate)
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Data Final (Venda)</label>
            <Popover open={vendaEndOpen} onOpenChange={setVendaEndOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !vendaEndDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {vendaEndDate ? (
                    format(vendaEndDate, "dd/MM/yyyy", { locale: ptBR })
                  ) : (
                    "Selecione a data final"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={vendaEndDate}
                  onSelect={(date) => {
                    onVendaEndDateChange(date);
                    setVendaEndOpen(false);
                  }}
                  disabled={(date) =>
                    date > new Date() || (vendaStartDate && date < vendaStartDate)
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      {/* Filtro por Data de Vencimento */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-foreground">Filtro por Data de Vencimento</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Data Inicial (Vencimento)</label>
            <Popover open={vencimentoStartOpen} onOpenChange={setVencimentoStartOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !vencimentoStartDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {vencimentoStartDate ? (
                    format(vencimentoStartDate, "dd/MM/yyyy", { locale: ptBR })
                  ) : (
                    "Selecione a data inicial"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={vencimentoStartDate}
                  onSelect={(date) => {
                    onVencimentoStartDateChange(date);
                    setVencimentoStartOpen(false);
                  }}
                  disabled={(date) =>
                    vencimentoEndDate && date > vencimentoEndDate
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Data Final (Vencimento)</label>
            <Popover open={vencimentoEndOpen} onOpenChange={setVencimentoEndOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !vencimentoEndDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {vencimentoEndDate ? (
                    format(vencimentoEndDate, "dd/MM/yyyy", { locale: ptBR })
                  ) : (
                    "Selecione a data final"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={vencimentoEndDate}
                  onSelect={(date) => {
                    onVencimentoEndDateChange(date);
                    setVencimentoEndOpen(false);
                  }}
                  disabled={(date) =>
                    vencimentoStartDate && date < vencimentoStartDate
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>
    </div>
  );
};