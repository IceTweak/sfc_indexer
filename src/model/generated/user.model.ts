import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, OneToMany as OneToMany_} from "typeorm"
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
}
