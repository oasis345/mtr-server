/**
 * @fileoverview 한국투자증권 해외/국내 종목 코드 파일 구조를 TypeScript 인터페이스로 정의합니다.
 */

// 해외 종목 코드 파일 구조 (예: nasmst.cod)
export interface OverseasStockCode {
  ncod: string /* National code (2) */;
  exid: string /* Exchange id (3) */;
  excd: string /* Exchange code (3) */;
  exnm: string /* Exchange name (16) */;
  symb: string /* Symbol (16) */;
  rsym: string /* realtime symbol (16) */;
  knam: string /* Korea name (64) */;
  enam: string /* English name (64) */;
  stis: string /* Security type (1)
   * 1:Index
   * 2:Stock
   * 3:ETP(ETF)
   * 4:Warrant */;
  curr: string /* currency (4) */;
  zdiv: string /* float position (1) */;
  ztyp: string /* data type (1) */;
  base: string /* base price (12) */;
  bnit: string /* Bid order size (8) */;
  anit: string /* Ask order size (8) */;
  mstm: string /* market start time(HHMM) (4) */;
  metm: string /* market end time(HHMM) (4) */;
  isdr: string /* DR 여부  :Y, N (1) */;
  drcd: string /* DR 국가코드 (2) */;
  icod: string /* 업종분류코드 (4) */;
  sjong: string /* 지수구성종목 존재 여부 (1)
   * 0:구성종목없음
   * 1:구성종목있음 */;
  ttyp: string /* Tick size Type (1) */;
  etyp: string /* 001: ETF 002: ETN 003: ETC 004: Others 005: VIX Underlying ETF 006: VIX Underlying ETN (3)*/;
  ttyp_sb: string /* Tick size type 상세 (ttyp 9일 경우 사용) : 런던 제트라 유로넥스트 (3) */;
}

