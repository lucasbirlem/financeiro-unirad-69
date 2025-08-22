import { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface DateRangeSelectorProps {
  startDate?: Date;
  endDate?: Date;
  onStartDateChange: (date: Date | undefined) => void;
  onEndDateChange: (date: Date | undefined) => void;
  filterType?: 'venda' | 'vencimento';
  onFilterTypeChange?: (type: 'venda' | 'vencimento') => void;
}

export const DateRangeSelector = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  filterType = 'venda',
  onFilterTypeChange
}: DateRangeSelectorProps) => {
  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);

  return (
    <div className="space-y-4">
      {onFilterTypeChange && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Tipo de Filtro</label>
          <div className="flex gap-4">
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                name="filterType"
                value="venda"
                checked={filterType === 'venda'}
                onChange={() => onFilterTypeChange('venda')}
                className="text-primary"
              />
              <span className="text-sm">Por Data de Entrada/Venda</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                name="filterType"
                value="vencimento"
                checked={filterType === 'vencimento'}
                onChange={() => onFilterTypeChange('vencimento')}
                className="text-primary"
              />
              <span className="text-sm">Por Data de Vencimento</span>
            </label>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Data Inicial</label>
        <Popover open={startOpen} onOpenChange={setStartOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !startDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {startDate ? (
                format(startDate, "dd/MM/yyyy", { locale: ptBR })
              ) : (
                "Selecione a data inicial"
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={startDate}
              onSelect={(date) => {
                onStartDateChange(date);
                setStartOpen(false);
              }}
              disabled={(date) =>
                date > new Date() || (endDate && date > endDate)
              }
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Data Final</label>
        <Popover open={endOpen} onOpenChange={setEndOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !endDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {endDate ? (
                format(endDate, "dd/MM/yyyy", { locale: ptBR })
              ) : (
                "Selecione a data final"
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={endDate}
              onSelect={(date) => {
                onEndDateChange(date);
                setEndOpen(false);
              }}
              disabled={(date) =>
                date > new Date() || (startDate && date < startDate)
              }
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>
      </div>
    </div>
  );
};