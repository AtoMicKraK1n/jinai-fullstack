import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';

const BotpressKeyInput = ({ onKeySet }: { onKeySet: () => void }) => {
  const [apiKey, setApiKey] = useState('');
  const [botId, setBotId] = useState('');
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKey.trim() && botId.trim()) {
      localStorage.setItem('BOTPRESS_API_KEY', apiKey.trim());
      localStorage.setItem('BOTPRESS_BOT_ID', botId.trim());
      toast({
        title: "Success",
        description: "Botpress credentials have been saved",
      });
      onKeySet();
    } else {
      toast({
        title: "Error",
        description: "Please provide both API key and Bot ID",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-jinblack via-jingold/20 to-jinblack text-white p-6 flex items-center justify-center">
      <div className="glass-card p-8 max-w-md w-full">
        <h2 className="jin-heading text-2xl mb-6 text-center">Enter Botpress Credentials</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="apiKey" className="block text-sm font-medium mb-2">API Key</label>
            <Input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your Botpress API key"
              className="w-full"
            />
          </div>
          <div>
            <label htmlFor="botId" className="block text-sm font-medium mb-2">Bot ID</label>
            <Input
              id="botId"
              type="text"
              value={botId}
              onChange={(e) => setBotId(e.target.value)}
              placeholder="Enter your Botpress Bot ID"
              className="w-full"
            />
          </div>
          <Button type="submit" className="btn-connect w-full">
            Save Credentials
          </Button>
        </form>
      </div>
    </div>
  );
};

export default BotpressKeyInput;