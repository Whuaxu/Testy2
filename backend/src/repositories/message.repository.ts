import {inject, Getter} from '@loopback/core';
import {DefaultCrudRepository, repository, BelongsToAccessor} from '@loopback/repository';
import {MongoDataSource} from '../datasources';
import {Message, MessageRelations, User, Conversation} from '../models';
import {UserRepository} from './user.repository';
import {ConversationRepository} from './conversation.repository';

export class MessageRepository extends DefaultCrudRepository<
  Message,
  typeof Message.prototype.id,
  MessageRelations
> {
  public readonly sender: BelongsToAccessor<User, typeof Message.prototype.id>;
  public readonly conversation: BelongsToAccessor<
    Conversation,
    typeof Message.prototype.id
  >;

  constructor(
    @inject('datasources.mongo') dataSource: MongoDataSource,
    @repository.getter('UserRepository')
    protected userRepositoryGetter: Getter<UserRepository>,
    @repository.getter('ConversationRepository')
    protected conversationRepositoryGetter: Getter<ConversationRepository>,
  ) {
    super(Message, dataSource);
    this.sender = this.createBelongsToAccessorFor('sender', userRepositoryGetter);
    this.registerInclusionResolver('sender', this.sender.inclusionResolver);
    this.conversation = this.createBelongsToAccessorFor(
      'conversation',
      conversationRepositoryGetter,
    );
    this.registerInclusionResolver(
      'conversation',
      this.conversation.inclusionResolver,
    );
  }

  async findByConversation(conversationId: string): Promise<Message[]> {
    return this.find({
      where: {conversationId},
      order: ['createdAt ASC'],
      include: [{relation: 'sender'}],
    });
  }
}
