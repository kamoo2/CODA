// Request
export interface LoginRequest {
  email: string;
  password: string;
}

// Response
export interface LoginResponse {
  accessToken: string;
  userName: string;
  userId: string;
}

export interface User {
  currentUsedBucketName: any;
  id: string;
  name: string;
  teamId: string;
  teamName: string;
  email: string;
  bucketId: string;
}
