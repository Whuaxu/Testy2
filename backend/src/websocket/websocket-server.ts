import {Server as HttpServer} from 'http';
import {Server, Socket} from 'socket.io';
import {verify} from 'jsonwebtoken';
import {ChatApplication} from '../application';
import {MessageRepository, ConversationRepository, UserRepository} from '../repositories';
import {TokenServiceConstants} from '../keys';

interface DecodedToken {
  id: string;
  email: string;
  username: string;
}

interface ConnectedUser {
  socket: Socket;
  userId: string;
  username: string;
}

export class WebSocketServer {
  private io: Server;
  private connectedUsers: Map<string, ConnectedUser> = new Map();
  private app: ChatApplication;

  constructor(httpServer: HttpServer, app: ChatApplication) {
    this.app = app;
    this.io = new Server(httpServer, {
      cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST'],
        credentials: true,
      },
    });

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  private setupMiddleware(): void {
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.query.token;
        
        if (!token) {
          return next(new Error('Authentication error: Token required'));
        }

        const jwtSecret = process.env.JWT_SECRET;
        // const jwtSecret = TokenServiceConstants.TOKEN_SECRET_VALUE;
        if (!jwtSecret) {
          console.error('JWT_SECRET environment variable is not set');
          return next(new Error('Authentication error: Server configuration error'));
        }
        const decoded = verify(token as string, jwtSecret) as DecodedToken;
        
        socket.data.userId = decoded.id;
        socket.data.username = decoded.username;
        
        next();
      } catch (err) {
        next(new Error('Authentication error: Invalid token'));
      }
    });
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      const userId = socket.data.userId;
      const username = socket.data.username;

      console.log(`User connected: ${username} (${userId})`);

      // Store connected user
      this.connectedUsers.set(userId, {
        socket,
        userId,
        username,
      });

      // Notify other users that this user is online
      socket.broadcast.emit('user-online', {userId, username});

      // Send list of online users to the newly connected user
      const onlineUsers = Array.from(this.connectedUsers.values()).map(u => ({
        userId: u.userId,
        username: u.username,
      }));
      socket.emit('online-users', onlineUsers);

      // Join user's personal room for direct messages
      socket.join(userId);

      // Handle joining a conversation room
      socket.on('join-conversation', (conversationId: string) => {
        socket.join(conversationId);
        console.log(`User ${username} joined conversation ${conversationId}`);
      });

      // Handle leaving a conversation room
      socket.on('leave-conversation', (conversationId: string) => {
        socket.leave(conversationId);
        console.log(`User ${username} left conversation ${conversationId}`);
      });

      // Handle new message
      socket.on('send-message', async (data: {conversationId: string; content: string}, callback?: (response: {success: boolean; error?: string; message?: unknown}) => void) => {
        try {
          const messageRepository = await this.app.getRepository(MessageRepository);
          const conversationRepository = await this.app.getRepository(ConversationRepository);

          // Create message in database
          const message = await messageRepository.create({
            content: data.content,
            senderId: userId,
            conversationId: data.conversationId,
            createdAt: new Date(),
            read: false,
          });

          // Update conversation
          await conversationRepository.updateById(data.conversationId, {
            lastMessageId: message.id,
            updatedAt: new Date(),
          });

          // Get message with sender info
          const messageWithSender = await messageRepository.findById(message.id!, {
            include: [{relation: 'sender'}],
          });

          // Broadcast message to all users in the conversation
          this.io.to(data.conversationId).emit('new-message', messageWithSender);

          // Also notify users who might not be in the conversation room
          const conversation = await conversationRepository.findById(data.conversationId);
          conversation.participantIds.forEach(participantId => {
            if (participantId !== userId && this.connectedUsers.has(participantId)) {
              this.connectedUsers.get(participantId)?.socket.emit('message-notification', {
                conversationId: data.conversationId,
                message: messageWithSender,
              });
            }
          });

          // Send acknowledgment to the sender
          if (callback) {
            callback({success: true, message: messageWithSender});
          }

        } catch (error) {
          console.error('Error sending message:', error);
          const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
          
          // Send error acknowledgment to the sender
          if (callback) {
            callback({success: false, error: errorMessage});
          } else {
            socket.emit('error', {message: errorMessage});
          }
        }
      });

      // Handle typing indicator
      socket.on('typing', (data: {conversationId: string; isTyping: boolean}) => {
        socket.to(data.conversationId).emit('user-typing', {
          userId,
          username,
          conversationId: data.conversationId,
          isTyping: data.isTyping,
        });
      });

      // Handle message read status
      socket.on('message-read', async (data: {messageId: string; conversationId: string}) => {
        try {
          const messageRepository = await this.app.getRepository(MessageRepository);
          await messageRepository.updateById(data.messageId, {read: true});
          
          this.io.to(data.conversationId).emit('message-status-update', {
            messageId: data.messageId,
            read: true,
            readBy: userId,
          });
        } catch (error) {
          console.error('Error updating message read status:', error);
        }
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        console.log(`User disconnected: ${username} (${userId})`);
        this.connectedUsers.delete(userId);
        socket.broadcast.emit('user-offline', {userId, username});
      });
    });
  }

  getIO(): Server {
    return this.io;
  }

  isUserOnline(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }

  getOnlineUsers(): Array<{userId: string; username: string}> {
    return Array.from(this.connectedUsers.values()).map(u => ({
      userId: u.userId,
      username: u.username,
    }));
  }
}
