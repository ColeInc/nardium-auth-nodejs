import { Request, Response, NextFunction } from 'express';

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

// User data interface
export interface UserData {
    id: string;
    email: string;
    [key: string]: any;
}

// Request with user data
export interface AuthenticatedRequest extends Request {
    userData?: UserData;
} 