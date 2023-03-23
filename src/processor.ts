import { BatchHandlerContext, BatchProcessorItem, EvmBatchProcessor, EvmBlock } from '@subsquid/evm-processor'
import { LogItem } from '@subsquid/evm-processor/lib/interfaces/dataSelection'
import { Store, TypeormDatabase } from '@subsquid/typeorm-store'
import { lookupArchive } from '@subsquid/archive-registry'
import { In } from 'typeorm';
import { SFC_OLD_ADDR, SFC_2_ADDR, SFCR_2_ADDR, SFCR_ADDR, DEPLOYMENT_BLOCK } from './constants';
import { User, Transfer, Token, Event } from './model';

import * as erc20 from './abi/erc20';

// Convert checksumed addresses to lowercase
const addresses = [SFC_OLD_ADDR, SFC_2_ADDR, SFCR_2_ADDR, SFCR_ADDR].map((addr) => addr.toLowerCase())

const database = new TypeormDatabase();
const processor = new EvmBatchProcessor()
.setDataSource({
    archive: lookupArchive('polygon') || "https://polygon.archive.subsquid.io",
})
.addLog(addresses, {
    range: {from: DEPLOYMENT_BLOCK},
    filter: [[erc20.events.Transfer.topic]],
    data: {
        evmLog: {
            topics: true,
            data: true,
        },
        transaction: {
            hash: true,
        },
    },
})

type Item = BatchProcessorItem<typeof processor>
type Ctx = BatchHandlerContext<Store, Item>
// For topics and decode thoose event
const erc20Transfer = erc20.events.Transfer;

processor.run(database, async (ctx) => {
  let transfersData: TransferEventData[] = []

  for (let block of ctx.blocks) {
    for (let item of block.items) {
      if (item.kind !== 'evmLog') continue

      if (item.evmLog.topics[0] === erc20Transfer.topic) {
        transfersData.push(handleTransfer(ctx, block.header, item))
      }     
    }
  }

  await saveTransfers(ctx, transfersData)
})

async function saveTransfers(ctx: Ctx, transfersData: TransferEventData[]) {
    let accountIds = new Set<string>()
    for (let t of transfersData) {
        accountIds.add(t.from)
        accountIds.add(t.to)
    }

    let accounts = await ctx.store
        .findBy(Account, {id: In([...accountIds])})
        .then((q) => new Map(q.map((i) => [i.id, i])))

    let transfers: Transfer[] = []

    for (let t of transfersData) {
        let {id, blockNumber, timestamp, txHash, amount} = t

        let from = getAccount(accounts, t.from)
        let to = getAccount(accounts, t.to)

        transfers.push(
            new Transfer({
                id,
                blockNumber,
                timestamp,
                txHash,
                from,
                to,
                amount,
            })
        )
    }

    await ctx.store.save(Array.from(accounts.values()))
    await ctx.store.insert(transfers)
}

interface TransferEventData {
  token: Token
  from: User
  to: User
  amount: bigint
  txHash: string
}

function handleTransfer(
    ctx: Ctx,
    block: EvmBlock,
    item: LogItem<{evmLog: {topics: true; data: true}; transaction: {hash: true}}>
): TransferEventData {

  let event = new Event({
    id: `${item.transaction.hash}-${item.evmLog.index.toString()}`,
    createdAt: new Date(block.timestamp)
  });

  let user: User | null;

  if (item.address === SFC_OLD_ADDR) {
    
  }
    
}

function getAccount(m: Map<string, Account>, id: string): Account {
    let acc = m.get(id)
    if (acc == null) {
        acc = new Account()
        acc.id = id
        m.set(id, acc)
    }
    return acc
}
