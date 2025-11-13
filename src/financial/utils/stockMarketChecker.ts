import { Dayjs } from '@/common/utils/dayjs';
import { EnableExchangeStockCountry, StockMarketStatus } from '../types/stock.types';

const KST = 'Asia/Seoul';
const ET = 'America/New_York';

/**
 * 주어진 기준 날짜와 시간 문자열을 사용하여 특정 타임존의 Dayjs 객체를 생성합니다.
 * @param baseDate 기준이 될 Dayjs 객체
 * @param timeStr 'HH:MM' 형식의 시간 문자열
 * @param timeZone 타임존 문자열 (예: 'Asia/Seoul')
 * @returns {Dayjs} 해당 날짜와 시간으로 설정된 Dayjs 객체
 */
function createTimeInZone(baseDate: Dayjs, timeStr: string, timeZone: string): Dayjs {
  const [hour, minute] = timeStr.split(':').map(Number);
  return baseDate.tz(timeZone).hour(hour).minute(minute).second(0).millisecond(0);
}

/**
 * 특정 국가의 주식 시장 현재 거래 상태를 반환합니다.
 * @param marketCode 'KR' 또는 'US'
 * @param timestamp 기준 시간 Dayjs 객체
 * @returns {StockMarketStatus} 현재 시장 상태 ('REGULAR', 'PRE', 'AFTER', 'CLOSE')
 */
export function checkMarketStatus(marketCode: EnableExchangeStockCountry, timestamp: Dayjs): StockMarketStatus {
  // --- 한국(KRX) 시장 로직 ---
  if (marketCode === 'KR') {
    const nowKST = timestamp.tz(KST);
    const dayOfWeek = nowKST.day(); // 0=일요일, 6=토요일

    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return 'CLOSE';
    }

    const marketOpen = createTimeInZone(nowKST, '09:00', KST);
    const marketClose = createTimeInZone(nowKST, '15:30', KST);

    if (nowKST.isBetween(marketOpen, marketClose, 'minute', '[]')) {
      return 'REGULAR';
    }

    return 'CLOSE';
  }

  // --- 미국(US) 시장 로직 ---
  if (marketCode === 'US') {
    const nowET = timestamp.tz(ET);
    const dayOfWeek = nowET.day(); // 미국 현지 기준 요일

    // 미국 시장은 현지 시간 기준 주말(토, 일)에 휴장합니다.
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return 'CLOSE';
    }
    // 참고: 이 로직은 미국 공휴일을 고려하지 않습니다.

    // 모든 시장 시간을 미국 동부 시간(ET) 기준으로 생성합니다.
    const preMarketStart = createTimeInZone(nowET, '04:00', ET);
    const regularMarketStart = createTimeInZone(nowET, '09:30', ET);
    const regularMarketEnd = createTimeInZone(nowET, '16:00', ET);
    const afterMarketEnd = createTimeInZone(nowET, '20:00', ET);

    if (nowET.isBetween(regularMarketStart, regularMarketEnd, 'minute', '[)')) {
      return 'REGULAR';
    }
    if (nowET.isBetween(preMarketStart, regularMarketStart, 'minute', '[)')) {
      return 'PRE';
    }
    if (nowET.isBetween(regularMarketEnd, afterMarketEnd, 'minute', '[)')) {
      return 'AFTER';
    }

    return 'CLOSE';
  }

  // 지원되지 않는 시장 코드의 경우
  return 'CLOSE';
}
