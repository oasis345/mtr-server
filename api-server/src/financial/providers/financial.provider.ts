import { Asset, AssetType } from '@/common/types';
import type { AssetQueryParams, CandleQueryParams, CandleResponse } from '../types';

export const FINANCIAL_PROVIDERS = 'FINANCIAL_PROVIDERS';

export interface FinancialProvider {
  assetType: AssetType;
  // 자산 조회
  getAssets(params: AssetQueryParams): Promise<Asset[]>;
  // 종목 스냅샷 조회
  getSnapshots(params: AssetQueryParams): Promise<Asset[]>;
  // 거래 대금 상위 종목
  getTopTraded(params: AssetQueryParams): Promise<Asset[]>;
  // 가장 활발한 종목
  getMostActive(params: AssetQueryParams): Promise<Asset[]>;
  //상승 종목
  getTopGainers(params: AssetQueryParams): Promise<Asset[]>;
  //하락 종목
  getTopLosers(params: AssetQueryParams): Promise<Asset[]>;
  // 캔들 조회
  // getCandle(params: AssetQueryParams): Promise<Candle[]>;
  getCandles(params: CandleQueryParams): Promise<CandleResponse>;
}

export abstract class BaseFinancialProvider implements FinancialProvider {
  abstract assetType: AssetType;
  // abstract normalizeToAsset(data: any): Asset;
  abstract getAssets(params: AssetQueryParams): Promise<Asset[]>;
  abstract getSnapshots(params: AssetQueryParams): Promise<Asset[]>;
  abstract getTopTraded(params: AssetQueryParams): Promise<Asset[]>;
  abstract getMostActive(params: AssetQueryParams): Promise<Asset[]>;
  abstract getTopGainers(params: AssetQueryParams): Promise<Asset[]>;
  abstract getTopLosers(params: AssetQueryParams): Promise<Asset[]>;
  // abstract getCandle(params: AssetQueryParams): Promise<Candle[]>;
  abstract getCandles(params: CandleQueryParams): Promise<CandleResponse>;

  protected getDefaultTimeRange(timeframe: string) {
    const now = new Date();
    // 현재 시간(15분 지연)을 기준으로 end 설정 무료 버전
    const end = new Date(now.getTime() - 15 * 60 * 1000);

    let daysBack: number;

    // timeframe별 기본 기간 (무료 계정 고려)
    if (timeframe.includes('Min') || timeframe.includes('T')) {
      daysBack = 7; // 무료 1주일
    } else if (timeframe.includes('Hour') || timeframe.includes('H')) {
      daysBack = 30; // 무료 1개월
    } else if (timeframe.includes('Day') || timeframe.includes('D')) {
      daysBack = 365; // 일봉은 제약 없음
    } else if (timeframe.includes('Week') || timeframe.includes('W')) {
      daysBack = 365 * 2;
    } else {
      daysBack = 365 * 10;
    }

    const start = new Date(end.getTime() - daysBack * 24 * 60 * 60 * 1000);

    return {
      start: start.toISOString(),
      end: end.toISOString(),
    };
  }

  protected cleanCompanyName(name?: string): string {
    if (!name) return '';

    const stopWords = new Set([
      // 주식 종류/형태 관련 (제거 대상)
      'COMMON',
      'ORDINARY',
      'STOCK', // 추가
      'WARRANT',
      'SPONSORED',
      'DEPOSITARY',
      'RECEIPTS',
      'UNSPONSORED', // 추가
      'INC',
      'LTD',
      'CORP',
      'CORPORATION',
      'LLC',

      // 법인 형태 (남겨둠 - Brand Search가 처리하도록)
      // 'INC', 'LTD', 'CORP', 'CORPORATION', 'HOLDINGS', 'HLDGS',
      // 'LLC', 'ASA', 'PLC', 'LP', 'SHARES',  'CLASS',   'ADR', 'ETF', 'FUND', 'TRUST',

      // 기타 불필요 정보 (제거 대상)
      // 'COM',
      // 'NEW',
      // 'PAR',
    ]);

    const words = name.split(/\s+/);
    const resultWords = [];

    for (const word of words) {
      // 단어에서 특수문자 제거 후 대문자로 변환
      const cleanWord = word.replace(/[.,()]/g, '').toUpperCase();

      if (stopWords.has(cleanWord)) {
        break; // 중단 단어를 만나면 루프 종료
      }
      resultWords.push(word);
    }

    // 단어들을 합치고, 끝에 있는 쉼표(,) 제거
    return resultWords.join(' ').replace(/,$/, '').trim();
  }
}
