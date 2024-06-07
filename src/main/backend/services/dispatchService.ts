import socketIo from 'socket.io';
import { BrowserWindow } from 'electron';
import { Platform, StrategyServiceStatusEnum } from '../types';
import { emitAndWait } from '../../utils';

export class DispatchService {
  private mainWindow: BrowserWindow;

  private io: socketIo.Server;

  constructor(mainWindow: BrowserWindow, io: socketIo.Server) {
    this.mainWindow = mainWindow;
    this.io = io;
  }

  public registerHandlers(socket: socketIo.Socket): void {
    socket.on('messageService-broadcast', (msg: any, callback) => {
      const { event_id: eventId, message } = msg;
      this.receiveBroadcast(msg);
      callback({
        event_id: eventId,
        event_type: message,
      });
    });

    socket.on('messageService-getMessages', async (data, callback) => {
      const { ctx, messages } = data;
    });
  }

  public receiveBroadcast(msg: any): void {
    this.mainWindow.webContents.send('broadcast', msg);
  }

  public async checkHealth(): Promise<boolean> {
    try {
      return await this.io.timeout(5000).emitWithAck('systemService-health');
    } catch (error) {
      console.error('Failed to check health', error);
      return false;
    }
  }

  public async updateStatus(status: StrategyServiceStatusEnum): Promise<any> {
    try {
      return await emitAndWait(this.io, 'strategyService-updateStatus', {
        status,
      });
    } catch (error) {
      console.error('Failed to update status', error);
      return null;
    }
  }

  public async getAllPlatforms(): Promise<Platform[]> {
    const maxRetries = 10;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const data = await emitAndWait<Platform[]>(
          this.io,
          'strategyService-getAppsInfo',
        );
        return data;
      } catch (error) {
        // eslint-disable-next-line no-await-in-loop
        await new Promise((resolve) => setTimeout(resolve, 1000));
        attempt++;
        console.error(`Attempt ${attempt} failed to update strategies`, error);
        if (attempt >= maxRetries) {
          return [];
        }
      }
    }

    return [];
  }
}
