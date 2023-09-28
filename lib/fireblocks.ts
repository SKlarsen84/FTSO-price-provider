import { formatEther, formatUnits } from 'ethers/lib/utils'
import {
  AssetResponse,
  CreateTransactionResponse,
  ExternalWalletAsset,
  FireblocksSDK,
  PeerType,
  TransactionArguments,
  TransactionOperation,
  TransactionResponse,
  TransactionStatus,
  VaultAccountResponse,
  WalletContainerResponse,
} from 'fireblocks-sdk'


//read key from ./fb.key on file system
const secret = process.env.FIREBLOCKS_FEE_SWEEPER_KEY.replace(/\\n/g, '\n')
const apiKey = process.env.FIREBLOCKS_FEE_SWEEPER_API_KEY

const fireblocks = new FireblocksSDK(secret, apiKey)

export const getFireBlocksSDK = () => fireblocks


export const getFireBlockTxStatus = async (txId: string) => {
  const tx = await fireblocks.getTransactionById(txId)
  return tx.status
}

export const getFireBlockTx = async (txId: string) => {
  const tx = await fireblocks.getTransactionById(txId)
  return tx
}

export const rawFireblocksTransaction = async (
  data: unknown
): Promise<CreateTransactionResponse> => {
  const payload: TransactionArguments = {
    extraParameters: {
      rawMessageData: {
        messages: [
          {
            content: data,
          },
        ],
      },
    },
    source: {
      type: PeerType.VAULT_ACCOUNT,
      id: process.env.FLARE_FTSO_VAULT_ID,
    },
    operation: TransactionOperation.RAW,
    assetId: 'FLR',
  }

  const txResult = await fireblocks.createTransaction(payload)

  return txResult
}
export const sendToSmartContract = async (opts: {
  token: string
  destinationId: string
  sourceVaultId: number
  amount: number
  callData: string
}) => {
  const payLoad: TransactionArguments = {
    operation: TransactionOperation.CONTRACT_CALL,
    assetId: opts.token,
    source: {
      type: PeerType.VAULT_ACCOUNT,
      id: opts.sourceVaultId.toString() /* Source Vault Account ID */,
    },
    destination: {
      type: PeerType.EXTERNAL_WALLET,
      id: process.env.FIREBLOCKS_SMART_CONTRACT_WALLET_ID,
    },
    note: 'Contract Call Transaction',
    amount: opts.amount.toString(),
    extraParameters: {
      contractCallData: opts.callData,
    },
  }

  const txResult = await fireblocks.createTransaction(payLoad)

  return txResult
}


//silly sleep function
const sleep = (ms: number) => {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

export async function waitForTxRegistration(
  transaction,
  maxWaitMs = 180000,
  frequency: number = 6000
): Promise<{ txHash: string; fee: number; netAmount: number }> {
  let waiting = true
  let counter = 0

  do {
    await sleep(frequency)
    const tx = await fireblocks.getTransactionById(transaction.id)
    if (tx.status === TransactionStatus.COMPLETED) {
      return {
        txHash: tx.txHash,
        fee: Number(tx.feeInfo.networkFee),
        netAmount: Number(tx.netAmount),
      }
    }
    counter++
    if (counter * frequency > maxWaitMs) {
      throw new Error(
        `Transaction not completed after ${counter} tries in ${maxWaitMs / 1000} seconds`
      )
    }
  } while (waiting)
}
