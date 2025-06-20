class ApiError extends Error {
    statusCode: number;
    errors: any[];
    data: null;
    success: boolean;

    constructor(
        statusCode: number,
        message: string = 'Something went wrong',
        errors: any[] = [],
        data: null = null,
        stack: string = ''
    ) {
        super(message);
        this.statusCode = statusCode;
        this.errors = errors;
        this.data = data;
        this.message = message;
        this.success = false;

        if (stack) {
            this.stack = stack;
        } else {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}

export { ApiError };