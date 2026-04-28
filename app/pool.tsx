import { Redirect } from 'expo-router';

// プール金はタブ画面に移動済み。古い /pool URLからのアクセスをリダイレクト
export default function PoolRedirect() {
  return <Redirect href={'/(tabs)/pool' as any} />;
}
