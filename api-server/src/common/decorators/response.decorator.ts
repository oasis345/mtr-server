import { SetMetadata } from '@nestjs/common';

/**
 * API 성공 응답에 대한 커스텀 메시지를 설정하는 데코레이터입니다.
 * @example
 * @ResponseMessage('사용자 정보 조회 성공')
 * @Get(':id')
 * findOne(@Param('id') id: string) { ... }
 */
export const RESPONSE_MESSAGE_KEY = 'responseMessage';
export const ResponseMessage = (message: string) => SetMetadata(RESPONSE_MESSAGE_KEY, message);
