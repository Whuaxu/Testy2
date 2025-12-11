import { AuthenticationStrategy } from "@loopback/authentication";
import { UserProfile } from "@loopback/security";
import { JWTService } from "../services/jwt.service";
import { TokenServiceBindings } from "../keys";
import { inject } from "@loopback/core";
import { HttpErrors, Request} from "@loopback/rest";

export class JWTStrategy implements AuthenticationStrategy {

    name: string = 'jwt';
    constructor(

        @inject(TokenServiceBindings.TOKEN_SERVICE)
        public jwtService: JWTService,
    ) {}

    async authenticate(request: Request): Promise<UserProfile | undefined> {
        
        const token: string = this.extractCredentials(request);
        const userProfile: UserProfile = await this.jwtService.verifyToken(token);
        return Promise.resolve(userProfile);
    }

    extractCredentials(request: Request): string {
        if (!request.headers.authorization) {
            throw new HttpErrors.Unauthorized(`Authorization header not found.`);
        }

        const authHeaderValue = request.headers.authorization;

        if (!authHeaderValue.startsWith('Bearer')) {
            throw new HttpErrors.Unauthorized(`Authorization header is not of type 'Bearer'.`);
        }

        const parts = authHeaderValue.split(' ');
        if (parts.length !== 2){
            throw new HttpErrors.Unauthorized(`Authorization header value has too many parts. It must follow the pattern: 'Bearer xx.yy.zz' where xx.yy.zz is a JWT token.`);
        }
        
        const token = parts[1];

        return token;
    }

}