import { createContext, useContext, useState } from 'react'

const FamilyContext = createContext(null)
const STORAGE_KEY = 'healthify_family_id'

export function FamilyProvider({ children }) {
  const [familyId, _setFamilyId] = useState(() => localStorage.getItem(STORAGE_KEY) ?? null)
  const [currentMember, setCurrentMember] = useState(null)

  function setFamilyId(id) {
    if (id) localStorage.setItem(STORAGE_KEY, id)
    else localStorage.removeItem(STORAGE_KEY)
    _setFamilyId(id)
  }

  return (
    <FamilyContext.Provider value={{ familyId, setFamilyId, currentMember, setCurrentMember }}>
      {children}
    </FamilyContext.Provider>
  )
}

export function useFamily() {
  return useContext(FamilyContext)
}
