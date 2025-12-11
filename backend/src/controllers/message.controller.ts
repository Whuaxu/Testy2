import {
  repository,
} from '@loopback/repository';
import {
  post,
  param,
  get,
  getModelSchemaRef,
  requestBody,
  response,
} from '@loopback/rest';
import {inject} from '@loopback/core';
import {authenticate} from '@loopback/authentication';
import {SecurityBindings, securityId, UserProfile} from '@loopback/security';
import {Message} from '../models';
import {MessageRepository, ConversationRepository} from '../repositories';

export class MessageController {
  constructor(
    @repository(MessageRepository)
    public messageRepository: MessageRepository,
    @repository(ConversationRepository)
    public conversationRepository: ConversationRepository,
  ) {}

  @authenticate('jwt')
  @post('/messages')
  @response(200, {
    description: 'Message model instance',
    content: {'application/json': {schema: getModelSchemaRef(Message)}},
  })
  async create(
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['conversationId', 'senderId', 'content'],
            properties: {
              conversationId: {type: 'string'},
              senderId: {type: 'string'},
              content: {type: 'string'},
            },
          },
        },
      },
    })
    messageData: {conversationId: string; content: string},
  ): Promise<Message> {
    const senderId = currentUserProfile[securityId];

    // Verify conversation exists and user is a participant
    const conversation = await this.conversationRepository.findById(
      messageData.conversationId,
    );
    if (!conversation.participantIds.includes(senderId)) {
      throw new Error('Not authorized to send messages to this conversation');
    }

    // Create message
    const message = await this.messageRepository.create({
      ...messageData,
      createdAt: new Date(),
      read: false,
    });

    // Update conversation's last message and timestamp
    await this.conversationRepository.updateById(messageData.conversationId, {
      lastMessageId: message.id,
      updatedAt: new Date(),
    });

    return message;
  }

  @authenticate('jwt')
  @get('/messages/{id}')
  @response(200, {
    description: 'Message model instance',
    content: {
      'application/json': {
        schema: getModelSchemaRef(Message, {includeRelations: true}),
      },
    },
  })
  async findById(
    @param.path.string('id') id: string,
  ): Promise<Message> {
    return this.messageRepository.findById(id, {
      include: [{relation: 'sender'}],
    });
  }

  @authenticate('jwt')
  @post('/messages/{id}/read')
  @response(204, {
    description: 'Mark message as read',
  })
  async markAsRead(
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
    @param.path.string('id') id: string,
  ): Promise<void> {
    await this.messageRepository.updateById(id, {read: true});
  }
}
