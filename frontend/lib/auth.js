const TOKEN_KEY = 'crm_token'
const USER_KEY = 'crm_user'

export const setToken = (token) => {
  if (typeof window !== 'undefined') localStorage.setItem(TOKEN_KEY, token)
}

export const getToken = () => {
  if (typeof window !== 'undefined') return localStorage.getItem(TOKEN_KEY)
  return null
}

export const removeToken = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  }
}

export const setUser = (user) => {
  if (typeof window !== 'undefined') localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export const getUser = () => {
  if (typeof window !== 'undefined') {
    const u = localStorage.getItem(USER_KEY)
    return u ? JSON.parse(u) : null
  }
  return null
}

export const logout = () => {
  removeToken()
  window.location.href = '/login'
}
