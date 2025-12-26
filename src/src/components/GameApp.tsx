import { useEffect, useMemo, useState } from 'react';
import { Contract } from 'ethers';
import { useAccount, useReadContract } from 'wagmi';
import { useEthersSigner } from '../hooks/useEthersSigner';
import { useZamaInstance } from '../hooks/useZamaInstance';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../config/contracts';
import { Header } from './Header';
import '../styles/GameApp.css';

type GameSummary = {
  gameId: number;
  players: string[];
  started: boolean;
  finished: boolean;
  round: number;
};

type PlayerState = {
  coins: string;
  score: string;
  hasSubmitted: boolean;
  seat: number;
};

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export function GameApp() {
  const { address, isConnected } = useAccount();
  const signerPromise = useEthersSigner();
  const { instance, isLoading: zamaLoading, error: zamaError } = useZamaInstance();
  const contractReady = CONTRACT_ADDRESS !== ZERO_ADDRESS;

  const [selectedGameId, setSelectedGameId] = useState<number | null>(null);
  const [submitAmount, setSubmitAmount] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [decrypting, setDecrypting] = useState(false);
  const [decrypted, setDecrypted] = useState<{ coins?: string; score?: string } | null>(null);

  const { data: gamesData, refetch: refetchGames, isPending: loadingGames } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getAllGames',
    query: {
      refetchInterval: 8000,
      enabled: contractReady,
    },
  });

  const games: GameSummary[] = useMemo(() => {
    if (!gamesData) return [];
    return (gamesData as any[]).map((g: any) => {
      const gameId = g.gameId ?? g[0];
      const players = g.players ?? g[1];
      const started = g.started ?? g[2];
      const finished = g.finished ?? g[3];
      const round = g.round ?? g[4];
      return {
        gameId: Number(gameId),
        players: players as string[],
        started: Boolean(started),
        finished: Boolean(finished),
        round: Number(round),
      };
    });
  }, [gamesData]);

  useEffect(() => {
    if (!selectedGameId && games.length > 0) {
      setSelectedGameId(games[games.length - 1].gameId);
    }
  }, [games, selectedGameId]);

  const activeGameId = selectedGameId ? BigInt(selectedGameId) : undefined;

  const {
    data: summaryData,
    refetch: refetchSummary,
    isFetching: loadingSummary,
  } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getGameSummary',
    args: activeGameId ? [activeGameId] : undefined,
    query: {
      enabled: !!activeGameId && contractReady,
      refetchInterval: 6000,
    },
  });

  const summary: GameSummary | null = summaryData
    ? {
        gameId: Number((summaryData as any).gameId ?? (summaryData as any)[0]),
        players: ((summaryData as any).players ?? (summaryData as any)[1]) as string[],
        started: Boolean((summaryData as any).started ?? (summaryData as any)[2]),
        finished: Boolean((summaryData as any).finished ?? (summaryData as any)[3]),
        round: Number((summaryData as any).round ?? (summaryData as any)[4]),
      }
    : null;

  const { data: playerStateData, refetch: refetchPlayerState } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getPlayerState',
    args: activeGameId && address ? [activeGameId, address] : undefined,
    query: {
      enabled: !!activeGameId && !!address && contractReady,
      refetchInterval: 6000,
    },
  });

  const playerState: PlayerState | null = playerStateData
    ? (() => {
        const data: any = playerStateData;
        return {
          coins: (data.coins ?? data[0]) as string,
          score: (data.score ?? data[1]) as string,
          hasSubmitted: Boolean(data.hasSubmitted ?? data[2]),
          seat: Number(data.seat ?? data[3]),
        };
      })()
    : null;

  const { data: roundData, refetch: refetchRound } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getRoundStatus',
    args: activeGameId ? [activeGameId] : undefined,
    query: {
      enabled: !!activeGameId && contractReady,
      refetchInterval: 6000,
    },
  });

  const roundStatus = roundData
    ? (() => {
        const data: any = roundData;
        return {
          round: Number(data.round ?? data[0]),
          started: Boolean(data.started ?? data[1]),
          finished: Boolean(data.finished ?? data[2]),
          firstSubmitted: Boolean(data.firstSubmitted ?? data[3]),
          secondSubmitted: Boolean(data.secondSubmitted ?? data[4]),
          firstContribution: (data.firstContribution ?? data[5]) as string,
          secondContribution: (data.secondContribution ?? data[6]) as string,
        };
      })()
    : null;

  const joinableGames = games.filter(
    (g) => !g.finished && !g.started && (g.players[0] === ZERO_ADDRESS || g.players[1] === ZERO_ADDRESS),
  );

  const isPlayer =
    summary && address ? summary.players.some((player) => player.toLowerCase() === address.toLowerCase()) : false;

  const canStart =
    !!summary &&
    isPlayer &&
    !summary.started &&
    summary.players[0] !== ZERO_ADDRESS &&
    summary.players[1] !== ZERO_ADDRESS;

  const canSubmit = !!summary && summary.started && !summary.finished && isPlayer;

  const formatAddress = (value: string) => {
    if (!value || value === ZERO_ADDRESS) return 'Waiting for player';
    return `${value.slice(0, 6)}...${value.slice(-4)}`;
  };

  const refreshAll = async () => {
    await Promise.all([refetchGames(), refetchSummary(), refetchPlayerState(), refetchRound()]);
  };

  const setError = (message: string) => {
    setStatusMessage(message);
    setTimeout(() => setStatusMessage(''), 4000);
  };

  const parseGameIdFromReceipt = (receipt: any, contract: Contract): number | null => {
    if (!receipt?.logs) return null;
    for (const log of receipt.logs) {
      try {
        const parsed = contract.interface.parseLog(log);
        if (parsed?.name === 'GameCreated') {
          return Number(parsed.args?.gameId);
        }
      } catch {
        continue;
      }
    }
    return null;
  };

  const handleCreateGame = async () => {
    if (!isConnected) {
      setError('Connect your wallet first.');
      return;
    }
    if (!contractReady) {
      setError('Set the deployed contract address before creating a game.');
      return;
    }
    try {
      setStatusMessage('Creating a new encrypted match...');
      const signer = await signerPromise;
      if (!signer) throw new Error('Signer unavailable');
      const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const tx = await contract.createGame();
      const receipt = await tx.wait();
      const newGameId = parseGameIdFromReceipt(receipt, contract);
      await refreshAll();
      if (newGameId) {
        setSelectedGameId(newGameId);
        setStatusMessage(`New game #${newGameId} created`);
      } else {
        setStatusMessage('Game created');
      }
    } catch (error) {
      console.error(error);
      setError('Failed to create game.');
    }
  };

  const handleJoinGame = async (gameId: number) => {
    if (!isConnected) {
      setError('Connect your wallet first.');
      return;
    }
    if (!contractReady) {
      setError('Set the deployed contract address before joining.');
      return;
    }
    try {
      setStatusMessage(`Joining game #${gameId}...`);
      const signer = await signerPromise;
      if (!signer) throw new Error('Signer unavailable');
      const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const tx = await contract.joinGame(BigInt(gameId));
      await tx.wait();
      setSelectedGameId(gameId);
      await refreshAll();
      setStatusMessage(`Joined game #${gameId}`);
    } catch (error) {
      console.error(error);
      setError('Could not join game.');
    }
  };

  const handleStartGame = async () => {
    if (!activeGameId || !canStart) return;
    if (!contractReady) {
      setError('Set the deployed contract address before starting.');
      return;
    }
    try {
      setStatusMessage('Starting match...');
      const signer = await signerPromise;
      if (!signer) throw new Error('Signer unavailable');
      const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const tx = await contract.startGame(activeGameId);
      await tx.wait();
      await refreshAll();
      setStatusMessage('Game started');
    } catch (error) {
      console.error(error);
      setError('Unable to start game.');
    }
  };

  const handleSubmitCoins = async () => {
    if (!activeGameId || !canSubmit || !address) {
      setError('Select an active game you have joined.');
      return;
    }
    const amount = parseInt(submitAmount, 10);
    if (!Number.isInteger(amount) || amount < 0) {
      setError('Enter a valid coin amount.');
      return;
    }
    if (!instance) {
      setError('Encryption service still loading.');
      return;
    }
    if (!contractReady) {
      setError('Set the deployed contract address before submitting.');
      return;
    }
    try {
      setStatusMessage('Encrypting and sending your coins...');
      const input = instance.createEncryptedInput(CONTRACT_ADDRESS, address);
      input.add32(amount);
      const encrypted = await input.encrypt();

      const signer = await signerPromise;
      if (!signer) throw new Error('Signer unavailable');
      const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const tx = await contract.submitCoins(activeGameId, encrypted.handles[0], encrypted.inputProof);
      await tx.wait();

      setSubmitAmount('');
      setDecrypted(null);
      await refreshAll();
      setStatusMessage('Coins submitted for this round.');
    } catch (error) {
      console.error(error);
      setError('Failed to submit coins.');
    }
  };

  const handleDecrypt = async () => {
    if (!playerState || !instance || !address) {
      setError('Missing encryption context to decrypt.');
      return;
    }
    if (!contractReady) {
      setError('Set the deployed contract address before decrypting.');
      return;
    }
    setDecrypting(true);
    try {
      const keypair = instance.generateKeypair();
      const contractAddresses = [CONTRACT_ADDRESS];
      const startTimeStamp = Math.floor(Date.now() / 1000).toString();
      const durationDays = '7';
      const eip712 = instance.createEIP712(keypair.publicKey, contractAddresses, startTimeStamp, durationDays);
      const signer = await signerPromise;
      if (!signer) throw new Error('Signer unavailable');

      const signature = await signer.signTypedData(
        eip712.domain,
        { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
        eip712.message,
      );

      const decryptedMap = await instance.userDecrypt(
        [
          { handle: playerState.coins, contractAddress: CONTRACT_ADDRESS },
          { handle: playerState.score, contractAddress: CONTRACT_ADDRESS },
        ],
        keypair.privateKey,
        keypair.publicKey,
        signature.replace('0x', ''),
        contractAddresses,
        address,
        startTimeStamp,
        durationDays,
      );

      setDecrypted({
        coins: decryptedMap[playerState.coins as string] || '0',
        score: decryptedMap[playerState.score as string] || '0',
      });
      setStatusMessage('Decrypted your private stats.');
    } catch (error) {
      console.error(error);
      setError('Could not decrypt balances.');
    } finally {
      setDecrypting(false);
    }
  };

  return (
    <div className="app-shell">
      <Header />
      <main className="game-app">
        <section className="intro-card">
          <div>
            <p className="eyebrow">Encrypted duel</p>
            <h2>Play fair with hidden coin offers</h2>
            <p className="lede">
              Spin up a two-player match, submit Zama-encrypted bids, and earn points for the boldest moves. Balances and
              scores stay private, only you can decrypt them.
            </p>
            <div className="cta-row">
              <button className="primary-button" onClick={handleCreateGame} disabled={!isConnected}>
                Create game
              </button>
              <button className="ghost-button" onClick={refreshAll}>
                Refresh data
              </button>
            </div>
            {statusMessage ? <p className="status-message">{statusMessage}</p> : null}
            {!contractReady ? (
              <p className="error-text">
                Set the Sepolia deployment address in <code>src/src/config/contracts.ts</code> to interact.
              </p>
            ) : null}
            {zamaError ? <p className="error-text">Encryption error: {zamaError}</p> : null}
          </div>
          <div className="status-badge">
            <p className="badge-title">Encryption</p>
            <p className="badge-value">{zamaLoading ? 'initializing...' : 'ready'}</p>
          </div>
        </section>

        <section className="grid">
          <div className="card">
            <div className="card-header">
              <div>
                <p className="eyebrow">Game lobby</p>
                <h3>Join an open match</h3>
              </div>
            </div>
            {loadingGames ? (
              <p className="muted">Loading available games...</p>
            ) : joinableGames.length === 0 ? (
              <p className="muted">No open matches yet. Create one to get started.</p>
            ) : (
              <div className="game-list">
                {joinableGames.map((game) => (
                  <div key={game.gameId} className="game-row">
                    <div>
                      <p className="game-id">Game #{game.gameId}</p>
                      <p className="muted">{game.players.filter((p) => p !== ZERO_ADDRESS).length}/2 players</p>
                    </div>
                    <button className="secondary-button" onClick={() => handleJoinGame(game.gameId)}>
                      Join
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-header">
              <div>
                <p className="eyebrow">Active match</p>
                <h3>Game status</h3>
              </div>
              <div className="pill">
                {summary
                  ? summary.started
                    ? 'In progress'
                    : 'Waiting to start'
                  : 'Select a game'}
              </div>
            </div>

            <div className="game-selector">
              <label htmlFor="gameId">Game ID</label>
              <input
                id="gameId"
                type="number"
                min="1"
                placeholder="Enter game id"
                value={selectedGameId ?? ''}
                onChange={(e) => setSelectedGameId(e.target.value ? Number(e.target.value) : null)}
              />
            </div>

            {summary ? (
              <>
                <div className="game-meta">
                  <div>
                    <p className="muted">Player A</p>
                    <p className="mono">{formatAddress(summary.players[0])}</p>
                  </div>
                  <div>
                    <p className="muted">Player B</p>
                    <p className="mono">{formatAddress(summary.players[1])}</p>
                  </div>
                  <div>
                    <p className="muted">Round</p>
                    <p className="mono">{summary.round}</p>
                  </div>
                </div>

                <div className="actions-row">
                  <button className="secondary-button" onClick={handleStartGame} disabled={!canStart}>
                    Start game
                  </button>
                  <button className="ghost-button" onClick={() => refreshAll()}>
                    Sync
                  </button>
                </div>
              </>
            ) : loadingSummary ? (
              <p className="muted">Loading game...</p>
            ) : (
              <p className="muted">Pick a game to see details.</p>
            )}
          </div>

          <div className="card">
            <div className="card-header">
              <div>
                <p className="eyebrow">Round</p>
                <h3>Submit encrypted coins</h3>
              </div>
              <div className="pill subtle">
                {roundStatus
                  ? `Round ${roundStatus.round} · ${roundStatus.started ? 'active' : 'pending'}`
                  : 'No game'}
              </div>
            </div>
            <label className="input-label" htmlFor="coins">
              Coins to send
            </label>
            <input
              id="coins"
              type="number"
              min="0"
              placeholder="Amount"
              value={submitAmount}
              onChange={(e) => setSubmitAmount(e.target.value)}
            />
            <button className="primary-button" onClick={handleSubmitCoins} disabled={!canSubmit || zamaLoading}>
              {zamaLoading ? 'Preparing encryption...' : 'Submit coins'}
            </button>
            {roundStatus ? (
              <div className="round-flags">
                <span className={`flag ${roundStatus.firstSubmitted ? 'on' : ''}`}>Player A submitted</span>
                <span className={`flag ${roundStatus.secondSubmitted ? 'on' : ''}`}>Player B submitted</span>
              </div>
            ) : null}
          </div>

          <div className="card">
            <div className="card-header">
              <div>
                <p className="eyebrow">Encrypted stats</p>
                <h3>Your balance</h3>
              </div>
            </div>
            {playerState ? (
              <>
                <div className="cipher-grid">
                  <div>
                    <p className="muted">Coins (ciphertext)</p>
                    <p className="mono small">{playerState.coins}</p>
                  </div>
                  <div>
                    <p className="muted">Score (ciphertext)</p>
                    <p className="mono small">{playerState.score}</p>
                  </div>
                </div>
                <div className="decrypted">
                  <div>
                    <p className="muted">Decrypted coins</p>
                    <p className="metric">{decrypted?.coins ?? '•••'}</p>
                  </div>
                  <div>
                    <p className="muted">Decrypted score</p>
                    <p className="metric">{decrypted?.score ?? '•••'}</p>
                  </div>
                </div>
                <button className="secondary-button" onClick={handleDecrypt} disabled={decrypting || zamaLoading}>
                  {decrypting ? 'Decrypting...' : 'Decrypt my stats'}
                </button>
              </>
            ) : (
              <p className="muted">Join a game to see your encrypted balances.</p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
