import { Redirect } from 'expo-router'

export default function ProtectedLayout() {
  return <Redirect href="/(web)" />
}
