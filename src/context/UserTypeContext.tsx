import { createContext, useContext, useState, type ReactNode } from 'react'

type UserType = 'free' | 'pro' | null

interface UserTypeContextValue {
  userType: UserType
  setUserType: (t: UserType) => void
}

const UserTypeContext = createContext<UserTypeContextValue>({
  userType: null,
  setUserType: () => {}
})

export function UserTypeProvider({ children }: { children: ReactNode }) {
  const [userType, setUserTypeState] = useState<UserType>(() => {
    return (localStorage.getItem('sp-user-type') as UserType) || null
  })

  const setUserType = (t: UserType) => {
    setUserTypeState(t)
    if (t) localStorage.setItem('sp-user-type', t)
    else localStorage.removeItem('sp-user-type')
  }

  return (
    <UserTypeContext.Provider value={{ userType, setUserType }}>
      {children}
    </UserTypeContext.Provider>
  )
}

export const useUserType = () => useContext(UserTypeContext)
