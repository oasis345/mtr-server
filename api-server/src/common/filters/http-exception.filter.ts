import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const detail = exception.getResponse();

    this.logger.error(`HTTP Exception: ${JSON.stringify(detail)}`);

    // Nest 기본 페이로드를 최대한 보존 + 공통 필드 추가
    const payload =
      typeof detail === 'string' ? { statusCode: status, message: detail, error: 'Bad Request' } : { ...detail };

    res
      .status(status)
      .type('application/json')
      .json({
        statusCode: payload['statusCode'] ?? status,
        message: payload['message'],
        error: payload['error'],
        path: req.url,
        timestamp: new Date().toISOString(),
      });
  }
}
