import assert from "assert"
import * as marshal from "./marshal"
import {User} from "./user.model"

export class Transfer {
    public readonly isTypeOf = 'Transfer'
    private _from!: string
    private _to!: string
    private _amount!: bigint
    private _txHash!: string

    constructor(props?: Partial<Omit<Transfer, 'toJSON'>>, json?: any) {
        Object.assign(this, props)
        if (json != null) {
            this._from = marshal.string.fromJSON(json.from)
            this._to = marshal.string.fromJSON(json.to)
            this._amount = marshal.bigint.fromJSON(json.amount)
            this._txHash = marshal.string.fromJSON(json.txHash)
        }
    }

    get from(): string {
        assert(this._from != null, 'uninitialized access')
        return this._from
    }

    set from(value: string) {
        this._from = value
    }

    get to(): string {
        assert(this._to != null, 'uninitialized access')
        return this._to
    }

    set to(value: string) {
        this._to = value
    }

    get amount(): bigint {
        assert(this._amount != null, 'uninitialized access')
        return this._amount
    }

    set amount(value: bigint) {
        this._amount = value
    }

    get txHash(): string {
        assert(this._txHash != null, 'uninitialized access')
        return this._txHash
    }

    set txHash(value: string) {
        this._txHash = value
    }

    toJSON(): object {
        return {
            isTypeOf: this.isTypeOf,
            from: this.from,
            to: this.to,
            amount: marshal.bigint.toJSON(this.amount),
            txHash: this.txHash,
        }
    }
}
