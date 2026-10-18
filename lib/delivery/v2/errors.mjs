// One error envelope for every v2 response: { data: null, error: { status, name, message, details } }.
export class DeliveryError extends Error {
  constructor(status, name, message, path) {
    super(message);
    this.status = status;
    this.name = name;
    this.path = path;
  }
}

export const validationError = (message, path = []) => new DeliveryError(400, "ValidationError", message, path);
export const notFoundError = (message = "Not found.") => new DeliveryError(404, "NotFoundError", message);
export const unauthorizedError = (message) => new DeliveryError(401, "UnauthorizedError", message);
export const forbiddenError = (message) => new DeliveryError(403, "ForbiddenError", message);

export function errorPayload(error) {
  const known = error instanceof DeliveryError;
  const status = known ? error.status : 500;
  return {
    status,
    body: {
      data: null,
      error: {
        status,
        name: known ? error.name : "ApplicationError",
        message: known ? error.message : "Couldn't load content.",
        details: known && error.path ? { path: error.path } : {},
      },
    },
  };
}
