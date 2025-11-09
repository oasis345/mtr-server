import { AssetType } from '@/common/types';
import { Asset } from '@/common/types/asset.types';
import { Injectable, Logger } from '@nestjs/common';
import { CustomHttpService } from '@/common/http/http.service';
import * as iconv from 'iconv-lite';
import { BaseFinancialProvider } from '../financial.provider';
import { AssetQueryParams } from '../../types';
import AdmZip from 'adm-zip';

interface KoreaInvestmentAssetQueryParams extends AssetQueryParams {
  country?: 'KR' | 'US';
}

interface CodeFileConfig {
  [exchange: string]: string;
}

@Injectable()
export class KisStockProvider extends BaseFinancialProvider {
  id = 'kis';
  assetType = AssetType.STOCK;
  private readonly logger = new Logger(KisStockProvider.name);

  constructor(private readonly httpService: CustomHttpService) {
    super();
  }

  async getAssets(params: KoreaInvestmentAssetQueryParams): Promise<Asset[]> {
    this.logger.debug(`KoreaInvestmentStockProvider: getAssets called for country: ${params.country || 'ALL'}`);

    const targetCountry = params.country; // 요청 파라미터에서 country 가져오기
    const countryMap = this.getCountryCodeMap();
    const assets: Asset[] = [];

    // 'KR' 또는 'US'만 지원
    if (targetCountry && (targetCountry === 'KR' || targetCountry === 'US')) {
      if (targetCountry === 'KR') {
        try {
          const kospiAssets = await this.getKospiMasterData();
          assets.push(...kospiAssets);
        } catch (error) {
          this.logger.error(`Failed to load KOSPI assets: ${error.message}`);
        }
        try {
          const kosdaqAssets = await this.getKosdaqMasterData();
          assets.push(...kosdaqAssets);
        } catch (error) {
          this.logger.error(`Failed to load KOSDAQ assets: ${error.message}`);
        }
      } else if (targetCountry === 'US') {
        const countryConfig = countryMap[targetCountry];
        if (!countryConfig) {
          // 이 경우는 발생하지 않겠지만 방어적으로 추가
          this.logger.warn(`No configuration found for country code: ${targetCountry}. Returning empty array.`);
          return [];
        }
        for (const exchange in countryConfig) {
          const zipUrl = countryConfig[exchange];
          try {
            const expectedFileName = zipUrl.substring(zipUrl.lastIndexOf('/') + 1).replace('.zip', '');
            const fileAssets = await this.downloadAndParseCodFile(zipUrl, targetCountry, exchange, expectedFileName);
            assets.push(...fileAssets);
          } catch (error) {
            this.logger.error(
              `Failed to load assets for ${targetCountry}:${exchange} from ${zipUrl}: ${error.message}`,
            );
          }
        }
      }
    } else {
      // 특정 국가가 지정되지 않았거나 지원하지 않는 국가인 경우, KR과 US 모두 처리
      this.logger.warn(`No specific country or unsupported country requested. Loading assets for KR and US.`);

      try {
        const kospiAssets = await this.getKospiMasterData();
        assets.push(...kospiAssets);
      } catch (error) {
        this.logger.error(`Failed to load KOSPI assets: ${error.message}`);
      }
      try {
        const kosdaqAssets = await this.getKosdaqMasterData();
        assets.push(...kosdaqAssets);
      } catch (error) {
        this.logger.error(`Failed to load KOSDAQ assets: ${error.message}`);
      }

      const usConfig = countryMap['US'];
      if (usConfig) {
        for (const exchange in usConfig) {
          const zipUrl = usConfig[exchange];
          try {
            const expectedFileName = zipUrl.substring(zipUrl.lastIndexOf('/') + 1).replace('.zip', '');
            const fileAssets = await this.downloadAndParseCodFile(zipUrl, 'US', exchange, expectedFileName);
            assets.push(...fileAssets);
          } catch (error) {
            this.logger.error(`Failed to load assets for US:${exchange} from ${zipUrl}: ${error.message}`);
          }
        }
      }
    }

    if (assets.length === 0) {
      this.logger.warn('No stock assets loaded from Korea Investment sources.');
    }
    return assets;
  }

