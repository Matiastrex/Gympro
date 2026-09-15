export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }

  static badRequest(message: string) {
    return new ApiError(400, message);
  }
  static unauthorized(message = "No autenticado") {
    return new ApiError(401, message);
  }
  static forbidden(message = "No tenés permisos para esta acción") {
    return new ApiError(403, message);
  }
  static notFound(message = "Recurso no encontrado") {
    return new ApiError(404, message);
  }
}
