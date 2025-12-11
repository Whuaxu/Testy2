import { BindingKey } from '@loopback/core';
import { TokenService, UserService } from '@loopback/authentication';
import { PasswordHasher } from './services/hashPass.bcrypt';
import { Credentials } from './repositories';
import { User } from './models';

export namespace TokenServiceConstants {
    export const TOKEN_SECRET_VALUE = 'myjwtsecret';
    export const TOKEN_EXPIRES_IN_VALUE = '2h';
}

export namespace TokenServiceBindings {

    export const TOKEN_SECRET = BindingKey.create<string>('authentication.jwt.secret');

    export const TOKEN_EXPIRES_IN = BindingKey.create<string>('authentication.jwt.expiresIn');

    export const TOKEN_SERVICE = BindingKey.create<TokenService>('services.jwt.service');

}

export namespace PasswordHasherBindings {

    export const PASSWORD_HASHER = BindingKey.create<PasswordHasher>('services.hasher');

    export const ROUNDS = BindingKey.create<number>('rounds');

}

export namespace UserServiceBindings {
    
    export const USER_SERVICE = BindingKey.create<UserService<Credentials, User>>('services.userService');

}