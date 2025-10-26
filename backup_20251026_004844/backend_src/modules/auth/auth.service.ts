import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { Admin } from '../../entities/admin.entity';
import { User } from '../../entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Admin)
    private adminRepo: Repository<Admin>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  /**
   * Validate Telegram Web App init data
   */
  validateTelegramWebAppData(initData: string): any {
    console.log('🔐 Validating Telegram Web App data:', initData);

    const botToken = this.configService.get('TELEGRAM_BOT_TOKEN');

    if (!botToken) {
      console.error('❌ Bot token not configured');
      throw new UnauthorizedException('Bot token not configured');
    }

    try {
      const urlParams = new URLSearchParams(initData);
      const hash = urlParams.get('hash');
      urlParams.delete('hash');

      // Keep signature for validation (part of data-check-string according to some docs)
      // signature is required for Telegram Web App validation

      console.log('🔍 Hash from initData:', hash);
      console.log('🔍 Params after hash and signature removal:', Array.from(urlParams.entries()));

      // Sort params and create data-check-string (URLSearchParams already decodes)
      const dataCheckArray: string[] = [];
      for (const [key, value] of Array.from(urlParams.entries()).sort()) {
        dataCheckArray.push(`${key}=${value}`);
      }
      const dataCheckString = dataCheckArray.join('\n');

      console.log('🔍 Original URL params:', Array.from(urlParams.entries()));
      console.log('🔍 Sorted params for data check:', dataCheckArray);

      console.log('🔍 Data check string:', dataCheckString);

      // Calculate secret key and hash (correct Telegram Web App validation)
      // Algorithm: secret = HMAC-SHA256(bot_token, 'WebAppData'), then HMAC-SHA256(secret, data)
      const secretKey = crypto.createHmac('sha256', botToken).update('WebAppData').digest();
      console.log('🔑 Secret key calculated (first 10 chars):', secretKey.toString('hex').substring(0, 10));

      const calculatedHash = crypto
        .createHmac('sha256', secretKey)
        .update(dataCheckString)
        .digest('hex');

      console.log('🔍 Bot token (first 10 chars):', botToken.substring(0, 10));
      console.log('🔑 Secret key (first 10 chars):', secretKey.toString('hex').substring(0, 10));

      console.log('🔍 Calculated hash:', calculatedHash);
      console.log('🔍 Original hash:', hash);
      console.log('✅ Hash match:', calculatedHash === hash);

      if (calculatedHash !== hash) {
        console.error('❌ Hash validation failed');
        throw new UnauthorizedException('Invalid hash');
      }

      console.log('✅ Hash validation successful');

      // Parse user data
      const userParam = urlParams.get('user');
      if (!userParam) {
        console.error('❌ User data not found in initData');
        throw new UnauthorizedException('User data not found');
      }

      console.log('🔍 User data from initData:', userParam);
      const userData = JSON.parse(userParam);
      console.log('✅ User data parsed successfully:', userData);

      return userData;
    } catch (error) {
      throw new UnauthorizedException('Invalid Telegram data');
    }
  }

  /**
   * Login as admin
   */
  async loginAdmin(initData: string) {
    console.log('🚪 Admin login attempt with initData:', initData);

    const userData = this.validateTelegramWebAppData(initData);
    console.log('👤 User data from validation:', userData);

    const admin = await this.adminRepo.findOne({
      where: { tg_id: userData.id.toString() },
    });

    console.log('👮 Admin found in database:', admin ? { id: admin.id, tg_id: admin.tg_id, role: admin.role } : null);

    if (!admin) {
      console.error('❌ Admin not found in database for tg_id:', userData.id);
      throw new UnauthorizedException('Not authorized as admin');
    }

    // Update admin info
    admin.username = userData.username || admin.username;
    admin.first_name = userData.first_name || admin.first_name;
    await this.adminRepo.save(admin);

    const payload = {
      sub: admin.id,
      tg_id: admin.tg_id,
      role: admin.role,
      type: 'admin',
    };

    const result = {
      access_token: this.jwtService.sign(payload),
      admin: {
        id: admin.id,
        tg_id: admin.tg_id,
        username: admin.username,
        first_name: admin.first_name,
        role: admin.role,
      },
    };

    console.log('✅ Admin login successful:', { tg_id: admin.tg_id, role: admin.role });
    console.log('🎫 JWT token generated successfully');

    return result;
  }


  /**
   * Login or register user
   */
  async loginUser(initData: string) {
    const userData = this.validateTelegramWebAppData(initData);

    let user = await this.userRepo.findOne({
      where: { tg_id: userData.id.toString() },
    });

    if (!user) {
      // Register new user
      user = this.userRepo.create({
        tg_id: userData.id.toString(),
        username: userData.username,
        first_name: userData.first_name,
        last_name: userData.last_name,
        status: 'active',
      });
      await this.userRepo.save(user);
    } else {
      // Update user info
      user.username = userData.username || user.username;
      user.first_name = userData.first_name || user.first_name;
      user.last_name = userData.last_name || user.last_name;
      await this.userRepo.save(user);
    }

    const payload = {
      sub: user.id,
      tg_id: user.tg_id,
      type: 'user',
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        tg_id: user.tg_id,
        username: user.username,
        first_name: user.first_name,
        balance_usdt: user.balance_usdt,
        tasks_completed: user.tasks_completed,
      },
    };
  }

  /**
   * Validate JWT token and get admin
   */
  async validateAdmin(tg_id: string) {
    const admin = await this.adminRepo.findOne({ where: { tg_id } });
    if (!admin) {
      throw new UnauthorizedException('Admin not found');
    }
    return admin;
  }

  /**
   * Validate JWT token and get user
   */
  async validateUser(tg_id: string) {
    const user = await this.userRepo.findOne({ where: { tg_id } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return user;
  }

  /**
   * Development login - bypass Telegram authentication for development
   */
  async devLogin(adminId: number) {
    console.log('🚪 Development login attempt for admin ID:', adminId);

    const admin = await this.adminRepo.findOne({
      where: { tg_id: adminId.toString() },
    });

    if (!admin) {
      console.error('❌ Admin not found in database for tg_id:', adminId);
      throw new UnauthorizedException('Admin not found');
    }

    const payload = {
      sub: admin.id,
      tg_id: admin.tg_id,
      role: admin.role,
      type: 'admin',
    };

    const result = {
      access_token: this.jwtService.sign(payload),
      admin: {
        id: admin.id,
        tg_id: admin.tg_id,
        username: admin.username,
        first_name: admin.first_name,
        role: admin.role,
      },
    };

    console.log('✅ Development login successful:', { tg_id: admin.tg_id, role: admin.role });
    console.log('🎫 JWT token generated successfully');

    return result;
  }
}

