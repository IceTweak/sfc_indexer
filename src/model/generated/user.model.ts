import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, OneToMany as OneToMany_} from "typeorm"
import * as marshal from "./marshal"
import {Event} from "./event.model"

@Entity_()
export class User {
    constructor(props?: Partial<User>) {
        Object.assign(this, props)
    }

    /**
     * User address
     */
    @PrimaryColumn_()
    id!: string

    @OneToMany_(() => Event, e => e.user)
    events!: Event[]

    @Column_("numeric", {transformer: marshal.bigintTransformer, nullable: false})
    sfcOld!: bigint

    @Column_("numeric", {transformer: marshal.bigintTransformer, nullable: false})
    sfc2!: bigint

    @Column_("numeric", {transformer: marshal.bigintTransformer, nullable: false})
    sfcr!: bigint

    @Column_("numeric", {transformer: marshal.bigintTransformer, nullable: false})
    sfcr2!: bigint
}
