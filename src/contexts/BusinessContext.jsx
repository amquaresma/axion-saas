import { createContext, useContext, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const BusinessContext = createContext({})

export function BusinessProvider({ children }) {
  const { businessId } = useParams()
  const [business, setBusiness] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchBusiness() {
      const { data } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', businessId)
        .single()
      setBusiness(data)
      setLoading(false)
    }
    if (businessId) fetchBusiness()
  }, [businessId])

  return (
    <BusinessContext.Provider value={{ business, loading }}>
      {children}
    </BusinessContext.Provider>
  )
}

export const useBusiness = () => useContext(BusinessContext)