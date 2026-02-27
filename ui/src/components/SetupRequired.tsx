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
      <div className="flex flex-col items-center justify-center h-screen gap-2 p-6 text-center">
        <p className="text-sm font-medium text-foreground">Проверка подключения…</p>
        <p className="text-xs text-muted-foreground">Выполняется запрос к серверу Kaiten</p>
      </div>
    );
  }

  if (connectionError) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-3 p-6 text-center">
        <p className="text-sm font-medium text-foreground">Ошибка подключения к Kaiten</p>
        <p className="text-xs text-muted-foreground">{connectionError}</p>
        <Button size="sm" onClick={openSettings}>
          Открыть настройки
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen gap-3 p-6 text-center">
      <p className="text-sm font-medium text-foreground">Настройте подключение к Kaiten</p>
      <p className="text-xs text-muted-foreground">
        Укажите Server URL и API Token в настройках плагина
      </p>
      <Button size="sm" onClick={openSettings}>
        Открыть настройки
      </Button>
    </div>
  );
}
