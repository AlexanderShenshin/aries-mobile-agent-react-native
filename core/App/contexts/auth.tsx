import { AskarWallet } from '@aries-framework/askar'
import { ConsoleLogger, LogLevel, SigningProviderRegistry } from '@aries-framework/core'
import { agentDependencies } from '@aries-framework/react-native'
import React, { createContext, useContext, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DeviceEventEmitter } from 'react-native'

import { EventTypes } from '../constants'
import { DispatchAction } from '../contexts/reducers/store'
import { useStore } from '../contexts/store'
import {
  secretForPIN,
  storeWalletSecret,
  loadWalletSecret,
  loadWalletSalt,
  isBiometricsActive,
  wipeWalletKey,
} from '../services/keychain'
import { WalletSecret } from '../types/security'
import { hashPIN } from '../utils/crypto'

export interface AuthContext {
  checkPIN: (PIN: string) => Promise<boolean>
  getWalletCredentials: () => Promise<WalletSecret | undefined>
  removeSavedWalletSecret: () => void
  disableBiometrics: () => Promise<void>
  setPIN: (PIN: string) => Promise<void>
  commitPIN: (useBiometry: boolean) => Promise<boolean>
  isBiometricsActive: () => Promise<boolean>
}

export const AuthContext = createContext<AuthContext>(null as unknown as AuthContext)

export const AuthProvider: React.FC = ({ children }) => {
  const [walletSecret, setWalletSecret] = useState<WalletSecret>()
  const [, dispatch] = useStore()
  const { t } = useTranslation()

  const setPIN = async (PIN: string): Promise<void> => {
    const secret = await secretForPIN(PIN)
    await storeWalletSecret(secret)
  }

  const getWalletCredentials = async (): Promise<WalletSecret | undefined> => {
    if (walletSecret && walletSecret.key) {
      return walletSecret
    }

    const { secret, err } = await loadWalletSecret(
      t('Biometry.UnlockPromptTitle'),
      t('Biometry.UnlockPromptDescription')
    )

    DeviceEventEmitter.emit(EventTypes.BIOMETRY_ERROR, err !== undefined)

    if (!secret) {
      return
    }
    setWalletSecret(secret)

    return secret
  }

  const commitPIN = async (useBiometry: boolean): Promise<boolean> => {
    const secret = await getWalletCredentials()
    if (!secret) {
      return false
    }
    // set did authenticate to true if we can get wallet credentials
    dispatch({
      type: DispatchAction.DID_AUTHENTICATE,
    })
    if (useBiometry) {
      await storeWalletSecret(secret, useBiometry)
    } else {
      // erase wallet key if biometrics is disabled
      await wipeWalletKey(useBiometry)
    }
    return true
  }

  const checkPIN = async (PIN: string): Promise<boolean> => {
    const secret = await loadWalletSalt()

    if (!secret || !secret.salt) {
      return false
    }

    const hash = await hashPIN(PIN, secret.salt)
    // eslint-disable-next-line no-console
    console.log('TODO: fix the openWallet call to indySdk', hash)

    try {
      // NOTE: a custom wallet is used to check if the wallet key is correct. This is different from the wallet used in the rest of the app.
      // We create an AskarWallet instance and open the wallet with the given secret.
      const askarWallet = new AskarWallet(
        new ConsoleLogger(LogLevel.off),
        new agentDependencies.FileSystem(),
        new SigningProviderRegistry([])
      )
      await askarWallet.open({
        id: secret.id,
        key: hash,
      })

      await askarWallet.close()

      const fullSecret = await secretForPIN(PIN, secret.salt)
      setWalletSecret(fullSecret)
      return true
    } catch (e) {
      return false
    }
  }

  const removeSavedWalletSecret = () => {
    setWalletSecret(undefined)
  }

  const disableBiometrics = async () => {
    await wipeWalletKey(true)
  }

  return (
    <AuthContext.Provider
      value={{
        checkPIN,
        getWalletCredentials,
        removeSavedWalletSecret,
        disableBiometrics,
        commitPIN,
        setPIN,
        isBiometricsActive,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
