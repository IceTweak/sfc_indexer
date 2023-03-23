import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_} from "typeorm"
import * as marshal from "./marshal"

@Entity_()
export class Holders {
    constructor(props?: Partial<Holders>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @Column_("numeric", {transformer: marshal.bigintTransformer, nullable: false})
    sfc!: bigint

    @Column_("numeric", {transformer: marshal.bigintTransformer, nullable: false})
    sfcR!: bigint
}
