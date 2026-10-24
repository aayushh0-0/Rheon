export type UserRole = 'PATIENT' | 'HOSPITAL_COORDINATOR' | 'ADMINISTRATOR';

export interface User {
  id: string;
  email: string;
  role: UserRole;
}

// Mock authentication logic until backend supports it
export const login = async (email: string, password: string, role: UserRole): Promise<User> => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // In a real application, you would make an API call to the backend
  // e.g., const response = await apiClient.post('/auth/login', { email, password, role });
  // return response.data;

  // For now, mock a successful login if fields are filled
  if (email && password && role) {
    return {
      id: 'mock-user-id',
      email,
      role,
    };
  }
  throw new Error('Invalid credentials');
};

export const logout = async (): Promise<void> => {
    // In a real application, you would make an API call to the backend
    // e.g., await apiClient.post('/auth/logout');
    localStorage.removeItem('user');
};

export const getCurrentUser = (): User | null => {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};
