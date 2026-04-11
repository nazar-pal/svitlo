import * as Network from 'expo-network'
import { AppState } from 'react-native'

import { authClient } from './auth-client'
import type { SessionRuntime } from './session-runtime'

export const defaultSessionRuntime: SessionRuntime = {
  useSession: () => {
    const { data, isPending } = authClient.useSession()
    return { data, isPending }
  },
  getSession: async () => {
    const result = await authClient.getSession()
    return { data: result.data ?? null, error: result.error ?? null }
  },
  isOnline: async () => {
    const net = await Network.getNetworkStateAsync()
    return Boolean(net.isConnected) && net.isInternetReachable !== false
  },
  onConnectivityChange: listener => {
    const sub = Network.addNetworkStateListener(state => {
      const online =
        Boolean(state.isConnected) && state.isInternetReachable !== false
      listener(online)
    })
    return () => sub.remove()
  },
  onForeground: listener => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') listener()
    })
    return () => sub.remove()
  }
}
