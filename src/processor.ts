import { BatchBlock, BatchHandlerContext, BatchProcessorItem, EvmBatchProcessor, EvmBlock, LogHandlerContext } from '@subsquid/evm-processor'
import { AddLogItem, LogItem, TransactionItem } from '@subsquid/evm-processor/lib/interfaces/dataSelection'
import { Store, TypeormDatabase } from '@subsquid/typeorm-store'
import { lookupArchive } from '@subsquid/archive-registry'
import { EntityManager, In } from 'typeorm';
import { 
  SFC_OLD_ADDR, 
  SFC_2_ADDR, 
  SFCR_2_ADDR, 
  SFCR_ADDR, 
  DEPLOYMENT_BLOCK, 
} from './constants';
import { User, Transfer, Token, Event } from './model';

import * as erc20 from './abi/erc20';

// Convert checksumed addresses to lowercase
const addresses = [SFC_OLD_ADDR, SFC_2_ADDR, SFCR_ADDR, SFCR_2_ADDR].map((addr) => addr.toLowerCase())

const database = new TypeormDatabase();
const processor = new EvmBatchProcessor()
.setDataSource({
    archive: lookupArchive('polygon') || "https://polygon.archive.subsquid.io",
})
.addLog(addresses, {
    range: {from: DEPLOYMENT_BLOCK},
    // filter by topic0 - Transfer
    // ? Не фильтруется по erc20 abi топику
    filter: [['0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef']],
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
  [addresses[0], 'SFC Old'],
  [addresses[1], 'SFC 2'],
  [addresses[2], 'SFCR'],
  [addresses[3], 'SFCR 2'],
])

processor.run(database, async (ctx) => {
  const events: Map<string, Event> = new Map();

  for (let block of ctx.blocks) {
    for (let item of block.items) {
      if (item.kind !== 'evmLog') continue
      
      if (item.address === addresses[0]) {
        if (item.evmLog.topics[0] === erc20Transfer.topic) {
          const {eventId, event} = await handleTransferEvent(
            ctx, 
            item, 
            block, 
            addresses[0]
          );
          events.set(eventId, event);
        } 
      } else if (item.address === addresses[1]) {
        if (item.evmLog.topics[0] === erc20Transfer.topic) {
          const {eventId, event} = await handleTransferEvent(
            ctx, 
            item, 
            block, 
            addresses[1]
          );
          events.set(eventId, event);
        } 
      } else if (item.address === addresses[2]) {
        if (item.evmLog.topics[0] === erc20Transfer.topic) {
          const {eventId, event} = await handleTransferEvent(
            ctx, 
            item, 
            block, 
            addresses[2]
          );
          events.set(eventId, event);
        } 
      } else if (item.address === addresses[3]) {
        if (item.evmLog.topics[0] === erc20Transfer.topic) {
          const {eventId, event} = await handleTransferEvent(
            ctx, 
            item, 
            block, 
            addresses[3]
          );
          events.set(eventId, event);
        } 
      }
    }
  }
  await ctx.store.save([...events.values()]);
});

// Inferred types
type Ctx = BatchHandlerContext<Store, AddLogItem<LogItem<false> | TransactionItem<false>, LogItem<{
  evmLog: {
    topics: true;
    data: true;
  };
  transaction: {
    hash: true;
  };
}>>>;

type Item = {
  evmLog: {
    id: string;
    address: string;
    index: number;
    transactionIndex: number;
    data: string;
    topics: string[];
  };
  address: string;
  transaction: {
    id: string;
    hash: string;
    to?: string | undefined;
    index: number;
  };
  kind: "evmLog";
};

type Block = BatchBlock<AddLogItem<LogItem<false> | TransactionItem<false>, LogItem<{
  evmLog: {
    topics: true;
    data: true;
  };
  transaction: {
    hash: true;
  };
}>>>;
// end types


/**
 * Extract transfer event fields and save to object
 * @param {Ctx} ctx Batch context
 * @param {Item} item EvmLog item
 * @param {Block} block Block of an EvmLog items
 * @param {string} tokenId Token address for which, event is met
 * @returns Event id and event entity 
 */
async function handleTransferEvent(
  ctx: Ctx, 
  item: Item,
  block: Block,
  tokenId: string
  ): Promise<{ eventId: string, event: Event }> {

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
    createdAt: new Date(block.header.timestamp),
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

  // set event token 
  event.token = token;
  
  user = await findOrCreateUser(from);

  let transfer: Transfer = new Transfer({
    from: user.id,
    to: (await findOrCreateUser(to)).id,
    amount: value.toBigInt(),
    txHash: item.transaction.hash,
  });
  // set transfer and user to eventLog column of Event entity
  event.eventLog = transfer;
  event.user = user;
  // save token to repo
  await tokenRepo.save(token);
    
  return {eventId: event.id, event: event};
}