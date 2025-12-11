import {BootMixin} from '@loopback/boot';
import {ApplicationConfig} from '@loopback/core';
import {
  RestExplorerBindings,
  RestExplorerComponent,
} from '@loopback/rest-explorer';
import {RepositoryMixin} from '@loopback/repository';
import {RestApplication} from '@loopback/rest';
import {ServiceMixin} from '@loopback/service-proxy';
import path from 'path';
import {MySequence} from './sequence';
import { BcryptHasher } from './services/hashPass.bcrypt';
import { myUserService } from './services/user.service';
import { JWTService } from './services/jwt.service';
import { PasswordHasherBindings, TokenServiceBindings, TokenServiceConstants, UserServiceBindings } from './keys';
import { AuthenticationComponent, registerAuthenticationStrategy } from '@loopback/authentication';
import { JWTStrategy } from './auth-strategies/jwt.strategy';
import { Server } from 'socket.io';

export {ApplicationConfig};

export class ChatApplication extends BootMixin(
  ServiceMixin(RepositoryMixin(RestApplication)),
) {

  public io: Server;

  constructor(options: ApplicationConfig = {}) {
    super(options);

    // Set up bindings
    this.setupBindings();

    this.component(AuthenticationComponent);
    registerAuthenticationStrategy(this, JWTStrategy);
    // Set up the custom sequence
    this.sequence(MySequence);

    // Set up default home page
    this.static('/', path.join(__dirname, '../public'));

    // Customize @loopback/rest-explorer configuration here
    this.configure(RestExplorerBindings.COMPONENT).to({
      path: '/explorer',
    });
    this.component(RestExplorerComponent);

    this.projectRoot = __dirname;
    // Customize @loopback/boot Booter Conventions here
    this.bootOptions = {
      controllers: {
        // Customize ControllerBooter Conventions here
        dirs: ['controllers'],
        extensions: ['.controller.js'],
        nested: true,
      },
    };
  }

  async setupSocketIO() {
    await super.start();
    
    // Configura Socket.io
    this.io = new Server(this.restServer.httpServer?.server, {
      cors: {
        origin: ['http://localhost:4201', 'http://localhost:4200'],
        credentials: true,
      },
    });

    this.io.on('connection', (socket) => {
      console.log('User connected:', socket.id);
      
      socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
      });
    });
  }
   
  setupBindings(): void {
    // Bind bcrypt hasher
    this.bind(PasswordHasherBindings.PASSWORD_HASHER).toClass(BcryptHasher);
    this.bind(PasswordHasherBindings.ROUNDS).to(10);
    this.bind(UserServiceBindings.USER_SERVICE).toClass(myUserService);
    this.bind(TokenServiceBindings.TOKEN_SERVICE).toClass(JWTService);
    this.bind(TokenServiceBindings.TOKEN_SECRET).to(TokenServiceConstants.TOKEN_SECRET_VALUE);
    this.bind(TokenServiceBindings.TOKEN_EXPIRES_IN).to(TokenServiceConstants.TOKEN_EXPIRES_IN_VALUE);

  }
  
}
