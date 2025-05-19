import {
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { GoogleClient } from './client/google.client';
import { UserService } from '@/user/user.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { User } from '@prisma/client';
import { JwtPayload } from '@/common/interfaces/auth.interface';
import { Response } from 'express';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly googleClient: GoogleClient,
    private readonly userService: UserService,
    private readonly configService: ConfigService,
  ) {}

  async googleLogin(code: string) {
    try {
      const accessToken = await this.googleClient.getToken(code);
      const userInfo = await this.googleClient.getUserInfo(accessToken);

      let user = await this.userService.findBySocialId(userInfo.socialId);
      if (!user) {
        user = await this.userService.createUser(userInfo);
      }

      return this.generateToken(user);
    } catch (error) {
      throw new HttpException(
        {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Google login failed: ' + error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async generateToken(user: User) {
    const [accessToken, refreshToken] = await Promise.all([
      this.generateAccessToken(user),
      this.generateRefreshToken(user),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  private async generateAccessToken(user: User): Promise<string> {
    const payload = {
      email: user.email,
      sub: user.id,
      name: user.name,
    };

    return this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: '30s',
    });
  }

  private async generateRefreshToken(user: User): Promise<string> {
    const payload = {
      sub: user.id,
    };

    return this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: '7d',
    });
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload: JwtPayload = await this.jwtService.verifyAsync(
        refreshToken,
        {
          secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        },
      );

      const user = await this.userService.findById(payload.sub);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      const [accessToken, newRefreshToken] = await Promise.all([
        this.generateAccessToken(user),
        this.generateRefreshToken(user),
      ]);

      return {
        accessToken,
        refreshToken: newRefreshToken,
      };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  setTokenCookie(response: Response, token: string, tokenName: string) {
    const isProduction = this.configService.get('NODE_ENV') === 'production';
    const domain = this.configService.get<string>('CORS_ORIGIN'); // 예: .yourdomain.com

    response.cookie(tokenName, token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax', // production에서는 'none'으로 설정
      domain: isProduction ? domain : undefined, // production에서만 domain 설정
      path: '/',
    });
  }
}
