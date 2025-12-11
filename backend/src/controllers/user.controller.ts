import {
  Count,
  CountSchema,
  Filter,
  FilterExcludingWhere,
  repository,
  Where,
} from '@loopback/repository';
import {
  post,
  param,
  get,
  getModelSchemaRef,
  patch,
  put,
  del,
  requestBody,
  response,
} from '@loopback/rest';
import { User } from '../models';
import { Credentials, UserRepository } from '../repositories';
import { validateCredentials } from '../services/validator';
import * as lodash from 'lodash';
import { inject } from '@loopback/core';
import { CredentialsRequestBody, UserRegistrationSchema } from './specs/user.controller.spec';
import { BcryptHasher } from '../services/hashPass.bcrypt';
import { myUserService } from '../services/user.service';
import { JWTService } from '../services/jwt.service';
import { PasswordHasherBindings, TokenServiceBindings, UserServiceBindings } from '../keys';
import { securityId, UserProfile } from '@loopback/security';
import { authenticate, AuthenticationBindings } from '@loopback/authentication';

export class UserController {
  constructor(
    @repository(UserRepository)
    public userRepository: UserRepository,

    @inject(PasswordHasherBindings.PASSWORD_HASHER)
    public hasher: BcryptHasher,

    @inject(UserServiceBindings.USER_SERVICE)
    public userService: myUserService,

    @inject(TokenServiceBindings.TOKEN_SERVICE)
    public jwtService: JWTService,
  ) { }

  @post('/users')
  @response(200, {
    description: 'User model instance',
    content: { 'application/json': { schema: getModelSchemaRef(User) } },
  })
  async create(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(User, {
            title: 'NewUser',
            exclude: ['id'],
          }),
        },
      },
    })
    user: Omit<User, 'id'>,
  ): Promise<User> {
    return this.userRepository.create(user);
  }

  @get('/users/count')
  @response(200, {
    description: 'User model count',
    content: { 'application/json': { schema: CountSchema } },
  })
  async count(
    @param.where(User) where?: Where<User>,
  ): Promise<Count> {
    return this.userRepository.count(where);
  }

  @get('/users')
  @response(200, {
    description: 'Array of User model instances',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: getModelSchemaRef(User, { includeRelations: true }),
        },
      },
    },
  })
  async find(
    @param.filter(User) filter?: Filter<User>,
  ): Promise<User[]> {
    return this.userRepository.find(filter);
  }

  @patch('/users')
  @response(200, {
    description: 'User PATCH success count',
    content: { 'application/json': { schema: CountSchema } },
  })
  async updateAll(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(User, { partial: true }),
        },
      },
    })
    user: User,
    @param.where(User) where?: Where<User>,
  ): Promise<Count> {
    return this.userRepository.updateAll(user, where);
  }

  @get('/users/{id}')
  @response(200, {
    description: 'User model instance',
    content: {
      'application/json': {
        schema: getModelSchemaRef(User, { includeRelations: true }),
      },
    },
  })
  async findById(
    @param.path.string('id') id: string,
    @param.filter(User, { exclude: 'where' }) filter?: FilterExcludingWhere<User>
  ): Promise<User> {
    return this.userRepository.findById(id, filter);
  }

  @patch('/users/{id}')
  @response(204, {
    description: 'User PATCH success',
  })
  async updateById(
    @param.path.string('id') id: string,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(User, { partial: true }),
        },
      },
    })
    user: User,
  ): Promise<void> {
    await this.userRepository.updateById(id, user);
  }

  @put('/users/{id}')
  @response(204, {
    description: 'User PUT success',
  })
  async replaceById(
    @param.path.string('id') id: string,
    @requestBody() user: User,
  ): Promise<void> {
    await this.userRepository.replaceById(id, user);
  }

  @del('/users/{id}')
  @response(204, {
    description: 'User DELETE success',
  })
  async deleteById(@param.path.string('id') id: string): Promise<void> {
    await this.userRepository.deleteById(id);
  }

  @post('/users/register')
  @response(200, {
    description: 'Register a new user',
    content: { 'application/json': { schema: getModelSchemaRef(User) } },
  })

  async register(@requestBody({
    content: {
      'application/json': {
        schema: UserRegistrationSchema,
      },
    },
  }) userData: { email: string; password: string; username: string },
  ): Promise<{ token: string; user: Omit<User, 'password'> }> {
    validateCredentials(lodash.pick(userData, ['email', 'password']));

    const hashedPassword = await this.hasher.hashPassword(userData.password);

    const user = await this.userService.createUser({
      ...userData,
      password: hashedPassword,
    });
    const userProfile = this.userService.convertToUserProfile(user);
    const token = await this.jwtService.generateToken(userProfile);

    const { password, ...userWithoutPassword } = user;

    return {
      token,
      user: userWithoutPassword as Omit<User, 'password'>
    };

  }


  @post('/users/login')
  @response(200, {
    description: 'Token for user login',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            token: {
              type: 'string',
            },
          },
        },
      },
    },
  })
  async login(
    @requestBody(CredentialsRequestBody) credentials: Credentials
  ): Promise<{ token: string; user: Omit<User, 'password'> }> {

    const user = await this.userService.verifyCredentials(credentials);

    const userProfile = this.userService.convertToUserProfile(user);

    const token = await this.jwtService.generateToken(userProfile);

    const { password, ...userWithoutPassword } = user;

    return {
      token,
      user: userWithoutPassword as Omit<User, 'password'>
    };
  }

  @authenticate('jwt')
  @get('/users/me')
  @response(200, {
    description: 'Current user profile',
    content: {
      'application/json': {
        schema: getModelSchemaRef(User, { exclude: ['password'] }),
      },
    },
  })
  async me(
    @inject(AuthenticationBindings.CURRENT_USER)
    currentUser: UserProfile,
  ): Promise<UserProfile> {
    return Promise.resolve(currentUser);
  }

  @authenticate('jwt')
  @get('/users/search')
  @response(200, {
    description: 'Search users by username or email',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: getModelSchemaRef(User, {exclude: ['password']}),
        },
      },
    },
  })
  async search(
    @inject(AuthenticationBindings.CURRENT_USER) currentUserProfile: UserProfile,
    @param.query.string('q') query: string,
  ): Promise<Omit<User, 'password'>[]> {
    const currentUserId = currentUserProfile[securityId];
    
    if (!query || query.trim().length === 0) {
      return [];
    }

    const searchTerm = query.trim();
    // Escape special regex characters for safe use in regexp
    const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regexPattern = new RegExp(escapedTerm, 'i');
    
    // Use database-level filtering with regexp for better scalability
    const matchingUsers = await this.userRepository.find({
      where: {
        and: [
          {id: {neq: currentUserId}},
          {
            or: [
              {username: {regexp: regexPattern}},
              {email: {regexp: regexPattern}},
            ],
          },
        ],
      },
    });

    return matchingUsers.map(user => {
      const {password, ...userWithoutPassword} = user;
      return userWithoutPassword as Omit<User, 'password'>;
    });
  }
}
