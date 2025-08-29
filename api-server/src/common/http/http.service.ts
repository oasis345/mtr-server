// src/common/http/api-client.service.ts
import { HttpService as NestHttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { AxiosError, AxiosRequestConfig } from 'axios';
import { catchError, firstValueFrom } from 'rxjs';

@Injectable()
export class CustomHttpService {
  private readonly logger = new Logger(CustomHttpService.name);
  constructor(private readonly httpService: NestHttpService) {}

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const startTime = Date.now();
    const { data, status } = await firstValueFrom(
      this.httpService.get<T>(url, config).pipe(
        catchError((error: AxiosError) => {
          const duration = Date.now() - startTime;
          this.logger.error(`GET ${url} failed - ${error.message} (${duration}ms)`);
          throw error;
        }),
      ),
    );

    const duration = Date.now() - startTime;
    this.logger.log(`GET ${url} - ${status} (${duration}ms)`);

    return data;
  }
}
