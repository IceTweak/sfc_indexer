import {Transfer} from "./_transfer"

export type EventLog = Transfer

export function fromJsonEventLog(json: any): EventLog {
    switch(json?.isTypeOf) {
        case 'Transfer': return new Transfer(undefined, json)
        default: throw new TypeError('Unknown json object passed as EventLog')
    }
}
