import { Routes } from '@angular/router';

export const routes: Routes = [

    {
        path: '',
        loadComponent: () => import('./chats/pages/login-page/login-page'),
    },

    {
        path: 'register',
        loadComponent: () => import('./chats/pages/register-page/register-page'),
    },

    {
        path: 'chat',
        loadComponent: () => import('./chats/pages/chat-page/chat-page'),
    },

    {
        path: 'chat/user/:userId',
        loadComponent: () => import('./chats/pages/chat-page/chat-page'),
    }, 

    {
        path: 'chat/conversation/:conversationId',
        loadComponent: () => import('./chats/pages/chat-page/chat-page'),
    },

    {
        path: '**',
        redirectTo: '',
    }
];
