// Mock user data for testing
const mockUsers = [
  {
    id: 1,
    email: 'a@a.a',
    password: 'aaaa!',
    firstName: 'Test',
    lastName: 'User',
  },
];

// Mock tokens
const generateToken = () => {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

export const mockLogin = async (email: string, password: string) => {
  const user = mockUsers.find(u => u.email === email);
  
  if (!user || user.password !== password) {
    throw new Error('Invalid email or password');
  }

  const { password: _, ...userWithoutPassword } = user;
  
  return {
    user: userWithoutPassword,
    access_token: generateToken(),
    refresh_token: generateToken(),
  };
};

export const mockRegister = async (userData: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}) => {
  const exists = mockUsers.find(u => u.email === userData.email);
  if (exists) {
    throw new Error('User already exists');
  }

  const newUser = {
    id: mockUsers.length + 1,
    ...userData,
  };
  mockUsers.push(newUser);

  const { password: _, ...userWithoutPassword } = newUser;
  return userWithoutPassword;
}; 