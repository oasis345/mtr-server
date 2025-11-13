// import { Injectable, OnModuleInit } from '@nestjs/common';
// import { CustomHttpService } from '@/common/http/http.service';
// import { ConfigService } from '@nestjs/config';
// import { KisOauthToken } from '@/financial/types/koreaInvestment';
//
// @Injectable()
// export class KisClient implements OnModuleInit {
//   public accessToken: string;
//   private readonly BASE_URL = `https://openapi.koreainvestment.com:9443`;
//   private readonly ACCESS_TOKEN_URL = '/oauth2/tokenP';
//
//   constructor(
//     private readonly httpService: CustomHttpService,
//     private readonly configService: ConfigService,
//   ) {}
//
//   async OnModuleInit() {
//     this.accessToken = await this.getAccessToken();
//   }
//
//   async getAccessToken(): Promise<string> {
//     const headers = {
//       grant_type: 'client_credentials',
//       appkey: this.configService.get<string>('KIS_API_KEY'),
//       appsecret: this.configService.get<string>('KIS_SECRET_KEY'),
//     };
//     const response = await this.httpService.post<KisOauthToken>(this.BASE_URL + this.ACCESS_TOKEN_URL, {}, { headers });
//     return response.access_token;
//   }
//
//   /**
//    * [수정] Base URL을 동적으로 선택할 수 있도록 오버로딩된 get 메서드
//    *
//    * @param path API 경로 (예: 'v2/assets', 'v1beta1/screener/stocks/most-actives')
//    * @param params URL 쿼리 파라미터 (선택적)
//    * @param baseUrlType Base URL 타입 (기본값: MARKET)
//    */
//   async get<T>(path: string, params: Record<string, any>, trId: string): Promise<T> {
//     const url = `${this.baseUrl}/${path}`;
//     const headers = {
//       appkey: this.configService.get<string>('KIS_API_KEY'),
//       appsecret: this.configService.get<string>('KIS_SECRET_KEY'),
//       tr_id: trId,
//       custtype: 'P',
//       authorization: this.accessToken,
//       'content-type': `application/json; charset=utf-8`,
//     };
//
//     return this.httpService.get<T>(url, {
//       headers: headers,
//       params,
//     });
//   }
// }
