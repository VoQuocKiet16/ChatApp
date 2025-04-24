export const withErrorHandling = async <T>(
    action: () => Promise<T>,
    errorMessage: string,
    setError: (error: string | null) => void
): Promise<T> => {
    try {
        const result = await action();
        setError(null);
        return result;
    } catch (error) {
        setError(error instanceof Error ? error.message : errorMessage);
        throw error;
    }
};