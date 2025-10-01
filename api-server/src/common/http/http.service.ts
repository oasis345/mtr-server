// src/common/http/api-client.service.ts
import { HttpService as NestHttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { AxiosRequestConfig } from 'axios';
import { firstValueFrom } from 'rxjs';
import { getErrorMessage } from '../utils/error';

@Injectable()
export class CustomHttpService {
  private readonly logger = new Logger(CustomHttpService.name);

  constructor(private readonly httpService: NestHttpService) {
    this.httpService.axiosRef.interceptors.response.use(
      r => r,
      err => Promise.reject(err),
    );
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const start = Date.now();
    try {
      const { data, status } = await firstValueFrom(this.httpService.get<T>(url, config));
      this.logger.log(`GET ${url} - ${status} (${Date.now() - start}ms)`);
      return data;
    } catch (error) {
      // 응답 본문이 문자열/객체여도 사유를 확실히 찍음
      this.logger.error(`GET ${url} failed - ${getErrorMessage(error)} (${Date.now() - start}ms)`);
      throw error;
    }
  }
}
