import { randomBytes, scrypt as _scrypt } from 'crypto';
import { promisify } from 'util';
/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

const scrypt = promisify(_scrypt);

const users = [];

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  async signUp(email: string, password: string, roles: string[] = []) {
    const existingUser = users.find((user) => user.email === email);
    if (existingUser) {
      return new BadRequestException('Email in use');
    }

    const salt = randomBytes(8).toString('hex');
    const hash = (await scrypt(password, salt, 32)) as Buffer;
    const saltAndHash = `${salt}.${hash.toString('hex')}`;

    const user = {
      email,
      password: saltAndHash,
      roles,
    };

    users.push(user);

    console.log('Signed up', user);
    const { password: _, ...result } = user;
    return result;
  }

  async signIn(email: string, password: string) {
    const user = users.find((user) => user.email === email);
    if (!user) {
      return new UnauthorizedException('Invalid credentials');
    }

    const [salt, storedHash] = user.password.split('.');
    const hash = (await scrypt(password, salt, 32)) as Buffer;

    if (storedHash != hash.toString('hex')) {
      return new UnauthorizedException('Invalid credentials');
    }

    console.log('Signed in', user);
    const payload = {
      username: user.email,
      sub: user.userId,
      roles: user.roles,
    };
    return { accessToken: this.jwtService.sign(payload) };
  }
}
