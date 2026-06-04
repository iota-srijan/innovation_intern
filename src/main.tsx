import ReactDOM from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'

import './index.css'

import { queryClient } from './lib/queryClient'
import { UserTypeProvider } from './context/UserTypeContext'
import { AuthProvider } from './context/AuthContext'
import { CartProvider } from './context/CartContext'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <CartProvider>
        <UserTypeProvider>
          <App />
        </UserTypeProvider>
      </CartProvider>
    </AuthProvider>
  </QueryClientProvider>
)
