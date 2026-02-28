import { bridge } from '@/bridge/JCEFBridge';
import { Button } from '@/components/ui/button';

interface SetupRequiredProps {
  /** A connection check is currently running */
  isVerifying?: boolean;
  /** Error message from the last failed connection attempt */
  connectionError?: string;
}

export function SetupRequired({ isVerifying, connectionError }: SetupRequiredProps) {
  const openSettings = () => {
    bridge.call('openSettings', undefined).catch(console.error);
  };

  if (isVerifying) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-2 p-6 text-center">
        <p className="text-foreground text-sm font-medium">Checking connection…</p>
        <p className="text-muted-foreground text-xs">Connecting to Kaiten server</p>
      </div>
    );
  }

  if (connectionError) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-foreground text-sm font-medium">Kaiten connection error</p>
        <p className="text-muted-foreground text-xs">{connectionError}</p>
        <Button size="sm" onClick={openSettings}>
          Open settings
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-foreground text-sm font-medium">Configure Kaiten connection</p>
      <p className="text-muted-foreground text-xs">
        Specify Server URL and API Token in plugin settings
      </p>
      <Button size="sm" onClick={openSettings}>
        Open settings
      </Button>
    </div>
  );
}
