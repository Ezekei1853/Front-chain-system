export const LOG_STORAGE_ABI = [
  {
    "anonymous": false,
    "inputs": [
      {"indexed": false, "name": "data", "type": "string"}
    ],
    "name": "DataStored",
    "type": "event"
  },
  {
    "inputs": [{"name": "_data", "type": "string"}],
    "name": "store",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];