  // getMostActive(params: AssetQueryParams): Promise<Stock[]> {
  //   const response = this.kisClient.get('/uapi/overseas-stock/v1/ranking/trade-vol', {
  //     params: {
  //       limit: params.limit,
  //       offset: params.offset,
  //       sort: 'desc',
  //     },
  //   });
  //   return response.then(res => res.data.data.map(this.normalizeToStock));
  // }

  // downloadAndParseCodFile 메서드에 expectedFileName 파라미터 추가
  private async downloadAndParseCodFile(
    zipUrl: string,
    countryCode: string,
    exchangeName: string,
    expectedFileName: string,
  ): Promise<Asset[]> {
    this.logger.debug(`Downloading ${zipUrl} for ${countryCode}:${exchangeName}...`);
    const assets: Asset[] = [];
    try {
      // CustomHttpService.get은 Promise<T>를 반환합니다. T가 ArrayBuffer이므로 직접 사용합니다.
      const responseBuffer = await this.httpService.get<ArrayBuffer>(zipUrl, {
        responseType: 'arraybuffer',
      });
      const zip = new AdmZip(Buffer.from(responseBuffer));
      const zipEntries = zip.getEntries();
      let codFileContent: string | null = null;

      for (const entry of zipEntries) {
        this.logger.debug(`Checking zip entry: ${entry.entryName} (expected: ${expectedFileName})`);
        if (entry.entryName === expectedFileName.toUpperCase()) {
          const data = entry.getData();
          if (data && data.length > 0) {
            codFileContent = iconv.decode(data, 'EUC-KR');
            this.logger.debug(`Found and decoded .cod file: ${entry.entryName}`);
            break;
          } else {
            this.logger.warn(`Found .cod file ${entry.entryName}, but it was empty.`);
          }
        }
      }

      if (!codFileContent) {
        throw new Error(`${expectedFileName} file not found or empty in ${zipUrl}.`);
      }

      const lines = codFileContent.split('\n').filter(line => line.trim() !== '');

      const SYMBOL_INDEX = 4;
      const KOREAN_NAME_INDEX = 6;
      const ENGLISH_NAME_INDEX = 7;
      const EXCHANGE_CODE_INDEX = 2;
      const EXCHANGE_NAME_INDEX = 3;
      const CURRENCY_INDEX = 9;

      for (const line of lines) {
        const parts = line.split('\t');
        if (parts.length > SYMBOL_INDEX) {
          const symbol = parts[SYMBOL_INDEX]?.trim();
          let name = parts[KOREAN_NAME_INDEX]?.trim() || parts[ENGLISH_NAME_INDEX]?.trim();
          if (!name) name = symbol;

          if (symbol) {
            assets.push({
              assetType: AssetType.STOCK,
              symbol: symbol,
              name: this.cleanCompanyName(name),
              exchange: parts[EXCHANGE_CODE_INDEX]?.trim(),
              currency: parts[CURRENCY_INDEX]?.trim() || (countryCode === 'KR' ? 'KRW' : 'USD'),
            });
          }
        } else {
          this.logger.warn(
            `Skipping malformed line in ${zipUrl}: ${line.substring(0, Math.min(line.length, 100))}... (too few columns)`,
          );
        }
      }
    } catch (error) {
      this.logger.error(`Error processing ${zipUrl}: ${error.message}`);
      throw error;
    }
    return assets;
  }

