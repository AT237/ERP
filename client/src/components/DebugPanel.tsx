import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { errorTracker } from '@/utils/errorTracking';
import { Bug, X, Trash2, Download, RefreshCw } from 'lucide-react';

export function DebugPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [errors, setErrors] = useState(errorTracker.getRecentErrors());
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setErrors(errorTracker.getRecentErrors());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleExport = () => {
    const report = errorTracker.exportErrorReport();
    const blob = new Blob([report], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `error-report-${new Date().toISOString().slice(0, 19)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    errorTracker.clearErrors();
    setErrors([]);
  };

  const forceRefresh = () => {
    setRefreshKey(prev => prev + 1);
    setErrors(errorTracker.getRecentErrors());
    errorTracker.debugInfo();
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        variant="outline"
        size="sm"
        className="fixed bottom-4 right-4 z-50 bg-orange-600 text-white hover:bg-orange-700"
        data-testid="debug-panel-toggle"
      >
        <Bug className="h-4 w-4 mr-1" />
        Debug ({errors.length})
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-4 right-4 w-96 h-96 z-50 shadow-lg border-orange-200">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center">
            <Bug className="h-4 w-4 mr-2 text-orange-600" />
            Error Tracker
            <Badge variant="outline" className="ml-2">
              {errors.length}
            </Badge>
          </CardTitle>
          <div className="flex space-x-1">
            <Button size="sm" variant="ghost" onClick={forceRefresh}>
              <RefreshCw className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="ghost" onClick={handleExport}>
              <Download className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="ghost" onClick={handleClear}>
              <Trash2 className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setIsOpen(false)}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-72">
          {errors.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <Bug className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No errors captured yet</p>
              <p className="text-xs mt-1">This is good news! 🎉</p>
            </div>
          ) : (
            <div className="space-y-2">
              {errors.map((error, index) => (
                <div key={index} className="p-2 border rounded text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <Badge 
                      variant={error.type === 'javascript' ? 'destructive' : 'secondary'}
                      className="text-xs"
                    >
                      {error.type}
                    </Badge>
                    <span className="text-muted-foreground">
                      {new Date(error.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="font-medium">{error.message}</p>
                  {error.context && (
                    <p className="text-muted-foreground">{error.context}</p>
                  )}
                  {error.stack && (
                    <details className="mt-1">
                      <summary className="cursor-pointer text-orange-600">Stack</summary>
                      <pre className="mt-1 text-xs overflow-auto max-h-20 bg-muted p-1 rounded">
                        {error.stack}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}