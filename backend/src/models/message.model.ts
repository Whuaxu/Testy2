import {Entity, model, property, belongsTo} from '@loopback/repository';
import {User} from './user.model';
import {Conversation} from './conversation.model';

@model({
  settings: {
    strictObjectIDCoercion: true,
  },
})
export class Message extends Entity {
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
  })
  content: string;

  @belongsTo(() => User, {name: 'sender'})
  senderId: string;

  @belongsTo(() => Conversation)
  conversationId: string;

  @property({
    type: 'date',
    default: () => new Date(),
  })
  createdAt?: Date;

  @property({
    type: 'boolean',
    default: false,
  })
  read?: boolean;

  constructor(data?: Partial<Message>) {
    super(data);
  }
}

export interface MessageRelations {
  sender?: User;
  conversation?: Conversation;
}

export type MessageWithRelations = Message & MessageRelations;
