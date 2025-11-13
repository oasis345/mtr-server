import { Body, Controller, Get, Post, Query, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Get('google/callback')
  async googleCallback(@Query('code') code: string, @Res() res: Response) {
    const tokens = await this.authService.googleLogin(code);

    this.authService.setTokenCookie({
      response: res,
      token: tokens.accessToken,
      tokenName: 'mtr_access_token',
      httpOnly: false,
    });

    this.authService.setTokenCookie({
      response: res,
      token: tokens.refreshToken,
      tokenName: 'mtr_refresh_token',
    });

    res.redirect(
      `${this.configService.get('CORS_ORIGIN')}/auth/google/callback`,
    );
  }

  @Post('refresh')
  async refreshToken(
    @Body('refreshToken') refreshToken: string,
    @Res() res: Response,
  ) {
    const tokens = await this.authService.refreshToken(refreshToken);

    return res.status(200).json({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  }
}
