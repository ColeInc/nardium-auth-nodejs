import { Request, Response, NextFunction } from 'express';

// Environment variables interface
export interface EnvVariables {
    NODE_ENV: string;
    PORT: number;
    CHROME_EXTENSION_URL: string;
    [key: string]: string | number | undefined;
}

// API response interface
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

// Middleware function type
export type MiddlewareFunction = (
    req: Request,
    res: Response,
    next: NextFunction
) => void | Promise<void>;

// Controller function type
export type ControllerFunction = (
    req: Request,
    res: Response,
    next?: NextFunction
) => void | Promise<void>;

// Serverless handler type
export type ServerlessHandler = (
    req: Request,
    res: Response
) => Promise<any>;

// Re-export all types
export * from './api'; 