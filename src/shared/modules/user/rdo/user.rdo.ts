import { Expose } from 'class-transformer';
import { UserType } from '../../../types/index.js';

export class UserRDO {
  @Expose()
  public id!: string;

  @Expose()
  public name!: string;

  @Expose()
  public email!: string ;

  @Expose()
  public avatar!: string;

  @Expose()
  public type!: UserType;
}
