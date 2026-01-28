export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    code?: string;
}

export function createSuccessResponse<T>(data: T): ApiResponse<T> {
    return { success: true, data };
}

export function createErrorResponse(error: string, code?: string): ApiResponse {
    return { success: false, error, code };
}
