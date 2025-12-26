import { ConnectButton } from '@rainbow-me/rainbowkit';
import '../styles/Header.css';

export function Header() {
  return (
    <header className="header">
      <div className="header-container">
        <div>
          <p className="header-flag">Honest House</p>
          <h1 className="header-title">Encrypted coin duel</h1>
          <p className="header-copy">Two players, private bids, verifiable rewards secured by Zama FHE.</p>
        </div>
        <ConnectButton />
      </div>
    </header>
  );
}
