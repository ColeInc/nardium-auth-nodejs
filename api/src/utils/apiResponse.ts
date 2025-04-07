import { Response } from 'express';
import { ApiResponse } from '../types/api';

/**
 * Send a success response
 * @param res Express response object
 * @param data Data to send
 * @param message Optional message
 * @param statusCode HTTP status code (default: 200)
 */
export function sendSuccess<T>(
    res: Response,
    data: T,
    message?: string,
    statusCode: number = 200
): void {
    const response: ApiResponse<T> = {
        success: true,
        data,
        message
    };

    res.status(statusCode).json(response);
}

/**
 * Send an error response
 * @param res Express response object
 * @param error Error message
 * @param statusCode HTTP status code (default: 500)
 */
export function sendError(
    res: Response,
    error: string,
    statusCode: number = 500
): void {
    const response: ApiResponse = {
        success: false,
        error
    };

    res.status(statusCode).json(response);
}

/**
 * Send a not found response
 * @param res Express response object
 * @param message Optional message (default: 'Resource not found')
 */
export function sendNotFound(
    res: Response,
    message: string = 'Resource not found'
): void {
    sendError(res, message, 404);
}

/**
 * Send an unauthorized response
 * @param res Express response object
 * @param message Optional message (default: 'Unauthorized')
 */
export function sendUnauthorized(
    res: Response,
    message: string = 'Unauthorized'
): void {
    sendError(res, message, 401);
} 