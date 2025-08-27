import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Upload, FileSpreadsheet, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  onFileSelect: (file: File | File[]) => void;
  label: string;
  description: string;
  selectedFile?: File | File[];
  onRemoveFile?: () => void;
  accept?: string;
  multiple?: boolean;
}

export const FileUpload = ({ 
  onFileSelect, 
  label, 
  description, 
  selectedFile, 
  onRemoveFile,
  accept = ".xlsx,.xls",
  multiple = false
}: FileUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    const excelFiles = files.filter(file => 
      file.name.endsWith('.xlsx') || file.name.endsWith('.xls')
    );
    
    if (excelFiles.length > 0) {
      if (multiple) {
        onFileSelect(excelFiles);
      } else {
        onFileSelect(excelFiles[0]);
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      if (multiple) {
        onFileSelect(Array.from(files));
      } else {
        onFileSelect(files[0]);
      }
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  if (selectedFile) {
    const files = Array.isArray(selectedFile) ? selectedFile : [selectedFile];
    
    return (
      <div className="space-y-2">
        {files.map((file, index) => (
          <Card key={index} className="p-4 border border-success/20 bg-success-light">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="h-8 w-8 text-success" />
                <div>
                  <p className="font-medium text-success">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              {onRemoveFile && files.length === 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onRemoveFile}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </Card>
        ))}
        {multiple && (
          <div className="mt-4 space-y-2">
            <Button 
              onClick={handleClick} 
              variant="outline" 
              size="sm"
              className="w-full"
            >
              Adicionar Mais Arquivos
            </Button>
            {onRemoveFile && (
              <Button 
                onClick={onRemoveFile} 
                variant="destructive" 
                size="sm"
                className="w-full"
              >
                Remover Todos os Arquivos
              </Button>
            )}
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
    );
  }

  return (
    <Card
      className={cn(
        "border-2 border-dashed transition-all duration-200 cursor-pointer hover:border-primary/50",
        isDragging ? "border-primary bg-primary-light" : "border-muted-foreground/25"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <div className="p-8 text-center">
        <Upload className={cn(
          "mx-auto h-12 w-12 mb-4 transition-colors",
          isDragging ? "text-primary" : "text-muted-foreground"
        )} />
        <h3 className="text-lg font-semibold mb-2">{label}</h3>
        <p className="text-sm text-muted-foreground mb-4">{description}</p>
        <Button variant="outline" className="bg-background">
          Selecionar Arquivo
        </Button>
        <p className="text-xs text-muted-foreground mt-2">
          Ou arraste e solte {multiple ? 'arquivos Excel' : 'um arquivo Excel'} aqui
        </p>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleFileSelect}
        className="hidden"
      />
    </Card>
  );
};