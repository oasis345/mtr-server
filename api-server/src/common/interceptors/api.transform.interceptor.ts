import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Response } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { RESPONSE_MESSAGE_KEY } from '../decorators/response.decorator';

/**
 * 클라이언트에 반환될 API 응답의 표준 형식입니다.
 */
export interface ApiResponse<T> {
  data: T;
  statusCode: number;
  message: string;
}

/**
 * 모든 API 성공 응답을 ApiResponse<T> 형식으로 변환하는 인터셉터입니다.
 * 컨트롤러 핸들러에서 반환된 데이터를 'data' 필드에 포함시킵니다.
 */
@Injectable()
export class ApiTransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<ApiResponse<T>> {
    const message =
      this.reflector.get<string>(RESPONSE_MESSAGE_KEY, context.getHandler()) || '정상적으로 처리되었습니다.';
    const { statusCode } = context.switchToHttp().getResponse<Response>();

    return next.handle().pipe(
      map(data => ({
        statusCode,
        message,
        data, // 컨트롤러가 반환한 순수 데이터
      })),
    );
  }
}
