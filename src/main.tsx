import ReactDOM from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'

import './index.css'

import { queryClient } from './lib/queryClient'
import { AuthProvider } from './context/AuthContext'
import { CartProvider } from './context/CartContext'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <CartProvider>
        <App />
      </CartProvider>
    </AuthProvider>
  </QueryClientProvider>
)