// 코스피 종목 코드 파일 구조
export interface KospiStockCode {
  mksc_shrn_iscd: string /* 단축코드 (SZ_SHRNCODE) */;
  stnd_iscd: string /* 표준코드 (SZ_STNDCODE) */;
  hts_kor_isnm: string /* 한글종목명 (SZ_KORNAME) */;
  scrt_grp_cls_code: string /* 증권그룹구분코드 (2)
   * ST:주권 MF:증권투자회사 RT:부동산투자회사
   * SC:선박투자회사 IF:사회간접자본투융자회사
   * DR:주식예탁증서 EW:ELW EF:ETF
   * SW:신주인수권증권 SR:신주인수권증서
   * BC:수익증권 FE:해외ETF FS:외국주권 */;
  avls_scal_cls_code: string /* 시가총액 규모 구분 코드 유가 (1)
   * (0:제외 1:대 2:중 3:소) */;
  bstp_larg_div_code: string /* 지수 업종 대분류 코드 (4) */;
  bstp_medm_div_code: string /* 지수 업종 중분류 코드 (4) */;
  bstp_smal_div_code: string /* 지수 업종 소분류 코드 (4) */;
  mnin_cls_code_yn: string /* 제조업 구분 코드 (Y/N) (1) */;
  low_current_yn: string /* 저유동성종목 여부 (1) */;
  sprn_strr_nmix_issu_yn: string /* 지배 구조 지수 종목 여부 (Y/N) (1) */;
  kospi200_apnt_cls_code: string /* KOSPI200 섹터업종(20110401 변경됨) (1)
   * 0:미분류 1:건설기계 2:조선운송 3:철강소재
   * 4:에너지화학 5:정보통신 6:금융 7:필수소비재
   * 8: 자유소비재 */;
  kospi100_issu_yn: string /* KOSPI100여부 (1) */;
  kospi50_issu_yn: string /* KOSPI50 종목 여부 (1) */;
  krx_issu_yn: string /* KRX 종목 여부 (1) */;
  etp_prod_cls_code: string /* ETP 상품구분코드 (1)
   * 0:해당없음 1:투자회사형 2:수익증권형
   * 3:ETN 4:손실제한ETN */;
  elw_pblc_yn: string /* ELW 발행여부 (Y/N) (1) */;
  krx100_issu_yn: string /* KRX100 종목 여부 (Y/N) (1) */;
  krx_car_yn: string /* KRX 자동차 여부 (1) */;
  krx_smcn_yn: string /* KRX 반도체 여부 (1) */;
  krx_bio_yn: string /* KRX 바이오 여부 (1) */;
  krx_bank_yn: string /* KRX 은행 여부 (1) */;
  etpr_undt_objt_co_yn: string /* 기업인수목적회사여부 (1) */;
  krx_enrg_chms_yn: string /* KRX 에너지 화학 여부 (1) */;
  krx_stel_yn: string /* KRX 철강 여부 (1) */;
  short_over_cls_code: string /* 단기과열종목구분코드 0:해당없음 (1)
   * 1:지정예고 2:지정 3:지정연장(해제연기) */;
  krx_medi_cmnc_yn: string /* KRX 미디어 통신 여부 (1) */;
  krx_cnst_yn: string /* KRX 건설 여부 (1) */;
  krx_fnnc_svc_yn: string /* 삭제됨(20151218) (1) */;
  krx_scrt_yn: string /* KRX 증권 구분 (1) */;
  krx_ship_yn: string /* KRX 선박 구분 (1) */;
  krx_insu_yn: string /* KRX섹터지수 보험여부 (1) */;
  krx_trnp_yn: string /* KRX섹터지수 운송여부 (1) */;
  sri_nmix_yn: string /* SRI 지수여부 (Y,N) (1) */;
  stck_sdpr: string /* 주식 기준가 (9) */;
  frml_mrkt_deal_qty_unit: string /* 정규 시장 매매 수량 단위 (5) */;
  ovtm_mrkt_deal_qty_unit: string /* 시간외 시장 매매 수량 단위 (5) */;
  trht_yn: string /* 거래정지 여부 (1) */;
  sltr_yn: string /* 정리매매 여부 (1) */;
  mang_issu_yn: string /* 관리 종목 여부 (1) */;
  mrkt_alrm_cls_code: string /* 시장 경고 구분 코드 (2) (00:해당없음 01:투자주의
   * 02:투자경고 03:투자위험) */;
  mrkt_alrm_risk_adnt_yn: string /* 시장 경고위험 예고 여부 (1) */;
  insn_pbnt_yn: string /* 불성실 공시 여부 (1) */;
  byps_lstn_yn: string /* 우회 상장 여부 (1) */;
  flng_cls_code: string /* 락구분 코드 (2) (00:해당사항없음 01:권리락
   * 02:배당락 03:분배락 04:권배락 05:중간배당락
   * 06:권리중간배당락 99:기타)
   * S?W,SR,EW는 미해당(SPACE) */;
  fcam_mod_cls_code: string /* 액면가 변경 구분 코드 (2) (00:해당없음
   * 01:액면분할 02:액면병합 99:기타) */;
  icic_cls_code: string /* 증자 구분 코드 (2) (00:해당없음 01:유상증자
   * 02:무상증자 03:유무상증자 99:기타) */;
  marg_rate: string /* 증거금 비율 (3) */;
  crdt_able: string /* 신용주문 가능 여부 (1) */;
  crdt_days: string /* 신용기간 (3) */;
  prdy_vol: string /* 전일 거래량 (12) */;
  stck_fcam: string /* 주식 액면가 (12) */;
  stck_lstn_date: string /* 주식 상장 일자 (8) */;
  lstn_stcn: string /* 상장 주수(천) (15) */;
  cpfn: string /* 자본금 (21) */;
  stac_month: string /* 결산 월 (2) */;
  po_prc: string /* 공모 가격 (7) */;
  prst_cls_code: string /* 우선주 구분 코드 (1) (0:해당없음(보통주)
   * 1:구형우선주 2:신형우선주) */;
  ssts_hot_yn: string /* 공매도과열종목여부 (1) */;
  stange_runup_yn: string /* 이상급등종목여부 (1) */;
  krx300_issu_yn: string /* KRX300 종목 여부 (Y/N) (1) */;
  kospi_issu_yn: string /* KOSPI여부 (1) */;
  sale_account: string /* 매출액 (9) */;
  bsop_prfi: string /* 영업이익 (9) */;
  op_prfi: string /* 경상이익 (9) */;
  thtr_ntin: string /* 당기순이익 (5) */;
  roe: string /* ROE(자기자본이익률) (9) */;
  base_date: string /* 기준년월 (8) */;
  prdy_avls_scal: string /* 전일기준 시가총액 (억) (9) */;
  grp_code: string /* 그룹사 코드 (3) */;
  co_crdt_limt_over_yn: string /* 회사신용한도초과여부 (1) */;
  secu_lend_able_yn: string /* 담보대출가능여부 (1) */;
  stln_able_yn: string /* 대주가능여부 (1) */;
}

