class ErrorHandler extends Error{
    constructor(statusCode,message="",errors=[],stack){
        super(message);
        this.statusCode=statusCode;
        this.message=message;
        this.errors=errors;
        this.stack==stack;
        this.success=false
    }
}

export default ErrorHandler;