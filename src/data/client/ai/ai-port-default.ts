import * as Network from 'expo-network'
import { Alert as RNAlert } from 'react-native'

import { rpcClient } from '@/data/client/rpc-client'

import type { AIPort } from './ai-port'

export function defaultAIPort(): AIPort {
  return {
    async checkConnectivity() {
      const state = await Network.getNetworkStateAsync()
      return Boolean(state.isConnected && state.isInternetReachable)
    },
    async requestPlan(req, signal) {
      return rpcClient.ai.suggestMaintenancePlan(req, { signal })
    },
    alertPrompt(copy) {
      return new Promise<boolean>(resolve => {
        RNAlert.alert(copy.title, copy.message, [
          {
            text: copy.cancelLabel,
            style: 'cancel',
            onPress: () => resolve(false)
          },
          { text: copy.confirmLabel, onPress: () => resolve(true) }
        ])
      })
    },
    alertError(copy) {
      return new Promise<void>(resolve => {
        RNAlert.alert(copy.title, copy.message, [
          { text: 'OK', onPress: () => resolve() }
        ])
      })
    },
    now() {
      return Date.now()
    },
    sleep(ms, signal) {
      return new Promise<void>((resolve, reject) => {
        const id = setTimeout(resolve, ms)
        signal.addEventListener('abort', () => {
          clearTimeout(id)
          reject(new Error('Aborted'))
        })
      })
    }
  }
}
