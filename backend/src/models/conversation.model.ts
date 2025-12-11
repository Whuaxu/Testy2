import {Entity, model, property, hasMany} from '@loopback/repository';
import {Message} from './message.model';

@model({
  settings: {
    strictObjectIDCoercion: true,
  },
})
export class Conversation extends Entity {
  @property({
    type: 'string',
    id: true,
    generated: true,
    mongodb: {dataType: 'ObjectId'},
  })
  id?: string;

  @property({
    type: 'array',
    itemType: 'string',
    required: true,
  })
  participantIds: string[];

  @property({
    type: 'string',
  })
  name?: string;

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

  @property({
    type: 'string',
  })
  lastMessageId?: string;

  @hasMany(() => Message, {keyTo: 'conversationId'})
  messages?: Message[];

  constructor(data?: Partial<Conversation>) {
    super(data);
  }
}

export interface ConversationRelations {
  messages?: Message[];
}

export type ConversationWithRelations = Conversation & ConversationRelations;
