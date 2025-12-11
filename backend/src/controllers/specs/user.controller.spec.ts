import {SchemaObject} from '@loopback/rest';

export const CredentialSchema: SchemaObject = {
  type: 'object',
  required: ['email', 'password'],
  properties: {
    email: {
      type: 'string',
      format: 'email',
    },
    password: {
      type: 'string',
      minLength: 8,
    },
  },
};

export const CredentialsRequestBody = {
  description: 'The input of login function',
  required: true,
  content: {
    'application/json': {schema: 
        CredentialSchema
    },
  },
};

export const UserRegistrationSchema: SchemaObject = {
  type: 'object',
  required: ['email', 'password', 'username'],
  properties: {
    email: {
      type: 'string',
      format: 'email',
    },
    password: {
      type: 'string',
      minLength: 8,
    },
    username: {
      type: 'string',
      minLength: 3,
    },
  },
};