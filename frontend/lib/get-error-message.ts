import axios from 'axios';

type ApiErrorData = {
  msg?: string;
  message?: string;
};

export const getErrorMessage = (error: unknown, fallback: string) => {
  if (axios.isAxiosError<ApiErrorData>(error)) {
    return error.response?.data?.msg || error.response?.data?.message || error.message || fallback;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
};
