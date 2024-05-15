import { createStackNavigator } from '@react-navigation/stack'
import React from 'react'
import { useTranslation } from 'react-i18next'

import { TOKENS, useContainer } from '../container-api'
import { useConfiguration } from '../contexts/configuration'
import { useTheme } from '../contexts/theme'
import { NotificationStackParams, Screens } from '../types/navigators'

import { createDefaultStackOptions } from './defaultStackOptions'

const NotificationStack: React.FC = () => {
  const Stack = createStackNavigator<NotificationStackParams>()
  const theme = useTheme()
  const { t } = useTranslation()
  const defaultStackOptions = createDefaultStackOptions(theme)
  const { customNotification } = useConfiguration()

  const container = useContainer()
  const CredentialDetails = container.resolve(TOKENS.SCREEN_CREDENTIAL_DETAILS)
  const CredentialOffer = container.resolve(TOKENS.SCREEN_CREDENTIAL_OFFER)
  const ProofRequest = container.resolve(TOKENS.SCREEN_PROOF_REQUEST)

  return (
    <Stack.Navigator screenOptions={{ ...defaultStackOptions }}>
      <Stack.Screen
        name={Screens.CredentialDetails}
        component={CredentialDetails}
        options={{ title: t('Screens.CredentialDetails') }}
      />
      <Stack.Screen
        name={Screens.CredentialOffer}
        component={CredentialOffer}
        options={{ title: t('Screens.CredentialOffer') }}
      />
      <Stack.Screen
        name={Screens.ProofRequest}
        component={ProofRequest}
        options={{ title: t('Screens.ProofRequest') }}
      />
      <Stack.Screen
        name={Screens.CustomNotification}
        component={customNotification.component}
        options={{ title: t(customNotification.pageTitle as any) }}
      />
    </Stack.Navigator>
  )
}

export default NotificationStack
