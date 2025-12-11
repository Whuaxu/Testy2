import { inject } from '@loopback/core';
import { HttpErrors } from '@loopback/rest';
import { securityId, UserProfile } from '@loopback/security';
import { promisify } from 'util'
import { TokenServiceBindings } from '../keys';

const jwt = require('jsonwebtoken');
const signAsync = promisify(jwt.sign);
const verifyAsync = promisify(jwt.verify);

export class JWTService {

    @inject(TokenServiceBindings.TOKEN_SECRET)
    public readonly jwtSecret: string;

    @inject(TokenServiceBindings.TOKEN_EXPIRES_IN)
    public readonly jwtExpiresIn: string;
    
    async generateToken(userProfile: UserProfile): Promise<string> {
        
        if (!userProfile) {
            throw new HttpErrors.Unauthorized('Error generating token : userProfile is null');
        }

        let token = '';
        try {
            token = await signAsync(userProfile, this.jwtSecret, {
                expiresIn: this.jwtExpiresIn
            });
        }catch(err){
            throw new HttpErrors.Unauthorized(`Error generating token : ${err}`);
        }

        return token;
    }

    async verifyToken(token: string): Promise<UserProfile> {
        
        if(!token){
            throw new HttpErrors.Unauthorized('Error verifying token : token is null');
        }

        let userProfile: UserProfile;
        
        try{
            const decryptedToken = await verifyAsync(token, this.jwtSecret);

            userProfile = {
                [securityId]: decryptedToken[securityId] || decryptedToken.id,
                id: decryptedToken.id,
                email: decryptedToken.email,
                username: decryptedToken.username,
            };
            
        }catch(err){
            throw new HttpErrors.Unauthorized(`Error verifying token : ${err}`);
        }

        return userProfile;
    }
}