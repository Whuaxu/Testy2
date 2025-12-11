import { UserService } from "@loopback/authentication";
import { User } from "../models";
import { Credentials, UserRepository } from "../repositories/user.repository";
import { securityId, UserProfile } from "@loopback/security";
import { repository } from "@loopback/repository";
import { HttpErrors } from "@loopback/rest";
import { inject } from "@loopback/core";
import { BcryptHasher } from "./hashPass.bcrypt";
import { PasswordHasherBindings } from "../keys";
import { hash } from "bcryptjs";

export class myUserService implements UserService<User, Credentials> {

    constructor(
        @repository(UserRepository)
        public userRepository: UserRepository,
        @inject(PasswordHasherBindings.PASSWORD_HASHER)
        public hasher: BcryptHasher,
    ){}

    async verifyCredentials(credentials: Credentials): Promise<User> {
        
        const foundUser = await this.userRepository.findByEmail(credentials.email);

        if(!foundUser){
            throw new HttpErrors.NotFound(`User not found with this ${credentials.email}`);
        }

        const passwordMatched = await this.hasher.comparePassword(credentials.password, foundUser.password);
        
        if(!passwordMatched){
            throw new HttpErrors.Unauthorized('Password is not valid');
        }

        return foundUser;
    }

    convertToUserProfile(user: User): UserProfile {
        
        return {
            [securityId]: user.id!,
            id: user.id,
            email: user.email,
            username: user.username,
        };
    }

    async createUser(userData: Partial<User>): Promise<User> {

        const existingUser = await this.userRepository.findByEmail(userData.email!);
        if (existingUser) {
            throw new HttpErrors.Conflict('User with this email already exists');
        }

        const user = await this.userRepository.create({
        ...userData,
        createdAt: new Date(),
        updatedAt: new Date(),
        });

        return user;
  }
}