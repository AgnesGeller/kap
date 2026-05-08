export function createQueryTimeoutError(message: string) {
  return {
    name: "PostgrestError",
    message,
    details: "",
    hint: "",
    code: "QUERY_TIMEOUT",
    toJSON() {
      return {
        name: "PostgrestError",
        message,
        details: "",
        hint: "",
        code: "QUERY_TIMEOUT",
      };
    },
  };
}

export function createQueryTimeoutResponse(message: string) {
  return {
    data: null,
    error: createQueryTimeoutError(message),
    count: null,
    status: 408,
    statusText: "Request Timeout",
    success: false as const,
  };
}

export function createQueryFallbackSuccess<T>(data: T) {
  return {
    data,
    error: null,
    count: null,
    status: 200,
    statusText: "OK",
    success: true as const,
  };
}
