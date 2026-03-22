import { TabStackLayout } from '@/components/navigation/tab-stack-layout'
import { useTranslation } from '@/lib/i18n'

export default function HomeLayout() {
  const { t } = useTranslation()
  return <TabStackLayout title={t('tabs.home')} gestureEnabled={false} />
}
