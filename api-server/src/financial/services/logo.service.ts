import { AppCacheService } from '@/cache/cache.service';
import { CustomHttpService } from '@/common/http/http.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cache } from 'cache-manager';

interface CompanyInfo {
  symbol: string;
  name?: string;
}

const LOGOS_CACHE_KEY = 'market:stocks:logos';
const LOGO_CACHE_TTL = 86400 * 7; // 7 days

@Injectable()
export class LogoService {
  private readonly logger = new Logger(LogoService.name);

  constructor(
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly httpService: CustomHttpService,
    private readonly configService: ConfigService,
    private readonly cacheService: AppCacheService,
  ) {}

  async getLogoMap(): Promise<Record<string, string>> {
    return (await this.cacheService.get<Record<string, string>>(LOGOS_CACHE_KEY)) || {};
  }

  private async setLogoMap(logoMap: Record<string, string>): Promise<void> {
    await this.cacheService.set(LOGOS_CACHE_KEY, logoMap, LOGO_CACHE_TTL);
  }

  async getStockLogo(symbol: string): Promise<string | null> {
    const logoMap = await this.getLogoMap();
    const cachedLogo = logoMap[symbol];

    if (cachedLogo) {
      return cachedLogo === 'NOT_FOUND' ? null : cachedLogo;
    }

    const newLogo = this.generateLogoUrl(symbol);
    logoMap[symbol] = newLogo || 'NOT_FOUND';
    await this.setLogoMap(logoMap);

    return newLogo;
  }

  private generateLogoUrl(symbol: string): string | null {
    const apiKey = this.configService.get<string>('LOGODEV_PUBLIC_KEY');
    if (!apiKey) {
      this.logger.warn('LOGODEV_PUBLIC_KEY is not configured.');
      return null;
    }

    // Ticker에 특수문자(.)가 포함된 경우 처리 (예: BRK.B -> BRK-B)
    const sanitizedSymbol = symbol.replace('.', '-');

    // 이미지 URL 생성 (API 호출 불필요)
    return `https://img.logo.dev/ticker/${sanitizedSymbol}?token=${apiKey}&retina=true`;
  }

  async getStockLogos(companies: CompanyInfo[]): Promise<Record<string, string>> {
    const logoMap = await this.getLogoMap();
    const results: Record<string, string> = {};
    let needsUpdate = false;

    for (const company of companies) {
      const symbol = company.symbol;
      const cachedLogo = logoMap[symbol];

      if (cachedLogo) {
        if (cachedLogo !== 'NOT_FOUND') results[symbol] = cachedLogo;
      } else {
        // 캐시 미스: URL 생성 및 맵에 추가
        const newLogo = this.generateLogoUrl(symbol);
        if (newLogo) {
          results[symbol] = newLogo;
          logoMap[symbol] = newLogo;
        } else {
          logoMap[symbol] = 'NOT_FOUND';
        }
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      await this.setLogoMap(logoMap);
    }

    return results;
  }
}
