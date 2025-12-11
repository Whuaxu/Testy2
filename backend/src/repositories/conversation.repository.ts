import {inject, Getter} from '@loopback/core';
import {DefaultCrudRepository, repository, HasManyRepositoryFactory, Where} from '@loopback/repository';
import {MongoDataSource} from '../datasources';
import {Conversation, ConversationRelations, Message} from '../models';
import {MessageRepository} from './message.repository';

export class ConversationRepository extends DefaultCrudRepository<
  Conversation,
  typeof Conversation.prototype.id,
  ConversationRelations
> {
  public readonly messages: HasManyRepositoryFactory<
    Message,
    typeof Conversation.prototype.id
  >;

  constructor(
    @inject('datasources.mongo') dataSource: MongoDataSource,
    @repository.getter('MessageRepository')
    protected messageRepositoryGetter: Getter<MessageRepository>,
  ) {
    super(Conversation, dataSource);
    this.messages = this.createHasManyRepositoryFactoryFor(
      'messages',
      messageRepositoryGetter,
    );
    this.registerInclusionResolver('messages', this.messages.inclusionResolver);
  }

  async findByParticipant(userId: string): Promise<Conversation[]> {
    // Use MongoDB native query for array contains
    const filter = {
      order: ['updatedAt DESC'],
    };
    const conversations = await this.find(filter);
    // Filter in memory for array contains
    return conversations.filter(conv => conv.participantIds.includes(userId));
  }

  async findOrCreateConversation(
    participantIds: string[],
  ): Promise<Conversation> {
    // Sort participant IDs to ensure consistent lookup
    const sortedIds = [...participantIds].sort();
    
    // Find all conversations and check for matching participants
    const conversations = await this.find();
    const existing = conversations.find(conv => {
      const sortedConvIds = [...conv.participantIds].sort();
      return sortedConvIds.length === sortedIds.length && 
             sortedConvIds.every((id, idx) => id === sortedIds[idx]);
    });

    if (existing) {
      return existing;
    }

    // Create new conversation
    return this.create({
      participantIds: sortedIds,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
}
