import {App} from "./app";

export enum EntityType {
    Singletone,
    Entity,
    Factory
}

export interface onFulFilled {
    (fulfilled: any[]): void | PromiseLike<void>
}

export interface EntityDescriptor {
    entity: any,

    // instanceId?: string,
    // type: EntityType,
    dependencies?: any[],
    onFulfilled?: any[]
}

export interface EmceeOptions {

}

export class Emcee {

    //TODO: add support for PromiseLike<EntityDescriptor>?
    public static addEntity(descriptor: EntityDescriptor) {

    }


}