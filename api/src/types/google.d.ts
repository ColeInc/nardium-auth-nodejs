declare module 'googleapis' {
    export const google: {
        auth: {
            OAuth2: new (clientId: string, clientSecret: string, redirectUri: string) => any;
        };
        oauth2: any;
        docs: any;
        drive: any;
    };
}

declare module 'google-auth-library' {
    export class OAuth2Client {
        constructor(clientId: string, clientSecret?: string, redirectUri?: string);
        generateAuthUrl(opts: any): string;
        getToken(code: string): Promise<any>;
        setCredentials(credentials: any): void;
        verifyIdToken(options: { idToken: string, audience: string }): Promise<any>;
    }
} 