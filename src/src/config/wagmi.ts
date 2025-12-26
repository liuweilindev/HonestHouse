import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { sepolia } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'Honest House',
  projectId: 'b0e00c5c9a8c4fd2b5dfc3c2d1a9f5c1',
  chains: [sepolia],
  ssr: false,
});
