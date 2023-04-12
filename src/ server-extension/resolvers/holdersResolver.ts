import { Field, ObjectType, Query, Resolver } from "type-graphql";
import { EntityManager } from "typeorm";
import { User } from "../../model/generated/user.model";

@ObjectType()
export class Holders {
  @Field(() => BigInt, { nullable: false })
  sfcHolders!: BigInt;
  @Field(() => BigInt, { nullable: false })
  sfcrHolders!: BigInt

  constructor(props: Partial<Holders>) {
    Object.assign(this, props);
  }
}

@Resolver()
export class HoldersResolver {
  constructor(private tx: () => Promise<EntityManager>) {}

  @Query(() => Holders)
  async getHolders(): Promise<Holders> {
    const manager = await this.tx();
    const sfcQuery = `
    SELECT COUNT(*) FROM "user" WHERE id != '0x0000000000000000000000000000000000000000' AND sfc_old > 0 AND sfc2 > 0;
    `;
    const sfcrQuery = `
    SELECT COUNT(*) FROM "user" WHERE id != '0x0000000000000000000000000000000000000000' AND sfcr > 0 AND sfcr2 > 0;
    `;

    const sfcHoldersCount = await manager.getRepository(User).query(sfcQuery);
    const sfcrHoldersCount = await manager.getRepository(User).query(sfcrQuery);
    return {
        sfcHolders: sfcHoldersCount,
        sfcrHolders: sfcrHoldersCount,
    };
  }
}
