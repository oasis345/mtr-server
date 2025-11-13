import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  picture?: string;
  verified_email: boolean;
}

@Injectable()
export class GoogleClient {
  constructor(private readonly configService: ConfigService) {}

  async getToken(code: string): Promise<string> {
    const tokenUrl = 'https://oauth2.googleapis.com/token';

    const data = {
      code,
      client_id: this.configService.get<string>('GOOGLE_CLIENT_ID'),
      client_secret: this.configService.get<string>('GOOGLE_CLIENT_SECRET'),
      redirect_uri: this.configService.get<string>('GOOGLE_REDIRECT_URI'),
      grant_type: 'authorization_code',
    };

    const response = await axios.post<{ access_token: string }>(tokenUrl, data);
    return response.data?.access_token;
  }

  async getUserInfo(accessToken: string) {
    const { data } = await axios.get<GoogleUserInfo>(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );

    return {
      provider_id: data.id,
      email: data.email,
      name: data.name,
      provider: 'google' as const,
    };
  }
}
