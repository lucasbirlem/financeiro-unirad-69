import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Upload, FileSpreadsheet, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  label: string;
  description: string;
  selectedFile?: File;
  onRemoveFile?: () => void;
  accept?: string;
}

export const FileUpload = ({ 
  onFileSelect, 
  label, 
  description, 
  selectedFile, 
  onRemoveFile,
  accept = ".xlsx,.xls"
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
    const excelFile = files.find(file => 
      file.name.endsWith('.xlsx') || file.name.endsWith('.xls')
    );
    
    if (excelFile) {
      onFileSelect(excelFile);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  if (selectedFile) {
    return (
      <Card className="p-4 border border-success/20 bg-success-light">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="h-8 w-8 text-success" />
            <div>
              <p className="font-medium text-success">{selectedFile.name}</p>
              <p className="text-sm text-muted-foreground">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>
          {onRemoveFile && (
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
          Ou arraste e solte um arquivo Excel aqui
        </p>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
      />
    </Card>
  );
};