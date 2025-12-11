import {inject, Getter} from '@loopback/core';
import {DefaultCrudRepository, repository, HasManyRepositoryFactory} from '@loopback/repository';
import {MongoDataSource} from '../datasources';
import {User, UserRelations, Message} from '../models';
import {MessageRepository} from './message.repository';


export type Credentials = {
  email: string;
  password: string;
};

export class UserRepository extends DefaultCrudRepository<
  User,
  typeof User.prototype.id,
  UserRelations
> {
  public readonly sentMessages: HasManyRepositoryFactory<
    Message,
    typeof User.prototype.id
  >;

  constructor(
    @inject('datasources.mongo') dataSource: MongoDataSource,
    @repository.getter('MessageRepository')
    protected messageRepositoryGetter: Getter<MessageRepository>,
  ) {
    super(User, dataSource);
    this.sentMessages = this.createHasManyRepositoryFactoryFor(
      'sentMessages',
      messageRepositoryGetter,
    );
    this.registerInclusionResolver(
      'sentMessages',
      this.sentMessages.inclusionResolver,
    );
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.findOne({where: {email}});
  }
}
