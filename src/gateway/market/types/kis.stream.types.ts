/**
 * 한국투자증권 웹소켓 메시지의 헤더 구조.
 * 실제 API 문서에 따라 필드명과 타입이 정확해야 합니다.
 */
export interface KoreaInvestmentRequestHeader {
  approval_key: string; // 웹소켓 접속키
  custtype: string; // 고객 타입 (예: "P": 개인, "B": 법인)
  tr_type: '1' | '2'; // 등록/해제 ("1": 등록, "2": 해제)
  'content-type'?: string; // 컨텐츠타입 (WebSocket 메시지 바디에서는 선택 사항일 수 있음)
}

/**
 * 한국투자증권 웹소켓 메시지의 바디 구조.
 * 실제 API 문서에 따라 필드명과 타입이 정확해야 합니다.
 */
export interface KoreaInvestmentRequestBody {
  tr_id: string; // 거래ID (예: "H0STCNT0" for 주식 현재가, "H0STASP0" for 호가)
  tr_key: string; // R거래소명종목코드 (예: "005930" for 삼성전자)
}

/**
 * 한국투자증권 웹소켓으로 전송하는 전체 요청 메시지 구조.
 */
export interface KoreaInvestmentWebSocketRequest {
  header: KoreaInvestmentRequestHeader;
  body: KoreaInvestmentRequestBody;
}

export interface KoreaInvestmentTradeMessage {
  RSYM: string; // 실시간종목코드
  SYMB: string; // 종목코드
  ZDIV: string; // 소숫점자리수
  TYMD: string; // 현지영업일자
  XYMD: string; // 현지일자
  XHMS: string; // 현지시간
  KYMD: string; // 한국일자
  KHMS: string; // 한국시간
  OPEN: string; // 시가
  HIGH: string; // 고가
  LOW: string; // 저가
  LAST: string; // 현재가
  SIGN: string; // 대비구분
  DIFF: string; // 전일대비
  RATE: string; // 등락율
  PBID: string; // 매수호가
  PASK: string; // 매도호가
  VBID: string; // 매수잔량
  VASK: string; // 매도잔량
  EVOL: string; // 체결량
  TVOL: string; // 거래량
  TAMT: string; // 거래대금
  BIVL: string; // 매도체결량
  ASVL: string; // 매수체결량
  STRN: string; // 체결강도
  MTYP: '1' | '2' | '3'; // 시장구분 '1':장중, '2':장전, '3':장후
}

/**
 * 한국투자증권 웹소켓의 컨트롤 메시지 (예: 구독 성공 응답) 인터페이스.
 */
export interface KoreaInvestmentSubscriptionControlMessage {
  header: {
    tr_id: string; // 거래 ID (예: "HDFSCNT0")
    tr_key: string; // 종목 키 (예: "DNASCHR")
    encrypt: 'N';
  };
  body: {
    rt_cd: string; // 응답 코드 (예: "0")
    msg_cd: string; // 메시지 코드 (예: "OPSP0000")
    msg1: string; // 메시지 내용 (예: "SUBSCRIBE SUCCESS")
    output?: {
      iv: string;
      key: string;
    };
  };
}

/**
 * 한국투자증권 웹소켓에서 수신될 수 있는 모든 메시지 유형의 유니온 타입.
 */
export type KoreaInvestmentWebSocketMessage = KoreaInvestmentSubscriptionControlMessage | KoreaInvestmentTradeMessage;
