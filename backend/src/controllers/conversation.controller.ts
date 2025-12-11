import {
  Count,
  CountSchema,
  Filter,
  repository,
  Where,
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
import {Conversation, Message} from '../models';
import {ConversationRepository, MessageRepository, UserRepository} from '../repositories';

export class ConversationController {
  constructor(
    @repository(ConversationRepository)
    public conversationRepository: ConversationRepository,
    @repository(MessageRepository)
    public messageRepository: MessageRepository,
    @repository(UserRepository)
    public userRepository: UserRepository,
  ) {}

  @authenticate('jwt')
  @post('/conversations')
  @response(200, {
    description: 'Conversation model instance with participants',
    content: {
      'application/json': {
        schema: getModelSchemaRef(Conversation, {includeRelations: true}),
      },
    },
  })
  async create(
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['participantId'],
            properties: {
              participantId: {type: 'string'},
              name: {type: 'string'},
            },
          },
        },
      },
    })
    data: {participantId: string; name?: string},
  ): Promise<object> {
    const currentUserId = currentUserProfile[securityId];
    const participantIds = [currentUserId, data.participantId];

    // Find or create conversation
    const conversation = await this.conversationRepository.findOrCreateConversation(participantIds);
    
    if (data.name) {
      await this.conversationRepository.updateById(conversation.id, {name: data.name});
      conversation.name = data.name;
    }

    // Return enriched conversation with participant details
    const participants = await Promise.all(
      conversation.participantIds.map(async id => {
        const user = await this.userRepository.findById(id);
        const {password, ...userWithoutPassword} = user;
        return userWithoutPassword;
      }),
    );

    return {
      id: conversation.id,
      participantIds: conversation.participantIds,
      name: conversation.name,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      lastMessageId: conversation.lastMessageId,
      participants,
    };
  }

  @authenticate('jwt')
  @get('/conversations')
  @response(200, {
    description: 'Array of Conversation model instances',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: getModelSchemaRef(Conversation, {includeRelations: true}),
        },
      },
    },
  })
  async find(
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
  ): Promise<object[]> {
    const currentUserId = currentUserProfile[securityId];
    const conversations = await this.conversationRepository.findByParticipant(currentUserId);

    // Enrich conversations with participant details and last message
    const enrichedConversations = await Promise.all(
      conversations.map(async conv => {
        const participants = await Promise.all(
          conv.participantIds.map(async id => {
            const user = await this.userRepository.findById(id);
            const {password, ...userWithoutPassword} = user;
            return userWithoutPassword;
          }),
        );

        let lastMessage: Message | undefined;
        if (conv.lastMessageId) {
          try {
            lastMessage = await this.messageRepository.findById(conv.lastMessageId);
          } catch (e) {
            // Message might have been deleted
          }
        }

        return {
          id: conv.id,
          participantIds: conv.participantIds,
          name: conv.name,
          createdAt: conv.createdAt,
          updatedAt: conv.updatedAt,
          lastMessageId: conv.lastMessageId,
          participants,
          lastMessage,
        };
      }),
    );

    return enrichedConversations;
  }

  @authenticate('jwt')
  @get('/conversations/{id}')
  @response(200, {
    description: 'Conversation model instance',
    content: {
      'application/json': {
        schema: getModelSchemaRef(Conversation, {includeRelations: true}),
      },
    },
  })
  async findById(
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
    @param.path.string('id') id: string,
  ): Promise<object> {
    const conversation = await this.conversationRepository.findById(id);
    
    // Get participant details
    const participants = await Promise.all(
      conversation.participantIds.map(async participantId => {
        const user = await this.userRepository.findById(participantId);
        const {password, ...userWithoutPassword} = user;
        return userWithoutPassword;
      }),
    );

    return {
      id: conversation.id,
      participantIds: conversation.participantIds,
      name: conversation.name,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      lastMessageId: conversation.lastMessageId,
      participants,
    };
  }

  @authenticate('jwt')
  @get('/conversations/{id}/messages')
  @response(200, {
    description: 'Array of Message model instances for a conversation',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: getModelSchemaRef(Message, {includeRelations: true}),
        },
      },
    },
  })
  async getMessages(
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
    @param.path.string('id') id: string,
    @param.query.number('limit') limit?: number,
    @param.query.number('skip') skip?: number,
  ): Promise<Message[]> {
    // Verify conversation exists and user is a participant
    const conversation = await this.conversationRepository.findById(id);
    const currentUserId = currentUserProfile[securityId];
    
    if (!conversation.participantIds.includes(currentUserId)) {
      throw new Error('Not authorized to view this conversation');
    }

    const messages = await this.messageRepository.find({
      where: {conversationId: id},
      order: ['createdAt ASC'],
      include: [{relation: 'sender'}],
      limit: limit || 50,
      skip: skip || 0,
    });

    return messages;
  }
}
