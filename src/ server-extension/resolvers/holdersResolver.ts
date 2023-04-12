import { Field, ObjectType, Query, Resolver } from "type-graphql";
import { ethers } from "ethers";
import { EntityManager } from "typeorm";
import { User } from "../../model/generated/user.model";

@ObjectType()
export class Holders {
  @Field(() => Number, { nullable: false })
  sfcHolders!: number;
  @Field(() => Number, { nullable: false })
  sfcrHolders!: number

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
    const zeroAddr = ethers.constants.AddressZero;
    const sfcQuery = `
    SELECT COUNT(*) FROM "user" WHERE id != '${zeroAddr}' AND sfc_old > 0 AND sfc2 > 0;
    `;
    const sfcrQuery = `
    SELECT COUNT(*) FROM "user" WHERE id != '${zeroAddr}' AND sfcr > 0 AND sfcr2 > 0;
    `;

    const sfcHoldersCount = await manager.getRepository(User).query(sfcQuery);
    const sfcrHoldersCount = await manager.getRepository(User).query(sfcrQuery);
    const holders = new Holders({
      sfcHolders: sfcHoldersCount,
      sfcrHolders: sfcrHoldersCount,
    });
    return holders;
  }
}
