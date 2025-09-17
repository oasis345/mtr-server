import { AssetType } from '@/common/types/asset.types';
import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { FinancialService } from './financial.service';
import { AssetQueryParams, MarketDataType } from './types';

@ApiTags('Financial')
@Controller('financial')
export class FinancialController {
  constructor(private readonly financialService: FinancialService) {}

  @ApiOperation({ summary: '시장 데이터 조회' })
  @ApiQuery({
    name: 'assetType',
    required: true,
    description: '조회할 자산 유형',
    enum: AssetType,
  })
  @ApiQuery({
    name: 'dataType',
    required: true,
    description: '데이터 정렬 기준',
    enum: MarketDataType,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
  })
  @ApiOkResponse({
    description: '시장 데이터 조회 성공',
    // 실제 응답 객체의 구조를 스키마로 상세히 정의합니다.
    schema: {
      properties: {
        statusCode: { type: 'number', example: 200 },
        message: { type: 'string', example: '정상적으로 처리되었습니다.' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              symbol: { type: 'string', example: 'AAPL' },
              name: { type: 'string', example: 'Apple Inc.' },
              price: { type: 'number', example: 150.25 },
              marketCap: { type: 'number', example: 2500000000000 },
            },
          },
        },
      },
    },
  })
  @Get('market')
  async getMarketData(@Query() query: AssetQueryParams) {
    return this.financialService.getMarketData(query);
  }
}
