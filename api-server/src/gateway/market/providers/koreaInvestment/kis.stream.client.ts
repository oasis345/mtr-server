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

@Injectable()
export class KisStreamClient {
  public APPROVAL_KEY: string;
  private socket: WebSocket;
  // 한국투자증권 API의 기본 URL (실전 또는 모의)
  private readonly logger = new Logger(KisStreamClient.name);
  private readonly CONNECTION_KEY_URL = `https://openapi.koreainvestment.com:9443/oauth2/Approval`;
  private readonly OPS_URL = `ws://ops.koreainvestment.com:21000/tryitout/HDFSCNT0`;
  private rawMessageStream = new Subject<KoreaInvestmentTradeMessage>();

  constructor(
    private readonly httpService: CustomHttpService,
    private readonly configService: ConfigService, // ConfigService 주입
  ) {}

  /**
   * 한국투자증권 웹소켓 연결을 위한 Connection Key (Access Token)를 가져옵니다.
   * 이는 실제 웹소켓 연결 시 인증에 사용됩니다.
   * @returns {Promise<KoreaInvestmentAccessTokenResponse>} 웹소켓 연결 키를 포함한 응답
   */
  async getWebSocketConnectionKey(): Promise<KoreaInvestmentAccessTokenResponse> {
    const appKey = this.configService.get<string>('KOREA_INVESTMENT_APP_KEY');
    const secretKey = this.configService.get<string>('KOREA_INVESTMENT_SECRET_KEY');

    if (!appKey || !secretKey) {
      this.logger.error('KOREA_INVESTMENT_APP_KEY and/or SECRET_KEY are not configured in .env');
      throw new Error('Korea Investment API keys are missing.');
    }

    const payload = {
      grant_type: 'client_credentials', // 한국투자증권 문서에 따라 grantType 대신 grant_type 사용
      appkey: appKey, // 한국투자증권 문서에 따라 appKey 대신 appkey 사용
      secretkey: secretKey, // 한국투자증권 문서에 따라 secretKey 대신 appsecret 사용
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
      throw error; // 에러를 다시 던져서 상위에서 처리할 수 있도록 함
    }
  }

  // 여기에 웹소켓 연결 로직이나 다른 API 호출 메서드를 추가할 수 있습니다.
  // 예: 실시간 시세 구독 등
  async connect() {
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
      wsUrl.searchParams.append('tr_type', '1'); // 초기 연결 시 "등록" (1)으로 가정
      wsUrl.searchParams.append('content-type', 'utf-8');
      this.socket = new WebSocket(wsUrl);

      this.socket.on('open', () => {
        this.logger.log('WebSocket connection opened successfully.');
      });

      this.socket.on('message', (messageString: string) => {
        // 1. JSON 형식의 컨트롤 메시지인지 확인
        try {
          const jsonMessage: KoreaInvestmentSubscriptionControlMessage = JSON.parse(messageString);
          this.logger.debug('Received JSON control message:', jsonMessage);
          return;
        } catch (error) {
          this.logger.debug('Message is not JSON, attempting pipe-separated parsing.');
        }

        // 2. 파이프('|')로 구분된 데이터 메시지인지 확인
        const parts = messageString.toString().split('|');
        if (parts.length >= 4) {
          const communicationType = parts[0];
          const trId = parts[1];
          const messageType = parts[2];
          const dataBody = parts[3]; // 실제 '^'로 구분된 데이터

          if (communicationType === '0' && trId === 'HDFSCNT0' && messageType === '001') {
            const values = dataBody.split('^');
            if (values.length === KOREA_INVESTMENT_TRADE_MESSAGE_KEYS.length) {
              const tradeMessage: any = {};

              KOREA_INVESTMENT_TRADE_MESSAGE_KEYS.forEach((key, index) => {
                const value = values[index];
                switch (key) {
                  case 'ZDIV':
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
                  case 'STRN':
                  case 'MTYP':
                    // 리터럴 타입으로 변환
                    tradeMessage[key] = value as '1' | '2' | '3';
                    break;
                  default:
                    // 기본적으로 문자열 유지
                    tradeMessage[key] = value;
                    break;
                }
              });

              console.log(tradeMessage);
              this.rawMessageStream.next(tradeMessage);
            }
          }
        }
      });

      this.socket.on('close', reason => {
        this.logger.log('WebSocket connection closed.', reason);
        this.rawMessageStream.complete();
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
      // 필요하다면 메시지를 큐에 넣거나 에러를 발생시킬 수 있습니다.
    }
  }

  /** 웹소켓 연결을 해제합니다. */
  disconnect(): void {
    if (isOpenedSocket(this.socket)) {
      this.socket.close();
      this.logger.log('Korea Investment WebSocket disconnected.');
    }
  }

  getMessageStream(): Observable<KoreaInvestmentTradeMessage> {
    return this.rawMessageStream.asObservable();
  }
}