// 코스닥 종목 코드 파일 구조
export interface KosdaqStockCode {
  mksc_shrn_iscd: string /* 단축코드 (SZ_SHRNCODE) */;
  stnd_iscd: string /* 표준코드 (SZ_STNDCODE) */;
  hts_kor_isnm: string /* 한글종목명 (SZ_KORNAME) */;
  scrt_grp_cls_code: string /* 증권그룹구분코드 (2)
   * ST:주권 MF:증권투자회사 RT:부동산투자회사
   * SC:선박투자회사 IF:사회간접자본투융자회사
   * DR:주식예탁증서 EW:ELW EF:ETF
   * SW:신주인수권증권 SR:신주인수권증서
   * BC:수익증권 FE:해외ETF FS:외국주권 */;
  avls_scal_cls_code: string /* 시가총액 규모 구분 코드 유가 (1)
   * (0:제외 1:KOSDAQ100 2:KOSDAQmid300 3:KOSDAQsmall) */;
  bstp_larg_div_code: string /* 지수업종 대분류 코드 (4) */;
  bstp_medm_div_code: string /* 지수 업종 중분류 코드 (4) */;
  bstp_smal_div_code: string /* 지수업종 소분류 코드 (4) */;
  vntr_issu_yn: string /* 벤처기업 여부 (Y/N) (1) */;
  low_current_yn: string /* 저유동성종목 여부 (1) */;
  krx_issu_yn: string /* KRX 종목 여부 (1) */;
  etp_prod_cls_code: string /* ETP 상품구분코드 (1)
   * 0:해당없음 1:투자회사형 2:수익증권형
   * 3:ETN 4:손실제한ETN */;
  krx100_issu_yn: string /* KRX100 종목 여부 (Y/N) (1) */;
  krx_car_yn: string /* KRX 자동차 여부 (1) */;
  krx_smcn_yn: string /* KRX 반도체 여부 (1) */;
  krx_bio_yn: string /* KRX 바이오 여부 (1) */;
  krx_bank_yn: string /* KRX 은행 여부 (1) */;
  etpr_undt_objt_co_yn: string /* 기업인수목적회사여부 (1) */;
  krx_enrg_chms_yn: string /* KRX 에너지 화학 여부 (1) */;
  krx_stel_yn: string /* KRX 철강 여부 (1) */;
  short_over_cls_code: string /* 단기과열종목구분코드 0:해당없음 (1)
   * 1:지정예고 2:지정 3:지정연장(해제연기) */;
  krx_medi_cmnc_yn: string /* KRX 미디어 통신 여부 (1) */;
  krx_cnst_yn: string /* KRX 건설 여부 (1) */;
  invt_alrm_yn: string /* (코스닥)투자주의환기종목여부 (1) */;
  krx_scrt_yn: string /* KRX 증권 구분 (1) */;
  krx_ship_yn: string /* KRX 선박 구분 (1) */;
  krx_insu_yn: string /* KRX섹터지수 보험여부 (1) */;
  krx_trnp_yn: string /* KRX섹터지수 운송여부 (1) */;
  ksq150_nmix_yn: string /* KOSDAQ150지수여부 (Y,N) (1) */;
  stck_sdpr: string /* 주식 기준가 (9) */;
  frml_mrkt_deal_qty_unit: string /* 정규 시장 매매 수량 단위 (5) */;
  ovtm_mrkt_deal_qty_unit: string /* 시간외 시장 매매 수량 단위 (5) */;
  trht_yn: string /* 거래정지 여부 (1) */;
  sltr_yn: string /* 정리매매 여부 (1) */;
  mang_issu_yn: string /* 관리 종목 여부 (1) */;
  mrkt_alrm_cls_code: string /* 시장 경고 구분 코드 (2) (00:해당없음 01:투자주의
   * 02:투자경고 03:투자위험) */;
  mrkt_alrm_risk_adnt_yn: string /* 시장 경고위험 예고 여부 (1) */;
  insn_pbnt_yn: string /* 불성실 공시 여부 (1) */;
  byps_lstn_yn: string /* 우회 상장 여부 (1) */;
  flng_cls_code: string /* 락구분 코드 (2) (00:해당사항없음 01:권리락
   * 02:배당락 03:분배락 04:권배락 05:중간배당락
   * 06:권리중간배당락 99:기타)
   * SW,SR,EW는 미해당(SPACE) */;
  fcam_mod_cls_code: string /* 액면가 변경 구분 코드 (2) (00:해당없음
   * 01:액면분할 02:액면병합 99:기타) */;
  icic_cls_code: string /* 증자 구분 코드 (2) (00:해당없음 01:유상증자
   * 02:무상증자 03:유무상증자 99:기타) */;
  marg_rate: string /* 증거금 비율 (3) */;
  crdt_able: string /* 신용주문 가능 여부 (1) */;
  crdt_days: string /* 신용기간 (3) */;
  prdy_vol: string /* 전일 거래량 (12) */;
  stck_fcam: string /* 주식 액면가 (12) */;
  stck_lstn_date: string /* 주식 상장 일자 (8) */;
  lstn_stcn: string /* 상장 주수(천) (15) */;
  cpfn: string /* 자본금 (21) */;
  stac_month: string /* 결산 월 (2) */;
  po_prc: string /* 공모 가격 (7) */;
  prst_cls_code: string /* 우선주 구분 코드 (1) (0:해당없음(보통주)
   * 1:구형우선주 2:신형우선주) */;
  ssts_hot_yn: string /* 공매도과열종목여부 (1) */;
  stange_runup_yn: string /* 이상급등종목여부 (1) */;
  krx300_issu_yn: string /* KRX300 종목 여부 (Y/N) (1) */;
  sale_account: string /* 매출액 (9) */;
  bsop_prfi: string /* 영업이익 (9) */;
  op_prfi: string /* 경상이익 (9) */;
  thtr_ntin: string /* 당기순이익 (5) */;
  roe: string /* ROE(자기자본이익률) (9) */;
  base_date: string /* 기준년월 (8) */;
  prdy_avls_scal: string /* 전일기준 시가총액 (억) (9) */;
  grp_code: string /* 그룹사 코드 (3) */;
  co_crdt_limt_over_yn: string /* 회사신용한도초과여부 (1) */;
  secu_lend_able_yn: string /* 담보대출가능여부 (1) */;
  stln_able_yn: string /* 대주가능여부 (1) */;
}

export interface KisOauthToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  access_token_token_expired: string;
}

export interface KistMostActiveStock {
  rsym: string; // 실시간조회심볼
  excd: string; // 거래소코드
  symb: string; // 종목코드
  knam: string; // 종목명
  last: string; // 현재가
  sign: string; // 기호
  diff: string; // 대비
  rate: string; // 등락율
  tvol: string; // 거래량
  pask: string; // 매도호가
  pbid: string; // 매수호가
  n_tvol: string; // 기준거래량
  n_diff: string; // 증가량
  n_rate: string; // 증가율
  enam: string; // 영문종목명
  e_ordyn: string; // 매매가능
}

// output1 객체를 위한 인터페이스
export interface KistMostActiveStatus {
  zdiv: string; // 소수점자리수
  stat: string; // 거래상태
  nrec: string; // RecordCount
}

// 전체 응답 데이터 구조를 위한 인터페이스
export interface KisMostActiveResponse {
  rt_cd: string; // 성공 실패 여부
  msg_cd: string; // 응답코드
  msg1: string; // 응답메세지
  output1: KistMostActiveStatus; // 응답상세
  output2: KistMostActiveStock[]; // 응답상세 (배열)
}
