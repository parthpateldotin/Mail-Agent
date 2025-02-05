export interface TokenPayload {
  id: string;
  userId: string;
  email: string;
  role: string;
  exp?: number;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
} 