import { MD3LightTheme as DefaultTheme } from 'react-native-paper'

export const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#0066CC',
    secondary: '#00BCD4',
    accent: '#FF5722',
    background: '#F5F5F5',
    surface: '#FFFFFF',
    text: '#212121',
    error: '#D32F2F',
    success: '#4CAF50',
    warning: '#FFC107',
  },
  roundness: 8,
}