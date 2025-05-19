import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service';
import { ApiResponse } from '@/common/dto/response.dto';
import { CurrentUser } from '@/common/decorators/user.decorator';
import { User } from '@shared/types/user';
import { AuthGuard } from '@nestjs/passport';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('profile')
  async getProfile(@CurrentUser() user: User) {
    try {
      const userData = await this.userService.findById(user.id);
      return new ApiResponse({ data: userData });
    } catch (error) {
      throw new HttpException(
        {
          statusCode: HttpStatus.NOT_FOUND,
          message: 'User not found',
        },
        HttpStatus.NOT_FOUND,
      );
    }
  }
}