  private async getKospiMasterData(): Promise<Asset[]> {
    const zipUrl = 'https://new.real.download.dws.co.kr/common/master/kospi_code.mst.zip';
    this.logger.debug(`Downloading KOSPI master data from ${zipUrl}...`);
    const assets: Asset[] = [];
    try {
      const responseBuffer = await this.httpService.get<ArrayBuffer>(zipUrl, { responseType: 'arraybuffer' });
      const zip = new AdmZip(Buffer.from(responseBuffer));
      const zipEntries = zip.getEntries();
      let mstFileContent: string | null = null;

      for (const entry of zipEntries) {
        this.logger.debug(`Checking KOSPI zip entry: ${entry.entryName}`);
        if (entry.entryName === 'kospi_code.mst') {
          const data = entry.getData();
          if (data && data.length > 0) {
            mstFileContent = iconv.decode(data, 'EUC-KR');
            this.logger.debug(`Found and decoded kospi_code.mst: ${entry.entryName}`);
            break;
          } else {
            this.logger.warn(`Found kospi_code.mst ${entry.entryName}, but it was empty.`);
          }
        }
      }

      if (!mstFileContent) {
        throw new Error(`kospi_code.mst file not found or empty in ${zipUrl}.`);
      }

      const lines = mstFileContent.split('\n').filter(line => line.trim() !== '');

      for (const row of lines) {
        const rf1 = row.substring(0, row.length - 228);
        const mksc_shrn_iscd = rf1.substring(0, 9).trim();
        const hts_kor_isnm = rf1.substring(21).trim();

        if (mksc_shrn_iscd) {
          assets.push({
            assetType: AssetType.STOCK,
            symbol: mksc_shrn_iscd,
            name: this.cleanCompanyName(hts_kor_isnm),
            exchange: 'KOSPI',
            currency: 'KRW',
          });
        }
      }
    } catch (error) {
      this.logger.error(`Error processing KOSPI master data from ${zipUrl}: ${error.message}`);
      throw error;
    }
    return assets;
  }

  private async getKosdaqMasterData(): Promise<Asset[]> {
    const zipUrl = 'https://new.real.download.dws.co.kr/common/master/kosdaq_code.mst.zip';
    this.logger.debug(`Downloading KOSDAQ master data from ${zipUrl}...`);
    const assets: Asset[] = [];
    try {
      const responseBuffer = await this.httpService.get<ArrayBuffer>(zipUrl, { responseType: 'arraybuffer' });
      const zip = new AdmZip(Buffer.from(responseBuffer));
      const zipEntries = zip.getEntries();
      let mstFileContent: string | null = null;

      for (const entry of zipEntries) {
        this.logger.debug(`Checking KOSDAQ zip entry: ${entry.entryName}`);
        if (entry.entryName === 'kosdaq_code.mst') {
          const data = entry.getData();
          if (data && data.length > 0) {
            mstFileContent = iconv.decode(data, 'EUC-KR');
            this.logger.debug(`Found and decoded kosdaq_code.mst: ${entry.entryName}`);
            break;
          } else {
            this.logger.warn(`Found kosdaq_code.mst ${entry.entryName}, but it was empty.`);
          }
        }
      }

      if (!mstFileContent) {
        throw new Error(`kosdaq_code.mst file not found or empty in ${zipUrl}.`);
      }

      const lines = mstFileContent.split('\n').filter(line => line.trim() !== '');

      for (const row of lines) {
        const rf1 = row.substring(0, row.length - 222);
        const mksc_shrn_iscd = rf1.substring(0, 9).trim();
        const hts_kor_isnm = rf1.substring(21).trim();

        if (mksc_shrn_iscd) {
          assets.push({
            assetType: AssetType.STOCK,
            symbol: mksc_shrn_iscd,
            name: this.cleanCompanyName(hts_kor_isnm),
            exchange: 'KOSDAQ',
            currency: 'KRW',
          });
        }
      }
    } catch (error) {
      this.logger.error(`Error processing KOSDAQ master data from ${zipUrl}: ${error.message}`);
      throw error;
    }
    return assets;
  }

  private getCountryCodeMap(): { [countryCode: string]: CodeFileConfig } {
    // koreaInvestment는 한국과 미국만 지원하므로, 해당 국가들만 맵에 정의합니다.
    return {
      KR: {
        kosdak: 'https://new.real.download.dws.co.kr/common/master/kosdaq_code.mst.zip',
        kospi: 'https://new.real.download.dws.co.kr/common/master/kospi_code.mst.zip',
      },
      US: {
        nasdak: 'https://new.real.download.dws.co.kr/common/master/nasmst.cod.zip',
        nys: 'https://new.real.download.dws.co.kr/common/master/nysmst.cod.zip',
        ams: 'https://new.real.download.dws.co.kr/common/master/amsmst.cod.zip',
      },
    };
  }
}
