import { Injectable, Logger } from '@nestjs/common';
import { CustomHttpService } from '@/common/http/http.service';
import { ConfigService } from '@nestjs/config'; // ConfigService 필요
import { AxiosRequestConfig } from 'axios';
import { Observable, Subject } from 'rxjs';
import { isOpenedSocket, KoreaInvestmentSubscriptionControlMessage } from '@/gateway/market/types';
import WebSocket from 'ws';
import { KoreaInvestmentTradeMessage } from '../../types';

interface KoreaInvestmentAccessTokenResponse {
  approval_key: string;
}

const KOREA_INVESTMENT_TRADE_MESSAGE_KEYS = [
  'RSYM', // 0
  'SYMB', // 1
  'ZDIV', // 2
  'TYMD', // 3
  'XYMD', // 4
  'XHMS', // 5
  'KYMD', // 6
  'KHMS', // 7
  'OPEN', // 8
  'HIGH', // 9
  'LOW', // 10
  'LAST', // 11
  'SIGN', // 12
  'DIFF', // 13
  'RATE', // 14
  'PBID', // 15
  'PASK', // 16
  'VBID', // 17
  'VASK', // 18
  'EVOL', // 19
  'TVOL', // 20
  'TAMT', // 21
  'BIVL', // 22
  'ASVL', // 23
  'STRN', // 24
  'MTYP', // 25
];

const RECONNECT_DELAY_MS = 5000;

@Injectable()
export class KisStreamClient {
  public APPROVAL_KEY: string;
  private socket: WebSocket;
  private readonly logger = new Logger(KisStreamClient.name);
  private readonly CONNECTION_KEY_URL = `https://openapi.koreainvestment.com:9443/oauth2/Approval`;
  private readonly OPS_URL = `ws://ops.koreainvestment.com:21000/tryitout/HDFSCNT0`;
  private rawMessageStream = new Subject<KoreaInvestmentTradeMessage>();
  private isReconnecting: boolean = false;

  constructor(
    private readonly httpService: CustomHttpService,
    private readonly configService: ConfigService,
  ) {}

  async getWebSocketConnectionKey(): Promise<KoreaInvestmentAccessTokenResponse> {
    const appKey = this.configService.get<string>('KOREA_INVESTMENT_APP_KEY');
    const secretKey = this.configService.get<string>('KOREA_INVESTMENT_SECRET_KEY');
    if (!appKey || !secretKey) {
      this.logger.error('KOREA_INVESTMENT_APP_KEY and/or SECRET_KEY are not configured in .env');
      throw new Error('Korea Investment API keys are missing.');
    }
    const payload = {
      grant_type: 'client_credentials',
      appkey: appKey,
      secretkey: secretKey,
    };
    const config: AxiosRequestConfig = {
      headers: {
        'Content-Type': 'application/json',
      },
    };
    try {
      this.logger.debug(`Requesting WebSocket Connection Key from ${this.CONNECTION_KEY_URL}`);
      const response = await this.httpService.post<KoreaInvestmentAccessTokenResponse>(
        this.CONNECTION_KEY_URL,
        payload,
        config,
      );
      this.logger.log('Successfully received Korea Investment WebSocket Connection Key.');
      return response;
    } catch (error) {
      this.logger.error(`Failed to get Korea Investment WebSocket Connection Key: ${error.message}`);
      throw error;
    }
  }

  async connect(): Promise<void> {
    if (isOpenedSocket(this.socket)) {
      this.logger.log('WebSocket already connected.');
      return;
    }
    try {
      const { approval_key } = await this.getWebSocketConnectionKey();
      this.APPROVAL_KEY = approval_key;
      const wsUrl = new URL(this.OPS_URL);
      wsUrl.searchParams.append('approval_key', this.APPROVAL_KEY);
      wsUrl.searchParams.append('custtype', 'P');
      wsUrl.searchParams.append('tr_type', '1');
      wsUrl.searchParams.append('content-type', 'utf-8');
      this.socket = new WebSocket(wsUrl);
      this.socket.on('open', () => {
        this.logger.log('WebSocket connection opened successfully.');
        this.isReconnecting = false;
      });
      this.socket.on('message', (messageString: string) => {
        try {
          const jsonMessage: KoreaInvestmentSubscriptionControlMessage = JSON.parse(messageString);
          this.logger.debug('Received JSON control message:', jsonMessage);
          return;
        } catch (error) {
          this.logger.debug('Message is not JSON, attempting pipe-separated parsing.');
        }
        const parts = messageString.toString().split('|');
        if (parts.length >= 4) {
          const communicationType = parts[0];
          const trId = parts[1];
          const messageType = parts[2];
          const dataBody = parts[3];
          if (communicationType === '0' && trId === 'HDFSCNT0' && messageType === '001') {
            const values = dataBody.split('^');
            if (values.length === KOREA_INVESTMENT_TRADE_MESSAGE_KEYS.length) {
              const tradeMessage: any = {};
              KOREA_INVESTMENT_TRADE_MESSAGE_KEYS.forEach((key, index) => {
                const value = values[index];
                switch (key) {
                  case 'ZDIV':
                  case 'TYMD':
                  case 'XYMD':
                  case 'XHMS':
                  case 'KYMD':
                  case 'KHMS':
                  case 'SIGN':
                  case 'MTYP':
                  case 'STRN':
                    tradeMessage[key] = value;
                    break;
                  case 'OPEN':
                  case 'HIGH':
                  case 'LOW':
                  case 'LAST':
                  case 'DIFF':
                  case 'RATE':
                  case 'PBID':
                  case 'PASK':
                  case 'VBID':
                  case 'VASK':
                  case 'EVOL':
                  case 'TVOL':
                  case 'TAMT':
                  case 'BIVL':
                  case 'ASVL':
                    tradeMessage[key] = parseFloat(value);
                    break;
                  default:
                    tradeMessage[key] = value;
                    break;
                }
              });
              this.rawMessageStream.next(tradeMessage);
            }
          }
        }
      });
      this.socket.on('close', (code: number, reason: Buffer) => {
        this.logger.log(`WebSocket connection closed. Code: ${code}, Reason: ${reason.toString()}`);
        this.reconnectWebSocket();
      });
      this.socket.on('error', error => {
        this.logger.error('WebSocket error:', error);
        this.rawMessageStream.error(error);
      });
    } catch (error) {
      this.logger.error('Failed to connect to Korea Investment WebSocket:', error);
      throw error;
    }
  }

  send(message: string): void {
    if (isOpenedSocket(this.socket)) {
      this.logger.debug(`Sending message to WebSocket: ${message}`);
      this.socket.send(message);
    } else {
      this.logger.warn('WebSocket is not open. Cannot send message.');
    }
  }

  disconnect(): void {
    if (isOpenedSocket(this.socket)) {
      this.isReconnecting = false;
      this.socket.close();
      this.logger.log('WebSocket disconnected.');
    }
  }

  getMessageStream(): Observable<any> {
    return this.rawMessageStream.asObservable();
  }

  private reconnectWebSocket(): void {
    if (this.isReconnecting) {
      this.logger.warn('Reconnection already in progress. Skipping duplicate attempt.');
      return;
    }
    this.isReconnecting = true;
    this.logger.warn(`Reconnecting WebSocket in ${RECONNECT_DELAY_MS / 1000} seconds...`);
    setTimeout(() => {
      this.connect().catch(error => {
        this.logger.error('Reconnection failed:', error);
        this.isReconnecting = false;
      });
    }, RECONNECT_DELAY_MS);
  }
}
