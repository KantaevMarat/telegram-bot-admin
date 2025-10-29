import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { Admin } from '../../entities/admin.entity';
import { User } from '../../entities/user.entity';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

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
    this.logger.debug('Validating Telegram Web App data');

    const botToken = this.configService.get('TELEGRAM_BOT_TOKEN');

    if (!botToken) {
      this.logger.error('Bot token not configured');
      throw new UnauthorizedException('Bot token not configured');
    }

    try {
      const urlParams = new URLSearchParams(initData);
      const hash = urlParams.get('hash');
      urlParams.delete('hash');

      // Keep signature for validation (part of data-check-string according to some docs)
      // signature is required for Telegram Web App validation

      this.logger.debug(`Hash from initData: ${hash?.substring(0, 10)}...`);
      this.logger.debug(`Params count: ${urlParams.size}`);

      // Sort params and create data-check-string (URLSearchParams already decodes)
      const dataCheckArray: string[] = [];
      for (const [key, value] of Array.from(urlParams.entries()).sort()) {
        dataCheckArray.push(`${key}=${value}`);
      }
      const dataCheckString = dataCheckArray.join('\n');

      this.logger.debug(`Sorted params count: ${dataCheckArray.length}`);

      // Calculate secret key and hash (correct Telegram Web App validation)
      // Algorithm: secret = HMAC-SHA256(bot_token, 'WebAppData'), then HMAC-SHA256(secret, data)
      const secretKey = crypto.createHmac('sha256', botToken).update('WebAppData').digest();
      this.logger.debug('Secret key calculated');

      const calculatedHash = crypto
        .createHmac('sha256', secretKey)
        .update(dataCheckString)
        .digest('hex');

      const hashMatch = calculatedHash === hash;
      this.logger.debug(`Hash validation: ${hashMatch ? 'success' : 'failed'}`);

      if (!hashMatch) {
        this.logger.warn('Hash validation failed');
        throw new UnauthorizedException('Invalid hash');
      }

      // Parse user data
      const userParam = urlParams.get('user');
      if (!userParam) {
        this.logger.error('User data not found in initData');
        throw new UnauthorizedException('User data not found');
      }

      this.logger.debug('Parsing user data');
      const userData = JSON.parse(userParam);
      this.logger.debug(`User data parsed: ID ${userData.id}`);

      return userData;
    } catch (error) {
      throw new UnauthorizedException('Invalid Telegram data');
    }
  }

  /**
   * Login as admin
   */
  async loginAdmin(initData: string) {
    this.logger.log('Admin login attempt');

    const userData = this.validateTelegramWebAppData(initData);
    this.logger.debug(`User data validated: ID ${userData.id}`);

    const admin = await this.adminRepo.findOne({
      where: { tg_id: userData.id.toString() },
    });

    if (!admin) {
      this.logger.warn(`Admin not found for TG ID: ${userData.id}`);
      throw new UnauthorizedException('Not authorized as admin');
    }

    this.logger.debug(`Admin found: ${admin.username || admin.tg_id}, role: ${admin.role}`);

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

    this.logger.log(`Admin login successful: ${admin.username || admin.tg_id}`);

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
    this.logger.log(`Development login attempt for admin ID: ${adminId}`);
    this.logger.log(`Searching for admin with tg_id: "${adminId.toString()}"`);

    // Get all admins to debug
    const allAdmins = await this.adminRepo.find();
    this.logger.log(`Total admins in DB: ${allAdmins.length}`);
    allAdmins.forEach(a => this.logger.log(`  - Admin: tg_id="${a.tg_id}", role=${a.role}`));

    const admin = await this.adminRepo.findOne({
      where: { tg_id: adminId.toString() },
    });

    if (!admin) {
      this.logger.warn(`Admin not found for TG ID: ${adminId}`);
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

    this.logger.log(`Development login successful: ${admin.tg_id}`);

    return result;
  }

  /**
   * DEBUG: Test admin lookup to see what's in the database
   */
  async debugAdminLookup() {
    const allAdmins = await this.adminRepo.find();
    const searchTgId = '697184435';
    
    const foundByString = await this.adminRepo.findOne({
      where: { tg_id: searchTgId },
    });

    return {
      totalAdmins: allAdmins.length,
      searchingFor: searchTgId,
      searchingForType: typeof searchTgId,
      foundByString: foundByString ? 'YES' : 'NO',
      allAdminsInDb: allAdmins.map(a => ({
        id: a.id,
        tg_id: a.tg_id,
        tg_id_type: typeof a.tg_id,
        role: a.role,
        username: a.username,
        matchesSearch: a.tg_id === searchTgId,
        toStringMatches: a.tg_id.toString() === searchTgId,
      })),
    };
  }
}
