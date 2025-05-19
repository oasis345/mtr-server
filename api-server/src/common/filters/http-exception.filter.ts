import {
  Catch,
  ExceptionFilter,
  HttpException,
  ArgumentsHost,
} from '@nestjs/common';
import { Response } from 'express';
import { Logger } from '@nestjs/common';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const message = exception.getResponse();

    // 예외 메시지를 로그로 기록
    this.logger.error(`HTTP Exception: ${JSON.stringify(message)}`);

    response.status(status).json({
      statusCode: status,
      message: typeof message === 'string' ? message : message['message'],
    });
  }
}
