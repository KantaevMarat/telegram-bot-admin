import { IsString, IsOptional, IsIn } from 'class-validator';

export class UpdateAdminDto {
  @IsOptional()
  @IsIn(['admin', 'superadmin'], {
    message: 'role must be either admin or superadmin',
  })
  role?: 'admin' | 'superadmin';

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  first_name?: string;
}
