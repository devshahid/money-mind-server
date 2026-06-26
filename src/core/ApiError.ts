import { Response } from 'express';
import * as constantStatusCode from '../constant';

export enum ErrorType {
  UNAUTHORIZED = 'AUTH FAILURE ERROR',
  CLIENT_ERROR = 'CLIENT ERROR',
  CUSTOM = 'CUSTOM ERROR',
}

export abstract class ApiError extends Error {
  constructor(
    public type: ErrorType,
    public statusCode: number,
    public message: string,
    public res?: Response,
    public stack: string = '',
    public date: Date = new Date()
  ) {
    super(type);
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  public static errorResponse(err: ApiError, res: Response) {
    const payload = {
      message: err.message,
      time: err.date,
      type: err.type,
      status: false,
    };
    res.status(err.statusCode).json(payload);
  }
}

export class AuthError extends ApiError {
  constructor(
    public message: string,
    public statusCode: number = constantStatusCode.statusCode.UNAUTHORIZED
  ) {
    super(ErrorType.UNAUTHORIZED, statusCode, message);
  }
}

export class CustomError extends ApiError {
  constructor(
    public message: string,
    public statusCode: number = constantStatusCode.statusCode.BADREQUEST
  ) {
    super(ErrorType.CUSTOM, statusCode, message);
  }
}

export class ClientError extends ApiError {
  constructor(
    public message: string,
    public statusCode: number = constantStatusCode.statusCode.BADREQUEST
  ) {
    super(ErrorType.CUSTOM, statusCode, message);
  }
}
