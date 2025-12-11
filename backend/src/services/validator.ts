import * as isEmail from 'isemail';
import {Credentials} from '../repositories/user.repository';
import { HttpErrors } from '@loopback/rest';

export function validateCredentials(credentials: Credentials){

    if(!isEmail.validate(credentials.email)){
        throw new HttpErrors.UnprocessableEntity('Invalid email format');
    }

    if(credentials.password.length < 8){
        throw new HttpErrors.UnprocessableEntity('Password must be at least 8 characters long');
    }
}