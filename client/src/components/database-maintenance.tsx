
import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

export default function DatabaseMaintenance() {
  const [isChecking, setIsChecking] = = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const checkDatabaseStatus = async () => {
    setIsChecking(true);
    try {
      const response = await fetch('/api/database/status');
      const data = await response.json();
      
      if (data.connected) {
        setStatus('success');
        setMessage('Database is connected and operational');
      } else {
        setStatus('error');
        setMessage('Database connection issues detected');
      }
    } catch (error) {
      setStatus('error');
      setMessage('Failed to check database status');
    } finally {
      setIsChecking(false);
    }
  };

  const unlockDatabase = async () => {
    setIsUnlocking(true);
    try {
      const response = await fetch('/api/database/unlock', {
        method: 'POST',
      });
      const data = await response.json();
      
      if (data.success) {
        setStatus('success');
        setMessage('Database unlocked successfully. History retention should now be editable.');
      } else {
        setStatus('error');
        setMessage(data.message || 'Failed to unlock database');
      }
    } catch (error) {
      setStatus('error');
      setMessage('Failed to unlock database');
    } finally {
      setIsUnlocking(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Database Maintenance
        </CardTitle>
        <CardDescription>
          Tools to resolve database issues and unlock frozen settings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {status !== 'idle' && (
          <Alert>
            {status === 'success' ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}
        
        <div className="flex gap-4">
          <Button 
            onClick={checkDatabaseStatus} 
            disabled={isChecking}
            variant="outline"
          >
            {isChecking && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
            Check Database Status
          </Button>
          
          <Button 
            onClick={unlockDatabase} 
            disabled={isUnlocking}
          >
            {isUnlocking && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
            Unlock Database
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
