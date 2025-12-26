// HonestHouse contract configuration. Replace CONTRACT_ADDRESS once deployed to Sepolia.
export const CONTRACT_ADDRESS = '0xED2972bA23c297538a6853a2CdE839eD14B96403' as `0x${string}`;

export const CONTRACT_ABI = [
  {
    "inputs": [],
    "name": "ZamaProtocolUnsupported",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "gameId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "player",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "euint32",
        "name": "encryptedAmount",
        "type": "bytes32"
      }
    ],
    "name": "CoinsSubmitted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "gameId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "creator",
        "type": "address"
      }
    ],
    "name": "GameCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "gameId",
        "type": "uint256"
      }
    ],
    "name": "GameStarted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "gameId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "player",
        "type": "address"
      }
    ],
    "name": "PlayerJoined",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "gameId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint8",
        "name": "round",
        "type": "uint8"
      }
    ],
    "name": "RoundResolved",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "confidentialProtocolId",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "createGame",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "gameId",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getAllGames",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "gameId",
            "type": "uint256"
          },
          {
            "internalType": "address[2]",
            "name": "players",
            "type": "address[2]"
          },
          {
            "internalType": "bool",
            "name": "started",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "finished",
            "type": "bool"
          },
          {
            "internalType": "uint8",
            "name": "round",
            "type": "uint8"
          }
        ],
        "internalType": "struct HonestHouse.GameSummary[]",
        "name": "summaries",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "gameId",
        "type": "uint256"
      }
    ],
    "name": "getGameSummary",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "gameId",
            "type": "uint256"
          },
          {
            "internalType": "address[2]",
            "name": "players",
            "type": "address[2]"
          },
          {
            "internalType": "bool",
            "name": "started",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "finished",
            "type": "bool"
          },
          {
            "internalType": "uint8",
            "name": "round",
            "type": "uint8"
          }
        ],
        "internalType": "struct HonestHouse.GameSummary",
        "name": "summary",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "gameId",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "player",
        "type": "address"
      }
    ],
    "name": "getPlayerState",
    "outputs": [
      {
        "internalType": "euint32",
        "name": "coins",
        "type": "bytes32"
      },
      {
        "internalType": "euint32",
        "name": "score",
        "type": "bytes32"
      },
      {
        "internalType": "bool",
        "name": "hasSubmitted",
        "type": "bool"
      },
      {
        "internalType": "uint8",
        "name": "seat",
        "type": "uint8"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "gameId",
        "type": "uint256"
      }
    ],
    "name": "getRoundStatus",
    "outputs": [
      {
        "internalType": "uint8",
        "name": "round",
        "type": "uint8"
      },
      {
        "internalType": "bool",
        "name": "started",
        "type": "bool"
      },
      {
        "internalType": "bool",
        "name": "finished",
        "type": "bool"
      },
      {
        "internalType": "bool",
        "name": "firstSubmitted",
        "type": "bool"
      },
      {
        "internalType": "bool",
        "name": "secondSubmitted",
        "type": "bool"
      },
      {
        "internalType": "euint32",
        "name": "firstContribution",
        "type": "bytes32"
      },
      {
        "internalType": "euint32",
        "name": "secondContribution",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "gameId",
        "type": "uint256"
      }
    ],
    "name": "joinGame",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "nextGameId",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "gameId",
        "type": "uint256"
      }
    ],
    "name": "startGame",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "gameId",
        "type": "uint256"
      },
      {
        "internalType": "externalEuint32",
        "name": "encryptedCoins",
        "type": "bytes32"
      },
      {
        "internalType": "bytes",
        "name": "inputProof",
        "type": "bytes"
      }
    ],
    "name": "submitCoins",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;
