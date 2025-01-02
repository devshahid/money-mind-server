import { Response } from 'express';

// Helper code for the API consumer to understand the error and handle is accordingly
export enum ResponseType {
  SUCCESS = 'Success',
  CREATED = 'Created',
  NO_DATA = 'No Data Found',
}

export enum ResponseStatus {
  SUCCESS = 200,
  CREATED = 201,
}

export class SuccessMsgResponse {
  public message: string;
  public statusCode: number;
  public status: boolean;
  public output?;
  public time: Date = new Date();
  constructor(
    status: boolean,
    output: [] | object | string | number | boolean = [],
    message: string = ResponseType.SUCCESS,
    statusCode: number = ResponseStatus.SUCCESS
  ) {
    this.status = status;
    this.output = output;
    this.message = message;
    this.statusCode = statusCode;
  }
  sendResponse(res: Response) {
    const payload = {
      status: this.status,
      statusCode: this.statusCode,
      message: this.message,
      output: this.output,
      time: this.time,
    };
    res.status(this.statusCode).json(payload);
  }
}
