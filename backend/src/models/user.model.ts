import {Entity, model, property, hasMany} from '@loopback/repository';
import {Message} from './message.model';

@model()
export class User extends Entity {
  @property({
    type: 'string',
    id: true,
    generated: true,
    mongodb: {dataType: 'ObjectId'},
  })
  id?: string;

  @property({
    type: 'string',
    required: true,
    index: {unique: true},
  })
  email: string;

  @property({
    type: 'string',
    required: true,
  })
  username: string;

  @property({
    type: 'string',
    required: true,
  })
  password: string;

  @property({
    type: 'date',
    default: () => new Date(),
  })
  createdAt?: Date;

  @property({
    type: 'date',
    default: () => new Date(),
  })
  updatedAt?: Date;

  @hasMany(() => Message, {keyTo: 'senderId'})
  sentMessages?: Message[];

  constructor(data?: Partial<User>) {
    super(data);
  }
}

export interface UserRelations {
  sentMessages?: Message[];
}

export type UserWithRelations = User & UserRelations;
