import { BatchBlock, BatchHandlerContext, BatchProcessorItem, EvmBatchProcessor, EvmBlock, LogHandlerContext } from '@subsquid/evm-processor'
import { AddLogItem, LogItem, TransactionItem } from '@subsquid/evm-processor/lib/interfaces/dataSelection'
import { Store, TypeormDatabase } from '@subsquid/typeorm-store'
import { lookupArchive } from '@subsquid/archive-registry'
import { EntityManager, In } from 'typeorm';
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

// For topics and decode thoose event
const erc20Transfer = erc20.events.Transfer;
const tokenName: Map<string, string> = new Map([
  [SFC_OLD_ADDR, 'SFC Old'],
  [SFC_2_ADDR, 'SFC 2'],
  [SFCR_ADDR, 'SFCR'],
  [SFCR_2_ADDR, 'SFCR 2'],
])

processor.run(database, async (ctx) => {
  const events: Set<Event> = new Set();

  for (let block of ctx.blocks) {
    for (let item of block.items) {
      if (item.kind !== 'evmLog') continue

      if (item.evmLog.topics[0] === erc20Transfer.topic) {
        if (item.address === SFC_OLD_ADDR) {
          events.add(
            await handleTransferEvent(ctx, item, block, SFC_OLD_ADDR)
          )
          
        } else if (item.address === SFC_2_ADDR) {
          events.add(
            await handleTransferEvent(ctx, item, block, SFC_2_ADDR)
          )
        } else if (item.address === SFCR_ADDR) {
          events.add(
            await handleTransferEvent(ctx, item, block, SFCR_ADDR)
          )

        } else if (item.address === SFCR_2_ADDR) {
          events.add(
            await handleTransferEvent(ctx, item, block, SFCR_2_ADDR)
          )
        }
      }
    }
  }
  await ctx.store.save([...events]);
})

async function handleTransferEvent(
  ctx: BatchHandlerContext<Store, AddLogItem<LogItem<false> | TransactionItem<false>, LogItem<{ evmLog: { topics: true; data: true; }; transaction: { hash: true; }; }>>>, 
  item: { evmLog: { id: string; address: string; index: number; transactionIndex: number; data: string; topics: string[]; }; address: string; transaction: { id: string; hash: string; to?: string | undefined; index: number; }; kind: "evmLog"; },
  block: BatchBlock<AddLogItem<LogItem<false> | TransactionItem<false>, LogItem<{ evmLog: { topics: true; data: true; }; transaction: { hash: true; }; }>>>,
  tokenId: string
  ): Promise<Event> {

  const findOrCreateUser = async (id: string): Promise<User> => {
    const mgr: EntityManager = await ctx.store["em"]();
    const repo = mgr.getRepository(User);
  
    let user = await repo.findOneBy({ id });
    if (!user) {
      user = new User({ id });
      await repo.save(user);
    }
    return user;
  };

  const mgr: EntityManager = await ctx.store["em"]();
  const tokenRepo = mgr.getRepository(Token);

  let event = new Event({
    id: `${item.transaction.hash}-${item.evmLog.index.toString()}`,
    createdAt: new Date(block.header.timestamp)
  });

  let user: User | null;
  let token: Token | null;

  
  const { from, to, value } = erc20Transfer.decode(item.evmLog);
  
  token = await tokenRepo.findOneBy({
    id: tokenId
  });

  if (!token) {
    token = new Token ({
      id: tokenId,
      name: tokenName.get(tokenId),
    });
  }
  
  user = await findOrCreateUser(from);

  let transfer: Transfer = new Transfer({
    token: token.id,
    from: user.id,
    to: (await findOrCreateUser(to)).id,
    amount: value.toBigInt(),
    txHash: item.transaction.hash,
  });
  // push transfer linked to this token
  token.transfers.push(transfer);
  await tokenRepo.save(token);
  // set transfer and user to eventLog column of Event entity
  event.eventLog = transfer;
  event.user = user;
    
  return event;
}